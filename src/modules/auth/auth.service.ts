import bcrypt from "bcrypt";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { signAccessToken } from "../../utils/jwt";
import type { LoginInput, SignupInput } from "./auth.schemas";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true
} as const;

export const authService = {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ApiError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name
      },
      select: publicUserSelect
    });

    return {
      user,
      token: signAccessToken({ userId: user.id })
    };
  },

  async login(input: LoginInput) {
    const userWithPassword = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!userWithPassword) {
      throw new ApiError(401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(input.password, userWithPassword.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, "Invalid email or password");
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userWithPassword.id },
      select: publicUserSelect
    });

    return {
      user,
      token: signAccessToken({ userId: user.id })
    };
  }
};
