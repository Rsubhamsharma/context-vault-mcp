import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  userId: string;
};

export const signAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET as Secret, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || typeof decoded.userId !== "string") {
    throw new Error("Invalid token payload");
  }
  return { userId: decoded.userId };
};
