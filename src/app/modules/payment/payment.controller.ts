import { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../../config";
import { stripe } from "../../../lib/stripe";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import type { IPaymentQuery } from "./payment.interface";
import { paymentService } from "./payment.service";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const data = await paymentService.createPayment(req.user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Checkout session created successfully",
    data,
  });
});

const getSuccess = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "session_id is required");
  }

  const data = await paymentService.getSessionStatus(sessionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: data.status === "SUCCESS",
    message:
      data.status === "SUCCESS"
        ? "Payment completed successfully"
        : "Payment has not been confirmed yet",
    data,
  });
});

const getCancel = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    throw new AppError(httpStatus.BAD_REQUEST, "session_id is required");
  }

  const data = await paymentService.getSessionStatus(sessionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: false,
    message: "Payment was cancelled by the user",
    data,
  });
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const result = await paymentService.getPayments(
    req.user.id,
    req.query as IPaymentQuery
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment history fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }

  const id = req.params.id as string;
  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "Payment id is required");
  }

  const data = await paymentService.getPaymentById(req.user.id, id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data,
  });
});

const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string | undefined;

  if (!signature) {
    res
      .status(httpStatus.BAD_REQUEST)
      .json({ received: false, error: "Missing stripe-signature header" });
    return;
  }

  let event;
  try {
    const rawBody = req.body as Buffer;
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    res.status(httpStatus.BAD_REQUEST).json({
      received: false,
      error: `Webhook signature verification failed: ${message}`,
    });
    return;
  }

  try {
    await paymentService.handleWebhookEvent(event);
  } catch (err) {
    console.error("Webhook handler error:", err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ received: true, error: "Internal error" });
    return;
  }

  res.status(httpStatus.OK).json({ received: true });
};

export const paymentController = {
  createPayment,
  getSuccess,
  getCancel,
  getPayments,
  getPaymentById,
  handleWebhook,
};
