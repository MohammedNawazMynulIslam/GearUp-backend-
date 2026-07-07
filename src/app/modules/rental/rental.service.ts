import httpStatus from "http-status";
import {
  Prisma,
  OrderStatus,
} from "../../../../prisma/generated/prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  ICreateRentalPayload,
  IRentalListResult,
  IRentalQuery,
  IUpdateOrderStatusPayload,
} from "./rental.interface";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const rentalInclude = {
  customer: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      gear: {
        select: {
          id: true,
          title: true,
          brand: true,
          pricePerDay: true,
          stock: true,
          providerId: true,
        },
      },
    },
  },
};

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "PICKED_UP", "CANCELLED"],
  PAID: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

const calculateTotalDays = (startDate: Date, endDate: Date): number => {
  const ms = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(ms / MS_PER_DAY);
  return Math.max(days, 1);
};

const parseAndValidateDates = (
  startStr: string,
  endStr: string
): { startDate: Date; endDate: Date } => {
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid date format");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startNormalized = new Date(startDate);
  startNormalized.setHours(0, 0, 0, 0);

  if (startNormalized < today) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Start date cannot be in the past"
    );
  }

  if (endDate <= startDate) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "End date must be after start date"
    );
  }

  return { startDate, endDate };
};

const buildPagination = (query: IRentalQuery) => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const assertGearAvailability = async (
  items: { gearId: string; quantity: number }[],
  startDate: Date,
  endDate: Date
) => {
  const gearIds = items.map((i) => i.gearId);
  const gears = await prisma.gear.findMany({
    where: { id: { in: gearIds } },
    select: {
      id: true,
      title: true,
      pricePerDay: true,
      stock: true,
      isAvailable: true,
      providerId: true,
    },
  });

  if (gears.length !== gearIds.length) {
    throw new AppError(httpStatus.NOT_FOUND, "One or more gear items not found");
  }

  for (const gear of gears) {
    if (!gear.isAvailable) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Gear "${gear.title}" is currently unavailable`
      );
    }
  }

  const requestedQtyByGear = new Map<string, number>();
  for (const item of items) {
    requestedQtyByGear.set(
      item.gearId,
      (requestedQtyByGear.get(item.gearId) ?? 0) + item.quantity
    );
  }

  for (const gear of gears) {
    const requested = requestedQtyByGear.get(gear.id) ?? 0;

    if (requested > gear.stock) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Requested quantity for "${gear.title}" exceeds available stock`
      );
    }

    const overlappingItems = await prisma.rentalItem.findMany({
      where: {
        gearId: gear.id,
        order: {
          orderStatus: { notIn: ["CANCELLED", "RETURNED"] as OrderStatus[] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      },
      select: { quantity: true },
    });

    const alreadyRented = overlappingItems.reduce(
      (sum, i) => sum + i.quantity,
      0
    );

    if (alreadyRented + requested > gear.stock) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Gear "${gear.title}" is already booked for the selected dates`
      );
    }
  }

  return gears;
};

const ensureValidTransition = (
  current: OrderStatus,
  next: OrderStatus
): void => {
  if (current === next) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Order is already in this status"
    );
  }

  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot transition order from ${current} to ${next}`
    );
  }
};

const createRental = async (customerId: string, payload: ICreateRentalPayload) => {
  const { startDate, endDate } = parseAndValidateDates(
    payload.startDate,
    payload.endDate
  );
  const totalDays = calculateTotalDays(startDate, endDate);

  const gears = await assertGearAvailability(payload.items, startDate, endDate);
  const gearMap = new Map(gears.map((g) => [g.id, g]));

  let subtotal = 0;
  const itemData = payload.items.map((item) => {
    const gear = gearMap.get(item.gearId);
    if (!gear) {
      throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
    }
    subtotal += gear.pricePerDay * item.quantity * totalDays;
    return {
      gearId: item.gearId,
      quantity: item.quantity,
      pricePerDay: gear.pricePerDay,
    };
  });

  const discount = 0;
  const totalAmount = subtotal - discount;

  return prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.create({
      data: {
        customerId,
        startDate,
        endDate,
        totalDays,
        subtotal,
        discount,
        totalAmount,
        pickupAddress: payload.pickupAddress,
        notes: payload.notes ?? null,
        items: { create: itemData },
      },
      include: rentalInclude,
    });

    return order;
  });
};

const getCustomerRentals = async (
  customerId: string,
  query: IRentalQuery
): Promise<IRentalListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.RentalOrderWhereInput = { customerId };

  if (query.orderStatus) {
    where.orderStatus = query.orderStatus as OrderStatus;
  }

  const [items, total] = await prisma.$transaction([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: rentalInclude,
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

const getRentalById = async (customerId: string, id: string) => {
  const order = await prisma.rentalOrder.findUnique({
    where: { id },
    include: rentalInclude,
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental order not found");
  }

  if (order.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only view your own orders"
    );
  }

  return order;
};

const getProviderOrders = async (
  providerId: string,
  query: IRentalQuery
): Promise<IRentalListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.RentalOrderWhereInput = {
    items: { some: { gear: { providerId } } },
  };

  if (query.orderStatus) {
    where.orderStatus = query.orderStatus as OrderStatus;
  }

  const [items, total] = await prisma.$transaction([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: rentalInclude,
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

const updateProviderOrder = async (
  providerId: string,
  orderId: string,
  payload: IUpdateOrderStatusPayload
) => {
  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          gear: {
            select: {
              id: true,
              title: true,
              stock: true,
              providerId: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Rental order not found");
  }

  if (order.items.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Order has no items");
  }

  const allOwned = order.items.every((item) => {
    return item.gear.providerId === providerId;
  });

  if (!allOwned) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only manage orders for your own gear"
    );
  }

  const current = order.orderStatus;
  const next = payload.orderStatus;

  ensureValidTransition(current, next);

  if (next === "CONFIRMED" && current === "PLACED") {
    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const result = await tx.gear.updateMany({
          where: { id: item.gearId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (result.count === 0) {
          throw new AppError(
            httpStatus.CONFLICT,
            `Not enough stock for "${item.gear.title}"`
          );
        }
      }

      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { orderStatus: next },
        include: rentalInclude,
      });
    });
  }

  if (next === "CANCELLED" && current === "CONFIRMED") {
    return prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.gear.update({
          where: { id: item.gearId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.rentalOrder.update({
        where: { id: orderId },
        data: { orderStatus: next },
        include: rentalInclude,
      });
    });
  }

  return prisma.rentalOrder.update({
    where: { id: orderId },
    data: { orderStatus: next },
    include: rentalInclude,
  });
};

export const rentalService = {
  createRental,
  getCustomerRentals,
  getRentalById,
  getProviderOrders,
  updateProviderOrder,
};