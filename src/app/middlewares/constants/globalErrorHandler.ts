import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import httpStatus from "http-status";
import handleZodError from "../../errors/handleZodError";
import handlePrismaError from "../../errors/handlePrismaError";
import AppError from "../../errors/AppError";
import { Prisma } from "../../../../prisma/generated/prisma/client";
import { TErrorSource } from "../../interfaces/error";



const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong!";
  let errorSources: TErrorSource[] = [
    {
      path: "",
      message: "Internal Server Error",
    },
  ];

  if (err instanceof ZodError) {
    const simplified = handleZodError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplified = handlePrismaError(err);
    statusCode = simplified.statusCode;
    message = simplified.message;
    errorSources = simplified.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorDetails: errorSources,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default globalErrorHandler;