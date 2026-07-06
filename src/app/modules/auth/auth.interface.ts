import type { User } from "../../../../prisma/generated/prisma/client";

export type ISafeUser = Omit<User, "password">;

export type IRegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  role: "CUSTOMER" | "PROVIDER";
};

export type ILoginPayload = {
  email: string;
  password: string;
};

export type IAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type ILoginResponse = {
  user: ISafeUser;
  accessToken: string;
  refreshToken: string;
};

export type IAuthUser = {
  id: string;
  role: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
    }
  }
}