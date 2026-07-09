import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

const envSchema = z.object({
  PORT: z.string().default("3000"),
  APP_URL: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string(),

  BCRYPT_SALT_ROUNDS: z.string(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  JWT_ACCESS_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  STRIPE_SECRET_KEY: z.string(),

  STRIPE_WEBHOOK_SECRET: z.string().default(""),
});

if (process.env.NODE_ENV === "production" && process.env.STRIPE_WEBHOOK_SECRET === "") {
  console.warn(
    "STRIPE_WEBHOOK_SECRET is not set in production; Stripe webhooks will fail signature verification."
  );
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsedEnv.data;

export default {
  PORT: Number(env.PORT),
  APP_URL: env.APP_URL,

  DATABASE_URL: env.DATABASE_URL,

  BCRYPT_SALT_ROUNDS: Number(env.BCRYPT_SALT_ROUNDS),

  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,

  JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,

  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,

  STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
};