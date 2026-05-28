import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { authService } from "./auth.service";
import { loginSchema, signupSchema } from "./auth.schemas";

export const authController = {
  async signup(req: Request, res: Response): Promise<void> {
    const input = signupSchema.parse(req.body);
    const result = await authService.signup(input);
    res.status(201).json(result);
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }
    res.json({ user: req.user });
  }
};
