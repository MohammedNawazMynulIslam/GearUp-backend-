import httpStatus from "http-status";
import { OrderStatus, Prisma } from "../../../../prisma/generated/prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  ICreateReviewPayload,
  IPaginationMeta,
  IReviewQuery,
} from "./review.interface";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const reviewInclude = {
  customer: { select: { id: true, name: true, email: true } },
  gear: {
    select: {
      id: true,
      title: true,
      brand: true,
      pricePerDay: true,
    },
  },
};

const buildPagination = (query: IReviewQuery) => {
  const page = Math.max(parseInt(query.page ?? "", 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit ?? "", 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const recalcGearRating = async (
  tx: Prisma.TransactionClient,
  gearId: string
): Promise<void> => {
  const agg = await tx.review.aggregate({
    where: { gearId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await tx.gear.update({
    where: { id: gearId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.rating,
    },
  });
};

const createReview = async (customerId: string, payload: ICreateReviewPayload) => {
  const gear = await prisma.gear.findUnique({
    where: { id: payload.gearId },
    select: { id: true, title: true },
  });

  if (!gear) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      customerId_gearId: {
        customerId,
        gearId: payload.gearId,
      },
    },
    select: { id: true },
  });

  if (existingReview) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reviewed this gear"
    );
  }

  const returnedRental = await prisma.rentalOrder.findFirst({
    where: {
      customerId,
      orderStatus: OrderStatus.RETURNED,
      items: { some: { gearId: payload.gearId } },
    },
    select: { id: true },
  });

  if (!returnedRental) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can only review gear from a returned rental"
    );
  }

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        customerId,
        gearId: payload.gearId,
        rating: payload.rating,
        comment: payload.comment ?? null,
      },
      include: reviewInclude,
    });

    await recalcGearRating(tx, payload.gearId);

    return review;
  });
};

const getReviewsByGearId = async (
  gearId: string,
  query: IReviewQuery
): Promise<{ items: unknown[]; meta: IPaginationMeta }> => {
  const gear = await prisma.gear.findUnique({
    where: { id: gearId },
    select: { id: true },
  });

  if (!gear) {
    throw new AppError(httpStatus.NOT_FOUND, "Gear not found");
  }

  const { page, limit, skip } = buildPagination(query);

  const where: Prisma.ReviewWhereInput = { gearId };

  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
  ]);

  const meta: IPaginationMeta = {
    page,
    limit,
    total,
    totalPage: limit > 0 ? Math.ceil(total / limit) : 0,
  };

  return { items, meta };
};

export const reviewService = {
  createReview,
  getReviewsByGearId,
};