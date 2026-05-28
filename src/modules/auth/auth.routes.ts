import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { authController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/signup", asyncHandler(authController.signup));
authRoutes.post("/login", asyncHandler(authController.login));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
