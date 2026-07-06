import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { gearController } from "./gear.controller";
import {
  createGearValidationSchema,
  updateGearWithParamsValidationSchema,
  gearParamsValidationSchema,
  gearQueryValidationSchema,
} from "./gear.validation";

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
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired access token");
    }
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
  "/provider/gear",
  authenticate,
  authorizeProvider,
  validateRequest(createGearValidationSchema),
  gearController.createGear
);

router.patch(
  "/provider/gear/:id",
  authenticate,
  authorizeProvider,
  validateRequest(updateGearWithParamsValidationSchema),
  gearController.updateGear
);

router.delete(
  "/provider/gear/:id",
  authenticate,
  authorizeProvider,
  validateRequest(gearParamsValidationSchema),
  gearController.deleteGear
);

router.get(
  "/gear",
  validateRequest(gearQueryValidationSchema),
  gearController.getAllGear
);

router.get(
  "/gear/:id",
  validateRequest(gearParamsValidationSchema),
  gearController.getSingleGear
);

export const gearRoutes = router;
