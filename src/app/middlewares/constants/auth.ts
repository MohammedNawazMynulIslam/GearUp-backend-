import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { Role } from "../../../../prisma/generated/prisma/client";
import config from "../../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";

type ITokenUser = {
  id: string;
  role: string;
  email: string;
};

const auth = (...allowedRoles: Role[]): RequestHandler => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Access token is required");
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Access token is required");
      }

      let decoded: ITokenUser;
      try {
        decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as ITokenUser;
      } catch {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid or expired access token"
        );
      }

      req.user = decoded;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role as Role)) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
      }

      next();
    }
  );
};

export default auth;