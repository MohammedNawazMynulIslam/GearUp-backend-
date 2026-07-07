import { z } from "zod";

const createReviewBodySchema = z.object({
  gearId: z.uuid("A valid gear id is required"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: z.string().min(1, "Comment cannot be empty").optional(),
});

export const createReviewValidationSchema = z.object({
  body: createReviewBodySchema,
});

const reviewGearParamsSchema = z.object({
  gearId: z.uuid("A valid gear id is required"),
});

export const reviewGearParamsValidationSchema = z.object({
  params: reviewGearParamsSchema,
});

const reviewQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const reviewQueryValidationSchema = z.object({
  query: reviewQuerySchema,
});