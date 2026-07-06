import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import validateRequest from "../../middlewares/constants/validateRequest";
import { authController } from "./auth.controller";
import {
  loginValidationSchema,
  registerValidationSchema,
} from "./auth.validation";

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

router.post("/register", validateRequest(registerValidationSchema), authController.register);
router.post("/login", validateRequest(loginValidationSchema), authController.login);
router.get("/me", authenticate, authController.me);

export const authRoutes = router;