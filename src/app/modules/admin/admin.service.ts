import httpStatus from "http-status";
import { OrderStatus, Prisma, Role } from "../../../../prisma/generated/prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  IAdminGearListResult,
  IAdminGearQuery,
  IAdminRentalListResult,
  IAdminRentalQuery,
  IAdminUserListResult,
  IAdminUserQuery,
  IUpdateUserStatusPayload,
} from "./admin.interface";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const buildPagination = (query: { page?: string; limit?: string }) => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getAllUsers = async (
  query: IAdminUserQuery
): Promise<IAdminUserListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.UserWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.role) {
    where.role = query.role as Role;
  }

  if (query.isSuspended === "true") {
    where.isSuspended = true;
  } else if (query.isSuspended === "false") {
    where.isSuspended = false;
  }

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatusPayload
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isSuspended: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role === Role.ADMIN) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin accounts cannot be suspended"
    );
  }

  if (user.isSuspended === payload.isSuspended) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      payload.isSuspended
        ? "User is already suspended"
        : "User is already active"
    );
  }

  return prisma.user.update({
    where: { id: userId },
    data: { isSuspended: payload.isSuspended },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      isSuspended: true,
      updatedAt: true,
    },
  });
};

const getAllGear = async (
  query: IAdminGearQuery
): Promise<IAdminGearListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.GearWhereInput = {};

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { brand: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.category) {
    where.categoryId = query.category;
  }

  if (query.brand) {
    where.brand = { equals: query.brand, mode: "insensitive" };
  }

  if (query.providerId) {
    where.providerId = query.providerId;
  }

  if (query.isAvailable === "true") {
    where.isAvailable = true;
  } else if (query.isAvailable === "false") {
    where.isAvailable = false;
  }

  const [items, total] = await prisma.$transaction([
    prisma.gear.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        provider: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.gear.count({ where }),
  ]);

  const meta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

const getAllRentals = async (
  query: IAdminRentalQuery
): Promise<IAdminRentalListResult> => {
  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.RentalOrderWhereInput = {};

  if (query.orderStatus) {
    where.orderStatus = query.orderStatus as OrderStatus;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  const [items, total] = await prisma.$transaction([
    prisma.rentalOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            gear: {
              select: {
                id: true,
                title: true,
                brand: true,
                pricePerDay: true,
                providerId: true,
              },
            },
          },
        },
        payment: { select: { id: true, status: true, transactionId: true } },
      },
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

export const adminService = {
  getAllUsers,
  updateUserStatus,
  getAllGear,
  getAllRentals,
};