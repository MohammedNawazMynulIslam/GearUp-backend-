import type { Prisma } from "../../../../prisma/generated/prisma/client";

export type IAdminUserQuery = {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  isSuspended?: string;
};

export type IAdminGearQuery = {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  brand?: string;
  isAvailable?: string;
  providerId?: string;
};

export type IAdminRentalQuery = {
  page?: string;
  limit?: string;
  orderStatus?: string;
  customerId?: string;
};

export type IUpdateUserStatusPayload = {
  isSuspended: boolean;
};

export type IPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IAdminUserListResult = {
  items: unknown[];
  meta: IPaginationMeta;
};

export type IAdminGearListResult = {
  items: unknown[];
  meta: IPaginationMeta;
};

export type IAdminRentalListResult = {
  items: unknown[];
  meta: IPaginationMeta;
};

export type IAdminUserWhereInput = Prisma.UserWhereInput;
export type IAdminGearWhereInput = Prisma.GearWhereInput;
export type IAdminRentalWhereInput = Prisma.RentalOrderWhereInput;