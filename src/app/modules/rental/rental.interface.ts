import type {
  RentalOrder,
  Prisma,
  OrderStatus,
} from "../../../../prisma/generated/prisma/client";

export type IRentalItemInput = {
  gearId: string;
  quantity: number;
};

export type ICreateRentalPayload = {
  startDate: string;
  endDate: string;
  pickupAddress: string;
  notes?: string;
  items: IRentalItemInput[];
};

export type IUpdateOrderStatusPayload = {
  orderStatus: OrderStatus;
};

export type IRentalQuery = {
  page?: string;
  limit?: string;
  orderStatus?: string;
};

export type IRentalParams = {
  id: string;
};

export type IPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IRentalListResult = {
  items: RentalOrder[];
  meta: IPaginationMeta;
};

export type IRentalWhereInput = Prisma.RentalOrderWhereInput;
export type IRentalOrderByInput = Prisma.RentalOrderOrderByWithRelationInput;
export type IRentalCreateInput = Prisma.RentalOrderUncheckedCreateInput;
export type IRentalItemCreateInput = Prisma.RentalItemUncheckedCreateInput;