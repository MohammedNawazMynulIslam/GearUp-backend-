import type {
  Payment,
  Prisma,
  PaymentStatus,
  PaymentProvider,
} from "../../../../prisma/generated/prisma/client";

export type ICreatePaymentPayload = {
  orderId: string;
  currency?: string;
};

export type IConfirmPaymentPayload = {
  paymentIntentId: string;
};

export type IPaymentQuery = {
  page?: string;
  limit?: string;
  status?: string;
};

export type IPaymentParams = {
  id: string;
};

export type IPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IPaymentListResult = {
  items: Payment[];
  meta: IPaginationMeta;
};

export type ICreatePaymentResult = {
  paymentId: string;
  sessionId: string;
  transactionId: string;
  url: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
};

export type ISessionStatusResult = {
  sessionId: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  status: string;
  paidAt?: Date | null;
  orderStatus?: string;
  message?: string;
};

export type IPaymentWhereInput = Prisma.PaymentWhereInput;
export type IPaymentOrderByInput = Prisma.PaymentOrderByWithRelationInput;
export type IPaymentCreateInput = Prisma.PaymentUncheckedCreateInput;
export type IPaymentUpdateInput = Prisma.PaymentUncheckedUpdateInput;
