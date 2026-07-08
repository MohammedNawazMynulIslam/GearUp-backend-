import { Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { rentalService } from "./rental.service";
import type { IRentalQuery } from "./rental.interface";

const createRental = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const data = await rentalService.createRental(req.user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Rental order created successfully",
    data,
  });
});

const getCustomerRentals = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await rentalService.getCustomerRentals(
    req.user.id,
    req.query as IRentalQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental orders fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const getRentalById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Rental id is required");
  }

  const data = await rentalService.getRentalById(req.user.id, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental order fetched successfully",
    data,
  });
});

const getProviderOrders = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await rentalService.getProviderOrders(
    req.user.id,
    req.query as IRentalQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Provider orders fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const updateProviderOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Rental id is required");
  }

  const data = await rentalService.updateProviderOrder(
    req.user.id,
    id,
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental order updated successfully",
    data,
  });
});

const cancelCustomerOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Rental id is required");
  }

  const data = await rentalService.cancelCustomerOrder(req.user.id, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Rental order cancelled successfully",
    data,
  });
});

export const rentalController = {
  createRental,
  getCustomerRentals,
  getRentalById,
  getProviderOrders,
  updateProviderOrder,
  cancelCustomerOrder,
};