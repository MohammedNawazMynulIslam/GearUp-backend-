import { z } from "zod";

export const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
  }),
});

export const updateCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name cannot be empty").optional(),
    description: z.string().nullable().optional(),
  }),
});

export const categoryParamsValidationSchema = z.object({
  params: z.object({
    id: z.uuid("A valid category id is required"),
  }),
});

export const updateCategoryWithParamsValidationSchema = z.object({
  params: z.object({
    id: z.uuid("A valid category id is required"),
  }),
  body: z.object({
    name: z.string().min(1, "Category name cannot be empty").optional(),
    description: z.string().nullable().optional(),
  }),
});