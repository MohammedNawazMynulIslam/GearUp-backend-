import type { Prisma } from "../../../../prisma/generated/prisma/client";

export type ICreateReviewPayload = {
  gearId: string;
  rating: number;
  comment?: string;
};

export type IReviewQuery = {
  page?: string;
  limit?: string;
};

export type IPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IReviewWhereInput = Prisma.ReviewWhereInput;
export type IReviewOrderByInput = Prisma.ReviewOrderByWithRelationInput;
export type IReviewCreateInput = Prisma.ReviewUncheckedCreateInput;