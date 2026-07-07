import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { reviewController } from "./review.controller";
import {
  createReviewValidationSchema,
  reviewGearParamsValidationSchema,
  reviewQueryValidationSchema,
} from "./review.validation";

const router = Router();

const authenticate = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Access token is required");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Access token is required");
    }

    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
        id: string;
        role: string;
        email: string;
      };
      req.user = decoded;
      next();
    } catch {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid or expired access token"
      );
    }
  }
);

const authorizeCustomer = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== Role.CUSTOMER) {
      throw new AppError(httpStatus.FORBIDDEN, "Customer access required");
    }
    next();
  }
);

router.post(
  "/reviews",
  authenticate,
  authorizeCustomer,
  validateRequest(createReviewValidationSchema),
  reviewController.createReview
);

router.get(
  "/reviews/:gearId",
  validateRequest(reviewGearParamsValidationSchema),
  validateRequest(reviewQueryValidationSchema),
  reviewController.getReviewsByGearId
);

export const reviewRoutes = router;