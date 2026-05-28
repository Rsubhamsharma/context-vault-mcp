import { Router } from "express";
import { authenticateJwtOrApiKey, requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { suggestionController } from "./suggestion.controller";

export const suggestionRoutes = Router({ mergeParams: true });

suggestionRoutes.post(
  "/",
  authenticateJwtOrApiKey(["context:write:suggestion"]),
  asyncHandler(suggestionController.createSuggestion)
);
suggestionRoutes.get(
  "/",
  authenticateJwtOrApiKey(["context:read"]),
  asyncHandler(suggestionController.listSuggestions)
);
suggestionRoutes.post("/:suggestionId/apply", requireAuth, asyncHandler(suggestionController.applySuggestion));
suggestionRoutes.post("/:suggestionId/reject", requireAuth, asyncHandler(suggestionController.rejectSuggestion));
