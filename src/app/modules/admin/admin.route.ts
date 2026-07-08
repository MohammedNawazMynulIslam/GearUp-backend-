import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { adminController } from "./admin.controller";
import {
  adminGearQueryValidationSchema,
  adminRentalQueryValidationSchema,
  adminUserQueryValidationSchema,
  updateUserStatusValidationSchema,
} from "./admin.validation";

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

const authorizeAdmin = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== Role.ADMIN) {
      throw new AppError(httpStatus.FORBIDDEN, "Admin access required");
    }
    next();
  }
);

router.get(
  "/admin/users",
  authenticate,
  authorizeAdmin,
  validateRequest(adminUserQueryValidationSchema),
  adminController.getAllUsers
);

router.patch(
  "/admin/users/:id",
  authenticate,
  authorizeAdmin,
  validateRequest(updateUserStatusValidationSchema),
  adminController.updateUserStatus
);

router.get(
  "/admin/gear",
  authenticate,
  authorizeAdmin,
  validateRequest(adminGearQueryValidationSchema),
  adminController.getAllGear
);

router.get(
  "/admin/rentals",
  authenticate,
  authorizeAdmin,
  validateRequest(adminRentalQueryValidationSchema),
  adminController.getAllRentals
);

export const adminRoutes = router;