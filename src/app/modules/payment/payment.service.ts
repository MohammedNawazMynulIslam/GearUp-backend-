import httpStatus from "http-status";
import type Stripe from "stripe";
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import { stripe } from "../../../lib/stripe";
import type {
  ICreatePaymentPayload,
  ICreatePaymentResult,
  IPaymentListResult,
  IPaymentQuery,
  ISessionStatusResult,
} from "./payment.interface";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_CURRENCY = "usd";

const paymentInclude = {
  order: {
    select: {
      id: true,
      customerId: true,
      totalAmount: true,
      orderStatus: true,
      paymentStatus: true,
      startDate: true,
      endDate: true,
    },
  },
};

const buildPagination = (query: IPaymentQuery) => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const toStripeAmount = (amount: number): number => Math.round(amount * 100);

const createPayment = async (
  customerId: string,
  payload: ICreatePaymentPayload
): Promise<ICreatePaymentResult> => {
  const order = await prisma.rentalOrder.findUnique({
    where: { id: payload.orderId },
    include: {
      customer: { select: { email: true, name: true } },
      items: { include: { gear: { select: { title: true } } } },
      payment: { select: { id: true, status: true } },
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental order not found");
  }

  if (order.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only create payments for your own orders"
    );
  }

  if (order.orderStatus === OrderStatus.CANCELLED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot pay for a cancelled order"
    );
  }

  if (order.orderStatus === OrderStatus.RETURNED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Order has already been completed"
    );
  }

  if (order.paymentStatus === PaymentStatus.SUCCESS) {
    throw new AppError(httpStatus.CONFLICT, "Order has already been paid");
  }

  const currency = (payload.currency ?? DEFAULT_CURRENCY).toLowerCase();
  const baseUrl = config.APP_URL.replace(/\/$/, "");

  const gearNames = order.items
    .map((i) => i.gear.title)
    .slice(0, 5)
    .join(", ");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: "GearUp Rental Order",
            description:
              gearNames || `Order ${order.id}`,
          },
          unit_amount: toStripeAmount(order.totalAmount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      customerId,
    },
    customer_email: order.customer.email ?? undefined,
    success_url: `${baseUrl}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/api/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create Stripe Checkout session"
    );
  }

  const payment = await prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      transactionId: session.id,
      provider: PaymentProvider.STRIPE,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
    },
    update: {
      transactionId: session.id,
      provider: PaymentProvider.STRIPE,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      paidAt: null,
    },
  });

  return {
    paymentId: payment.id,
    sessionId: session.id,
    transactionId: session.id,
    url: session.url,
    amount: order.totalAmount,
    currency,
    status: payment.status,
    provider: payment.provider,
  };
};

const getSessionStatus = async (
  sessionId: string
): Promise<ISessionStatusResult> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: sessionId },
    include: paymentInclude,
  });

  if (!payment) {
    return {
      sessionId,
      status: "UNKNOWN",
      message: "No payment found for this session",
    };
  }

  return {
    sessionId,
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    status: payment.status,
    paidAt: payment.paidAt,
    orderStatus: payment.order.orderStatus,
  };
};

const getPayments = async (
  customerId: string,
  query: IPaymentQuery
): Promise<IPaymentListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.PaymentWhereInput = {
    order: { customerId },
  };

  if (query.status) {
    where.status = query.status as PaymentStatus;
  }

  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: paymentInclude,
    }),
    prisma.payment.count({ where }),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

const getPaymentById = async (customerId: string, id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.order.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view your own payments"
    );
  }

  return payment;
};

const markPaymentSuccess = async (transactionId: string): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    include: { order: { select: { id: true, orderStatus: true } } },
  });

  if (!payment) {
    return;
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    await tx.rentalOrder.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCESS,
        orderStatus: OrderStatus.PAID,
      },
    });
  });
};

const markPaymentFailed = async (transactionId: string): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment) {
    return;
  }

  if (payment.status === PaymentStatus.FAILED) {
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.FAILED },
  });

  await prisma.rentalOrder.update({
    where: { id: payment.orderId },
    data: { paymentStatus: PaymentStatus.FAILED },
  });
};

const markPaymentRefunded = async (transactionId: string): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment) {
    return;
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    await tx.rentalOrder.update({
      where: { id: payment.orderId },
      data: { paymentStatus: PaymentStatus.REFUNDED },
    });
  });
};

const markCheckoutCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: session.id },
    include: { order: { select: { orderStatus: true } } },
  });

  if (!payment) {
    return;
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });

    await tx.rentalOrder.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCESS,
        orderStatus: OrderStatus.PAID,
      },
    });
  });
};

const markCheckoutExpired = async (session: Stripe.Checkout.Session): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: session.id },
  });

  if (!payment) {
    return;
  }

  if (payment.status !== PaymentStatus.PENDING) {
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.FAILED },
  });
};

const handleWebhookEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await markPaymentSuccess(pi.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await markPaymentFailed(pi.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (piId) {
        await markPaymentRefunded(piId);
      }
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markCheckoutCompleted(session);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markCheckoutExpired(session);
      break;
    }
    default:
      break;
  }
};

export const paymentService = {
  createPayment,
  getSessionStatus,
  getPayments,
  getPaymentById,
  handleWebhookEvent,
};
