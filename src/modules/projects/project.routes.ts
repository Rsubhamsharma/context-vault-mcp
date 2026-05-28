import { Router } from "express";
import { authenticateJwtOrApiKey, requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { projectController } from "./project.controller";

export const projectRoutes = Router();

projectRoutes.post("/", requireAuth, asyncHandler(projectController.createProject));
projectRoutes.get("/", requireAuth, asyncHandler(projectController.listProjects));
projectRoutes.get(
  "/:projectId",
  authenticateJwtOrApiKey(["context:read"]),
  asyncHandler(projectController.getProject)
);
