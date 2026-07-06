import httpStatus from "http-status";
import { ZodError } from "zod";
import { TGenericErrorResponse } from "../interfaces/error";

const handleZodError = (
  err: ZodError
): TGenericErrorResponse => {
  const errorSources = err.issues.map(issue => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Validation Error",
    errorSources,
  };
};

export default handleZodError;