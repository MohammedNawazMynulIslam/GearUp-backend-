import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { rentalController } from "./rental.controller";
import {
  createRentalValidationSchema,
  rentalParamsValidationSchema,
  rentalQueryValidationSchema,
  updateOrderStatusValidationSchema,
} from "./rental.validation";

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

const authorizeProvider = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== Role.PROVIDER) {
      throw new AppError(httpStatus.FORBIDDEN, "Provider access required");
    }
    next();
  }
);

router.post(
  "/rentals",
  authenticate,
  authorizeCustomer,
  validateRequest(createRentalValidationSchema),
  rentalController.createRental
);

router.get(
  "/rentals",
  authenticate,
  authorizeCustomer,
  validateRequest(rentalQueryValidationSchema),
  rentalController.getCustomerRentals
);

router.get(
  "/rentals/:id",
  authenticate,
  authorizeCustomer,
  validateRequest(rentalParamsValidationSchema),
  rentalController.getRentalById
);

router.get(
  "/provider/orders",
  authenticate,
  authorizeProvider,
  validateRequest(rentalQueryValidationSchema),
  rentalController.getProviderOrders
);

router.patch(
  "/provider/orders/:id",
  authenticate,
  authorizeProvider,
  validateRequest(updateOrderStatusValidationSchema),
  rentalController.updateProviderOrder
);

export const rentalRoutes = router;