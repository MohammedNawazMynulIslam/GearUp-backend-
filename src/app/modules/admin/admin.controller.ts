import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import type {
  IAdminGearQuery,
  IAdminRentalQuery,
  IAdminUserQuery,
} from "./admin.interface";
import { adminService } from "./admin.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllUsers(
    req.query as IAdminUserQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "User id is required");
  }

  const data = await adminService.updateUserStatus(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User ${data.isSuspended ? "suspended" : "activated"} successfully`,
    data,
  });
});

const getAllGear = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllGear(
    req.query as IAdminGearQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const getAllRentals = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllRentals(
    req.query as IAdminRentalQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rentals fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const adminController = {
  getAllUsers,
  updateUserStatus,
  getAllGear,
  getAllRentals,
};