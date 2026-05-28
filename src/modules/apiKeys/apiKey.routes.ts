import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { apiKeyController } from "./apiKey.controller";

export const apiKeyRoutes = Router();

apiKeyRoutes.use(requireAuth);
apiKeyRoutes.post("/", asyncHandler(apiKeyController.createApiKey));
apiKeyRoutes.get("/", asyncHandler(apiKeyController.listApiKeys));
apiKeyRoutes.delete("/:apiKeyId", asyncHandler(apiKeyController.revokeApiKey));
