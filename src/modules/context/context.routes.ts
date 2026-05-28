import { Router } from "express";
import { authenticateJwtOrApiKey, requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { contextController } from "./context.controller";

export const contextRoutes = Router({ mergeParams: true });

contextRoutes.post("/initialize", requireAuth, asyncHandler(contextController.initializeContext));
contextRoutes.post(
  "/rebuild-from-versions",
  requireAuth,
  asyncHandler(contextController.rebuildFromVersions)
);
contextRoutes.post("/rebuild", requireAuth, asyncHandler(contextController.rebuildFromVersions));
contextRoutes.put("/replace", requireAuth, asyncHandler(contextController.replaceContext));
contextRoutes.get(
  "/optimized",
  authenticateJwtOrApiKey(["context:read"]),
  asyncHandler(contextController.getOptimizedContext)
);
contextRoutes.post(
  "/cleanup-suggestion",
  requireAuth,
  asyncHandler(contextController.createCleanupSuggestion)
);
contextRoutes.post(
  "/capture",
  authenticateJwtOrApiKey(["context:write:suggestion"]),
  asyncHandler(contextController.captureManualContext)
);
contextRoutes.get(
  "/",
  authenticateJwtOrApiKey(["context:read"]),
  asyncHandler(contextController.getContext)
);
contextRoutes.patch("/", requireAuth, asyncHandler(contextController.updateContext));
