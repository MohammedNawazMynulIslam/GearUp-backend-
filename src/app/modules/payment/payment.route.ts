import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { paymentController } from "./payment.controller";
import {
  createPaymentValidationSchema,
  paymentParamsValidationSchema,
  paymentQueryValidationSchema,
  sessionQueryValidationSchema,
} from "./payment.validation";

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
  "/payments/create",
  authenticate,
  authorizeCustomer,
  validateRequest(createPaymentValidationSchema),
  paymentController.createPayment
);

router.get(
  "/payments/success",
  validateRequest(sessionQueryValidationSchema),
  paymentController.getSuccess
);

router.get(
  "/payments/cancel",
  validateRequest(sessionQueryValidationSchema),
  paymentController.getCancel
);

router.get(
  "/payments",
  authenticate,
  validateRequest(paymentQueryValidationSchema),
  paymentController.getPayments
);

router.get(
  "/payments/:id",
  authenticate,
  validateRequest(paymentParamsValidationSchema),
  paymentController.getPaymentById
);

export const paymentRoutes = router;
