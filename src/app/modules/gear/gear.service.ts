import httpStatus from "http-status";
import { Prisma } from "../../../../prisma/generated/prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  IGearCreateInput,
  IGearListResult,
  IGearOrderByInput,
  IGearPayload,
  IGearQuery,
  IGearUpdateInput,
  IUpdateGearPayload,
} from "./gear.interface";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const gearInclude = {
  category: true,
  provider: { select: { id: true, name: true, email: true } },
};

const assertCategoryExists = async (categoryId: string): Promise<void> => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }
};

const createGear = async (
  providerId: string,
  payload: IGearPayload
) => {
  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true, role: true },
  });

  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, "Provider not found");
  }

  if (provider.role !== "PROVIDER") {
    throw new AppError(httpStatus.FORBIDDEN, "Only providers can create gear");
  }

  await assertCategoryExists(payload.categoryId);

  const data: IGearCreateInput = {
    providerId,
    categoryId: payload.categoryId,
    title: payload.title,
    description: payload.description,
    brand: payload.brand,
    pricePerDay: payload.pricePerDay,
    stock: payload.stock,
    images: payload.images ?? [],
    isAvailable: payload.isAvailable ?? true,
  };

  if (payload.specifications) {
    data.specifications =
      payload.specifications as unknown as Prisma.InputJsonValue;
  }

  return prisma.gear.create({
    data,
    include: gearInclude,
  });
};

const getAllGear = async (query: IGearQuery): Promise<IGearListResult> => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;

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

  const priceFilter: { gte?: number; lte?: number } = {};
  const minPrice = query.minPrice !== undefined ? parseFloat(query.minPrice) : NaN;
  const maxPrice = query.maxPrice !== undefined ? parseFloat(query.maxPrice) : NaN;

  if (!isNaN(minPrice)) {
    priceFilter.gte = minPrice;
  }
  if (!isNaN(maxPrice)) {
    priceFilter.lte = maxPrice;
  }
  if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
    where.pricePerDay = priceFilter;
  }

  if (query.isAvailable === "true") {
    where.isAvailable = true;
  } else if (query.isAvailable === "false") {
    where.isAvailable = false;
  }

  const orderBy: IGearOrderByInput =
    query.sortBy === "pricePerDay"
      ? { pricePerDay: query.sortOrder === "asc" ? "asc" : "desc" }
      : { createdAt: "desc" };

  const [items, total] = await prisma.$transaction([
    prisma.gear.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: gearInclude,
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

const getSingleGear = async (id: string) => {
  const gear = await prisma.gear.findUnique({
    where: { id },
    include: {
      ...gearInclude,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!gear) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
  }

  return gear;
};

const updateGear = async (
  id: string,
  providerId: string,
  payload: IUpdateGearPayload
) => {
  const existing = await prisma.gear.findUnique({
    where: { id },
    select: { id: true, providerId: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
  }

  if (existing.providerId !== providerId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only update your own gear");
  }

  if (payload.categoryId) {
    await assertCategoryExists(payload.categoryId);
  }

  const data: IGearUpdateInput = {};

  if (payload.title !== undefined) data.title = payload.title;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.brand !== undefined) data.brand = payload.brand;
  if (payload.categoryId !== undefined) data.categoryId = payload.categoryId;
  if (payload.pricePerDay !== undefined) data.pricePerDay = payload.pricePerDay;
  if (payload.stock !== undefined) data.stock = payload.stock;
  if (payload.images !== undefined) data.images = payload.images;
  if (payload.isAvailable !== undefined) data.isAvailable = payload.isAvailable;

  if (payload.specifications !== undefined) {
    data.specifications = payload.specifications
      ? (payload.specifications as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  return prisma.gear.update({
    where: { id },
    data,
    include: gearInclude,
  });
};

const deleteGear = async (id: string, providerId: string) => {
  const existing = await prisma.gear.findUnique({
    where: { id },
    select: { id: true, providerId: true },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
  }

  if (existing.providerId !== providerId) {
    throw new AppError(httpStatus.FORBIDDEN, "You can only delete your own gear");
  }

  await prisma.gear.delete({ where: { id } });
  return null;
};

export const gearService = {
  createGear,
  getAllGear,
  getSingleGear,
  updateGear,
  deleteGear,
};
