import { z } from "zod";

const gearBodySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  brand: z.string().min(1, "Brand is required"),
  categoryId: z.uuid("A valid category id is required"),
  pricePerDay: z.number().min(0, "Price must be a non-negative number"),
  stock: z.number().int().min(0, "Stock must be a non-negative integer"),
  images: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.unknown()).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

const gearUpdateBodySchema = z.object({
  title: z.string().min(1, "Title cannot be empty").optional(),
  description: z.string().min(1, "Description cannot be empty").optional(),
  brand: z.string().min(1, "Brand cannot be empty").optional(),
  categoryId: z.uuid("A valid category id is required").optional(),
  pricePerDay: z.number().min(0, "Price must be a non-negative number").optional(),
  stock: z.number().int().min(0, "Stock must be a non-negative integer").optional(),
  images: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.unknown()).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export const createGearValidationSchema = z.object({
  body: gearBodySchema,
});

export const updateGearValidationSchema = z.object({
  body: gearUpdateBodySchema,
});

export const gearParamsValidationSchema = z.object({
  params: z.object({
    id: z.uuid("A valid gear id is required"),
  }),
});

export const updateGearWithParamsValidationSchema = z.object({
  params: z.object({
    id: z.uuid("A valid gear id is required"),
  }),
  body: gearUpdateBodySchema,
});

export const gearQueryValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    category: z.uuid("A valid category id is required").optional(),
    brand: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    isAvailable: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["pricePerDay"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});
