import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import type { IReviewQuery } from "./review.interface";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const data = await reviewService.createReview(req.user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review created successfully",
    data,
  });
});

const getReviewsByGearId = catchAsync(async (req: Request, res: Response) => {
  const gearId = req.params.gearId as string;
  if (!gearId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Gear id is required");
  }

  const result = await reviewService.getReviewsByGearId(
    gearId,
    req.query as IReviewQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const reviewController = {
  createReview,
  getReviewsByGearId,
};