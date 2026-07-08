import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../config";

export type ITokenPayload = {
  id: string;
  role: string;
  email: string;
};

export type ITokenUser = ITokenPayload & JwtPayload;

export type ITokenVerifyResult = {
  valid: boolean;
  decoded?: ITokenUser;
};

const ACCESS_SECRET: Secret = config.JWT_ACCESS_SECRET;
const REFRESH_SECRET: Secret = config.JWT_REFRESH_SECRET;

const createAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  });
};

const createRefreshToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as unknown as SignOptions["expiresIn"],
  });
};

const verifyToken = (token: string, secret: Secret): ITokenVerifyResult => {
  try {
    const decoded = jwt.verify(token, secret) as ITokenUser;
    return { valid: true, decoded };
  } catch {
    return { valid: false };
  }
};

export { ACCESS_SECRET, REFRESH_SECRET };

export default {
  createAccessToken,
  createRefreshToken,
  verifyToken,
};