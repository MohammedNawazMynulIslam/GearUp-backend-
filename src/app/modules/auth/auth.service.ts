import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import config from "../../../config";
import AppError from "../../errors/AppError";
import { prisma } from "../../../lib/prisma";
import type {
  IAuthTokens,
  ILoginPayload,
  IRegisterPayload,
  ISafeUser,
} from "./auth.interface";

type ITokenUser = {
  id: string;
  role: string;
  email: string;
};

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
};

const comparePassword = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

const signAccessToken = (payload: ITokenUser): string => {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as unknown as number,
  });
};

const signRefreshToken = (payload: ITokenUser): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as unknown as number,
  });
};

const generateTokens = (user: ITokenUser): IAuthTokens => {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
};

const registerUser = async (payload: IRegisterPayload): Promise<IAuthTokens> => {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(httpStatus.CONFLICT, "Email is already registered");
  }

  const hashedPassword = await hashPassword(payload.password);

  const createdUser = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      role: payload.role,
    },
    select: { id: true, role: true, email: true },
  });

  return generateTokens(createdUser);
};

const loginUser = async (
  payload: ILoginPayload
): Promise<{
  user: ISafeUser;
  accessToken: string;
  refreshToken: string;
}> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.isSuspended) {
    throw new AppError(httpStatus.FORBIDDEN, "Your account has been suspended");
  }

  const matched = await comparePassword(payload.password, user.password);
  if (!matched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const { password, ...safeUser } = user;
  const tokens = generateTokens({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  return { user: safeUser, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

const getMyProfile = async (userId: string): Promise<ISafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const { password, ...safeUser } = user;
  return safeUser;
};

export const authService = {
  registerUser,
  loginUser,
  getMyProfile,
};