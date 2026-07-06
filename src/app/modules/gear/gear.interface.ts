import type {
  Gear,
  Prisma,
} from "../../../../prisma/generated/prisma/client";

export type IGearPayload = {
  title: string;
  description: string;
  brand: string;
  categoryId: string;
  pricePerDay: number;
  stock: number;
  images?: string[];
  specifications?: Record<string, unknown> | null;
  isAvailable?: boolean;
};

export type IUpdateGearPayload = {
  title?: string;
  description?: string;
  brand?: string;
  categoryId?: string;
  pricePerDay?: number;
  stock?: number;
  images?: string[];
  specifications?: Record<string, unknown> | null;
  isAvailable?: boolean;
};

export type IGearQuery = {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  isAvailable?: string;
  sortBy?: string;
  sortOrder?: string;
};

export type IGearParams = {
  id: string;
};

export type IPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IGearListResult = {
  items: Gear[];
  meta: IPaginationMeta;
};

export type IGearWhereInput = Prisma.GearWhereInput;
export type IGearOrderByInput = Prisma.GearOrderByWithRelationInput;
export type IGearCreateInput = Prisma.GearUncheckedCreateInput;
export type IGearUpdateInput = Prisma.GearUncheckedUpdateInput;
