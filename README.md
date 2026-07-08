# GearUp Backend

A gear rental platform API built with Express, TypeScript, Prisma, and Stripe.

## Tech Stack

- **Runtime:** Node.js + TypeScript (ESM)
- **Framework:** Express 5
- **ORM:** Prisma 7 (PostgreSQL)
- **Auth:** JWT (access + refresh tokens), bcryptjs
- **Payments:** Stripe Checkout + webhooks
- **Validation:** Zod
- **Security:** helmet, cors, cookie-parser

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy   # or: npx prisma db push

# Seed the database (creates an admin user, categories, gear, etc.)
npx prisma db seed

# Start dev server (with watch mode)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The server runs on the port defined in `.env` (`PORT`, default `3000`).

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default `3000`) |
| `APP_URL` | Frontend origin for CORS (default `http://localhost:3000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `BCRYPT_SALT_ROUNDS` | bcrypt salt rounds |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (e.g. `1d`, `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g. `7d`) |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Roles & RBAC

Three roles defined in the Prisma schema's `Role` enum:

- **ADMIN** — manage users, gear, rentals, categories
- **PROVIDER** — manage own gear inventory and orders placed on it
- **CUSTOMER** — browse gear, place rental orders, pay, review

The reusable `auth()` middleware (`src/middlewares/constants/auth.ts`) verifies the JWT, attaches the decoded user to `req.user`, and optionally authorizes roles:

```ts
import auth from "../middlewares/constants/auth";
import { Role } from "../../prisma/generated/prisma/client";

router.get("/me", auth(), controller.me);                 // any authenticated user
router.post("/", auth(Role.ADMIN), controller.create);     // admin only
router.post("/", auth(Role.PROVIDER), controller.create); // provider only
router.post("/", auth(Role.CUSTOMER), controller.create); // customer only
```

All protected routes expect `Authorization: Bearer <accessToken>`.

## API Routes

Base URL: `/api`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register (CUSTOMER or PROVIDER) |
| POST | `/auth/login` | — | Login |
| GET | `/auth/me` | any | Get current user profile |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | ADMIN | List users (paginated) |
| PATCH | `/admin/users/:id` | ADMIN | Suspend/activate a user |
| GET | `/admin/gear` | ADMIN | List all gear (paginated) |
| GET | `/admin/rentals` | ADMIN | List all rentals (paginated) |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/categories` | ADMIN | Create category |
| GET | `/categories` | — | List categories |
| GET | `/categories/:id` | — | Get single category |
| PATCH | `/categories/:id` | ADMIN | Update category |
| DELETE | `/categories/:id` | ADMIN | Delete category |

### Gear

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/provider/gear` | PROVIDER | Create gear |
| PATCH | `/provider/gear/:id` | PROVIDER | Update gear (incl. stock) |
| DELETE | `/provider/gear/:id` | PROVIDER | Delete gear |
| GET | `/gear` | — | Browse gear (search/filter/paginate) |
| GET | `/gear/:id` | — | View gear details (with reviews) |

**Gear query params:** `page`, `limit`, `search`, `category`, `brand`, `minPrice`, `maxPrice`, `isAvailable`, `sortBy` (`pricePerDay`), `sortOrder` (`asc`/`desc`).

### Rentals (Customer)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/rentals` | CUSTOMER | Place rental order |
| GET | `/rentals` | CUSTOMER | List my orders |
| GET | `/rentals/:id` | CUSTOMER | Order detail |
| PATCH | `/rentals/:id/cancel` | CUSTOMER | Cancel order (from `PLACED` only) |

### Rentals (Provider)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/provider/orders` | PROVIDER | List orders for my gear |
| PATCH | `/provider/orders/:id` | PROVIDER | Update order status |

### Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/create` | CUSTOMER | Create Stripe Checkout session |
| GET | `/payments/success` | — | Success redirect (query: `session_id`) |
| GET | `/payments/cancel` | — | Cancel redirect (query: `session_id`) |
| GET | `/payments` | any | List payments (paginated) |
| GET | `/payments/:id` | any | Payment detail |
| POST | `/payments/webhook` | Stripe | Stripe webhook (raw body) |

### Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reviews` | CUSTOMER | Create review |
| GET | `/reviews/:gearId` | — | List reviews for a gear |

## Rental Order Status Flow

```
                PLACED
                /     \
      (provider)       (customer)
        confirms         cancels
            /                \
       CONFIRMED          CANCELLED
            |
            v
          PAID
        (Stripe webhook
         marks SUCCESS/PAID)
            |
            v
        PICKED_UP
       (provider)
            |
            v
        RETURNED
        (provider)
```

### Valid State Transitions

| From | To (Provider) | To (Customer) |
|---|---|---|
| `PLACED` | `CONFIRMED` | `CANCELLED` |
| `CONFIRMED` | `PAID`*, `PICKED_UP` | — |
| `PAID` | `PICKED_UP` | — |
| `PICKED_UP` | `RETURNED` | — |
| `RETURNED` | — (terminal) | — |
| `CANCELLED` | — (terminal) | — |

\* `PAID` is set automatically by the Stripe webhook, not by a provider PATCH.

### Stock handling

- **Confirm** (`PLACED → CONFIRMED`): stock decremented atomically per item; rolls back with `409` if any item lacks stock.
- **Customer cancel** (`PLACED → CANCELLED`): no stock change (stock was not yet reserved).
- **Return** (`PICKED_UP → RETURNED`): stock is not restored (gear has been used).

## Auth & Tokens

- Registering via `/auth/register` returns `{ accessToken, refreshToken }`.
- Login via `/auth/login` returns `{ user, accessToken, refreshToken }`.
- The JWT payload contains `{ id, role, email }`.
- Helper: `src/lib/jwt.ts` exposes `createAccessToken`, `createRefreshToken`, `verifyToken`.

## Pagination Helper

`src/app/utils/pagination.ts` exports `calculatePagination(query)` which returns:

```ts
{
  page: number;      // default 1, min 1
  limit: number;     // default 10, min 1, max 100
  skip: number;      // (page - 1) * limit
  sortBy: string;    // default "createdAt"
  sortOrder: "asc" | "desc";  // default "desc"
}
```

Pass `page`, `limit`, `sortBy`, `sortOrder` as string query params.

## Stripe Webhooks (local testing)

In a separate terminal:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```

Copy the printed `whsec_...` value into `.env` as `STRIPE_WEBHOOK_SECRET`, then restart `npm run dev`. To trigger a test event:

```bash
stripe trigger checkout.session.completed
```

## Project Structure

```
prisma/
  schema/            # Prisma schema files by domain
  generated/         # Generated Prisma client
  seed.ts            # Database seed
src/
  app.ts             # Express app & route registration
  server.ts          # HTTP server entry
  config/            # Env validation & config
  lib/               # Prisma client, Stripe, JWT helper
  app/
    errors/          # AppError, Prisma/Zod error handlers
    helpers/
    interfaces/
    middlewares/
      constants/
        auth.ts      # RBAC auth() middleware
        ...
    modules/
      auth/          # Register, login, me
      admin/         # Admin user/gear/rental management
      category/      # Category CRUD
      gear/          # Gear CRUD + browse
      rental/       # Rental orders & status flow
      payment/       # Stripe payments + webhook
      review/       # Customer reviews
      user/
    routes/
    utils/           # catchAsync, sendResponse, pagination
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run production server from `dist/` |
| `npm run lint` | Run tslint |
| `prisma db seed` | Seed the database |

## Error Handling

Errors flow through a global error handler (`src/app/middlewares/constants/globalErrorHandler.ts`) that normalizes `ZodError`, `Prisma.PrismaClientKnownRequestError`, and `AppError` into a consistent JSON shape:

```json
{
  "success": false,
  "message": "Error message",
  "errorDetails": [{ "path": "", "message": "..." }],
  "stack": "..." 
}
```

`stack` is only included when `NODE_ENV === "development"`.