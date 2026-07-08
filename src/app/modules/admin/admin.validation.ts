import { z } from "zod";

const roleEnum = z.enum(["ADMIN", "PROVIDER", "CUSTOMER"]);

const adminUserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: roleEnum.optional(),
  isSuspended: z.enum(["true", "false"]).optional(),
});

export const adminUserQueryValidationSchema = z.object({
  query: adminUserQuerySchema,
});

const adminGearQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.uuid("A valid category id is required").optional(),
  brand: z.string().optional(),
  isAvailable: z.enum(["true", "false"]).optional(),
  providerId: z.uuid("A valid provider id is required").optional(),
});

export const adminGearQueryValidationSchema = z.object({
  query: adminGearQuerySchema,
});

const orderStatusEnum = z.enum([
  "PLACED",
  "CONFIRMED",
  "PAID",
  "PICKED_UP",
  "RETURNED",
  "CANCELLED",
]);

const adminRentalQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  orderStatus: orderStatusEnum.optional(),
  customerId: z.uuid("A valid customer id is required").optional(),
});

export const adminRentalQueryValidationSchema = z.object({
  query: adminRentalQuerySchema,
});

const userParamsSchema = z.object({
  id: z.uuid("A valid user id is required"),
});

const updateUserStatusBodySchema = z.object({
  isSuspended: z.boolean({ message: "isSuspended must be a boolean" }),
});

export const updateUserStatusValidationSchema = z.object({
  params: userParamsSchema,
  body: updateUserStatusBodySchema,
});