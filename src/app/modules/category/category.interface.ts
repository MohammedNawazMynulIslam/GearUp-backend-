import type { Category } from "../../../../prisma/generated/prisma/client";

export type ICategoryPayload = Pick<Category, "name"> & {
  description?: string | null;
};

export type IUpdateCategoryPayload = {
  name?: string;
  description?: string | null;
};

export type ICategoryParams = {
  id: string;
};