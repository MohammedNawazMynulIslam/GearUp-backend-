import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { gearService } from "./gear.service";
import type { IGearQuery } from "./gear.interface";

const createGear = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const data = await gearService.createGear(req.user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Gear created successfully",
    data,
  });
});

const getAllGear = catchAsync(async (req: Request, res: Response) => {
  const result = await gearService.getAllGear(req.query as IGearQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const getSingleGear = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Gear id is required");
  }

  const data = await gearService.getSingleGear(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear fetched successfully",
    data,
  });
});

const updateGear = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Gear id is required");
  }

  const data = await gearService.updateGear(id, req.user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear updated successfully",
    data,
  });
});

const deleteGear = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Gear id is required");
  }

  await gearService.deleteGear(id, req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Gear deleted successfully",
    data: null,
  });
});

export const gearController = {
  createGear,
  getAllGear,
  getSingleGear,
  updateGear,
  deleteGear,
};
