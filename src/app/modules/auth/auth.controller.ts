import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { authService } from "./auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const data = await authService.registerUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const data = await authService.loginUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data,
  });
});

const me = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const data = await authService.getMyProfile(req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data,
  });
});

export const authController = {
  register,
  login,
  me,
};