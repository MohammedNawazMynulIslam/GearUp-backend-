import { z } from "zod";
import { Role } from "../../../../prisma/generated/prisma/client";

export const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.email("A valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    phone: z.string().optional(),
    address: z.string().optional(),
    role: z
      .nativeEnum(Role)
      .refine((value) => value !== Role.ADMIN, {
        message: "Admin cannot register",
      }),
  }),
});

export const loginValidationSchema = z.object({
  body: z.object({
    email: z.email("A valid email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});