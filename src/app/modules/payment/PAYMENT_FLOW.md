# Payment Module — Full Flow

This module uses **Stripe Checkout Sessions** (hosted Stripe page). The user is redirected to `checkout.stripe.com` to enter their card. No card data ever touches this server.

---

## 1. Architecture Overview

```
Customer               Backend (this app)          Stripe
   |                        |                        |
   |--POST /payments/create-->                       |
   |                        |--Checkout.Session.create
   |                        |<--session.url ---------|
   |<--{ url, sessionId }---|                        |
   |                        |                        |
   |--redirect to url--------------------------->   |
   |                        |         (Stripe hosted checkout page)
   |                        |          user pays with test card
   |                        |<--checkout.session.completed (webhook)
   |                        |   mark Payment SUCCESS, Order PAID
   |                        |                        |
   |<--redirect to /payments/success?session_id=...--|
   |                        |                        |
   |--GET /payments/success-->                       |
   |<--{ status: SUCCESS }--|                        |
```

---

## 2. Endpoints

| # | Method | Path | Auth | Purpose |
|---|--------|------|------|---------|
| 1 | POST | `/api/payments/create` | Customer | Creates Checkout Session, returns Stripe `url` to redirect to |
| 2 | (browser) | `https://checkout.stripe.com/c/pay/cs_test_...` | none | Hosted Stripe page (redirect target) |
| 3 | GET | `/api/payments/success?session_id=cs_...` | none | Stripe redirect after success — returns JSON status |
| 4 | GET | `/api/payments/cancel?session_id=cs_...` | none | Stripe redirect after cancel — returns JSON status |
| 5 | POST | `/api/payments/webhook` | Stripe signature | Stripe event receiver (updates DB) |
| 6 | GET | `/api/payments` | Any authenticated user | Payment history (filtered by `req.user.id`) |
| 7 | GET | `/api/payments/:id` | Any authenticated user | Single payment (ownership validated) |

`POST /api/payments/confirm` no longer exists — the webhook drives the state transition.

---

## 3. Files

```
src/app/modules/payment/
├── payment.controller.ts        # createPayment, getSuccess, getCancel, getPayments, getPaymentById, handleWebhook
├── payment.service.ts          # Checkout Session creation, session-status lookup, webhook handlers, queries
├── payment.route.ts            # Authenticated routes (/create, /payments, /payments/:id, /success, /cancel)
├── payment.webhook.route.ts    # Raw-body route mounted BEFORE express.json() for signature verification
├── payment.validation.ts       # Zod schemas for body/query/params
├── payment.interface.ts        # TS types (ICreatePaymentResult, ISessionStatusResult, etc.)
└── payment.constant.ts
```

---

## 4. Business Logic Implemented

### createPayment (`payment.service.ts`)
1. Fetch `RentalOrder` (with customer email, items, payment).
2. Validate ownership: `order.customerId === customerId`, else `403 FORBIDDEN`.
3. State guards: reject if `orderStatus === CANCELLED`, `RETURNED`, or `paymentStatus === SUCCESS`.
4. Call `stripe.checkout.sessions.create` with:
   - `mode: "payment"`
   - One line item (`unit_amount = totalAmount * 100`)
   - `metadata: { orderId, customerId }` (so the webhook can correlate)
   - `customer_email` from the order's customer
   - `success_url` and `cancel_url` pointing at backend `/payments/success` / `/payments/cancel` with `{CHECKOUT_SESSION_ID}` placeholder
5. `upsert` a `Payment` row keyed by `orderId` storing `transactionId = session.id`, `provider = STRIPE`, `amount`, `status = PENDING`.
6. Return `{ paymentId, sessionId, transactionId, url, amount, currency, status, provider }`.

### Webhook handler (`payment.service.ts::handleWebhookEvent`)
- `checkout.session.completed` → within `prisma.$transaction`: Payment `status = SUCCESS`, `paidAt = now`, RentalOrder `orderStatus = PAID`, `paymentStatus = SUCCESS`.
- `checkout.session.expired` → if still `PENDING`, Payment `status = FAILED`.
- `payment_intent.succeeded` / `payment_intent.payment_failed` / `charge.refunded` — kept for manual/refund paths (all idempotent).

All handlers are idempotent — duplicate deliveries won't double-apply.

### Validate ownership
- `getPaymentById` checks `payment.order.customerId === req.user.id` → `403` otherwise.
- `getPayments` filters by `order.customerId = req.user.id` only.

### Payment history
- `getPayments` paginates (`page`, `limit`, max 100) and optionally filters by `?status=SUCCESS|FAILED|REFUNDED|PENDING`.

### Storage fields
The `Payment` model stores:
```
transactionId   <- Stripe Checkout Session ID (cs_test_...)
provider        <- PaymentProvider.STRIPE
amount          <- order.totalAmount
status          <- PENDING | SUCCESS | FAILED | REFUNDED
paidAt          <- set to now() on success
createdAt / updatedAt  <- auto
```

---

## 5. Environment variables required

```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:3000"     # used to build success/cancel URLs
```

`STRIPE_WEBHOOK_SECRET` should match the one printed by `stripe listen` (locally) or the dashboard webhook endpoint value (production).

---

## 6. End-to-end test (local, no frontend)

### Terminal A — start the server
```bash
npm run dev
```

### Terminal B — forward Stripe webhooks to your local server
```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```
Output:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxx (^C to quit)
```
Add that `whsec_...` to `.env` as `STRIPE_WEBHOOK_SECRET` and **restart the server** so it picks up the new value.

### In Postman — full setup (once)

1. **Register provider**
   `POST /api/auth/register`
   ```json
   { "name": "Gear Provider", "email": "provider@gearup.com", "password": "pass1234", "role": "PROVIDER" }
   ```
   Save `accessToken` → `{{PROVIDER_TOKEN}}`.

2. **Login as admin** (seeded user; run `npx prisma db seed` once if you haven't)
   `POST /api/auth/login`
   ```json
   { "email": "admin@gearup.com", "password": "admin12345" }
   ```
   Save `accessToken` → `{{ADMIN_TOKEN}}`.

3. **Create category**
   `POST /api/categories`  Header: `Authorization: Bearer {{ADMIN_TOKEN}}`
   ```json
   { "name": "Camping" }
   ```
   Save `id` → `{{CATEGORY_ID}}`.

4. **Create gear** (as provider)
   `POST /api/provider/gear`  Header: `Authorization: Bearer {{PROVIDER_TOKEN}}`
   ```json
   {
     "title": "4-Person Tent",
     "description": "Waterproof family tent",
     "brand": "Coleman",
     "categoryId": "{{CATEGORY_ID}}",
     "pricePerDay": 25.5,
     "stock": 5,
     "images": ["https://example.com/tent.jpg"]
   }
   ```
   Save `id` → `{{GEAR_ID}}`.

5. **Register customer**
   `POST /api/auth/register`
   ```json
   { "name": "John Renter", "email": "customer@gearup.com", "password": "pass1234", "role": "CUSTOMER" }
   ```
   Save `accessToken` → `{{CUSTOMER_TOKEN}}`.

6. **Create rental order** (as customer)
   `POST /api/rentals`  Header: `Authorization: Bearer {{CUSTOMER_TOKEN}}`
   ```json
   {
     "startDate": "2026-08-01",
     "endDate": "2026-08-04",
     "pickupAddress": "123 Main St, City",
     "notes": "Doorstep pickup",
     "items": [{ "gearId": "{{GEAR_ID}}", "quantity": 1 }]
   }
   ```
   Save `id` → `{{ORDER_ID}}`.

### In Postman — the actual payment (use unique IDs each time you retest)

7. **Create Checkout Session**
   `POST /api/payments/create`  Header: `Authorization: Bearer {{CUSTOMER_TOKEN}}`
   ```json
   { "orderId": "{{ORDER_ID}}" }
   ```
   Response:
   ```json
   {
     "success": true,
     "message": "Checkout session created successfully",
     "data": {
       "paymentId": "b0684b7d-...",
       "sessionId": "cs_test_a1b2c3...",
       "transactionId": "cs_test_a1b2c3...",
       "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3...",
       "amount": 102,
       "currency": "usd",
       "status": "PENDING",
       "provider": "STRIPE"
     }
   }
   ```
   Copy `data.url` from the response.

### In your browser

8. **Open the `url` from step 7** in any browser. You'll see Stripe's hosted checkout page.

   Pay with Stripe test card:
   - Number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/30`)
   - CVC: any 3 digits (e.g. `123`)
   - Name / ZIP: anything

9. Click **Pay**. Stripe will:
   - Process the payment
   - Fire `checkout.session.completed` → forwarded to your webhook → backend marks Payment `SUCCESS`, Order `PAID`, sets `paidAt`
   - Redirect the browser to `http://localhost:3000/api/payments/success?session_id=cs_test_...`

   You'll see JSON:
   ```json
   {
     "success": true,
     "message": "Payment completed successfully",
     "data": {
       "sessionId": "cs_test_...",
       "paymentId": "...",
       "orderId": "...",
       "amount": 102,
       "status": "SUCCESS",
       "paidAt": "2026-...",
       "orderStatus": "PAID"
     }
   }
   ```

### In Postman — verify

10. **GET single payment**
    `GET /api/payments/{{PAYMENT_ID}}`  Header: `Authorization: Bearer {{CUSTOMER_TOKEN}}`
    Expect: `status: "SUCCESS"`, `paidAt` set, and nested order `orderStatus: "PAID"`.

11. **GET payment history**
    `GET /api/payments?page=1&limit=10`  Header: `Authorization: Bearer {{CUSTOMER_TOKEN}}`
    Optional: `&status=SUCCESS`

### Testing the cancel path

Before completing payment on the Stripe page, click the **"Back"** link at the top.
The browser is redirected to `http://localhost:3000/api/payments/cancel?session_id=cs_test_...`
returning JSON with `success: false, message: "Payment was cancelled by the user"`.
The DB row stays `PENDING` until the `checkout.session.expired` webhook fires (about 24 hours later for test sessions),
then it becomes `FAILED`.

### Testing refunds (optional)

```bash
# Get the PaymentIntent ID hidden inside the Checkout Session
stripe checkout sessions retrieve cs_test_a1b2c3...

# Refund it (uses the PI's charge)
stripe refunds create --payment-intent pi_xxx
```
The `charge.refunded` webhook fires → Payment `REFUNDED`, Order `paymentStatus REFUNDED`.

---

## 7. Postman auto-chaining (optional)

In the **Tests** tab of each request, set variables so the next request can use them:

```js
// After #1 (provider register)
pm.environment.set("PROVIDER_TOKEN", pm.response.json().data.accessToken);

// After #2 (admin login)
pm.environment.set("ADMIN_TOKEN", pm.response.json().data.accessToken);

// After #3 (category)
pm.environment.set("CATEGORY_ID", pm.response.json().data.id);

// After #4 (gear)
pm.environment.set("GEAR_ID", pm.response.json().data.id);

// After #5 (customer register)
pm.environment.set("CUSTOMER_TOKEN", pm.response.json().data.accessToken);

// After #6 (rental)
pm.environment.set("ORDER_ID", pm.response.json().data.id);

// After #7 (create payment)
pm.environment.set("PAYMENT_ID", pm.response.json().data.paymentId);
pm.environment.set("SESSION_ID", pm.response.json().data.sessionId);
pm.environment.set("CHECKOUT_URL", pm.response.json().data.url);
```

---

## 8. Production deployment notes (not implemented here)

- Replace `APP_URL` with your real public domain (e.g. `https://api.gearup.com`).
- Register the webhook endpoint in the Stripe Dashboard → Webhooks → Add endpoint → `https://api.gearup.com/api/payments/webhook`, subscribe to `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`.
- Use the dashboard's `whsec_...` signing secret in `STRIPE_WEBHOOK_SECRET`.
- Use `sk_live_...` in `STRIPE_SECRET_KEY`.
- (Optional) Point `success_url` / `cancel_url` at your frontend URLs instead of `/api/payments/success` / `/cancel` once a frontend exists — easy one-line change in `payment.service.ts`.