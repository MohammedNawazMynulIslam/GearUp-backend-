import { Prisma } from "../../../prisma/generated/prisma/client";
import httpStatus from "http-status";
import { TGenericErrorResponse } from "../interfaces/error";

const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError
): TGenericErrorResponse => {
  let message = "Database Error";
  let errorSources = [
    {
      path: "",
      message: err.message,
    },
  ];

  switch (err.code) {
    case "P2002":
      message = "Duplicate value found";
      errorSources = [
        {
          path: "",
          message: "A record with this value already exists.",
        },
      ];
      break;

    case "P2025":
      message = "Record not found";
      errorSources = [
        {
          path: "",
          message: "The requested resource does not exist.",
        },
      ];
      break;
  }

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message,
    errorSources,
  };
};

export default handlePrismaError;