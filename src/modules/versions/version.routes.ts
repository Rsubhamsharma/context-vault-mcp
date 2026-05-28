import { Router } from "express";
import { authenticateJwtOrApiKey } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { versionController } from "./version.controller";

export const versionRoutes = Router({ mergeParams: true });

versionRoutes.use(authenticateJwtOrApiKey(["context:read"]));
versionRoutes.get("/", asyncHandler(versionController.listVersions));
versionRoutes.get("/:versionNumber/context", asyncHandler(versionController.getVersionContext));
versionRoutes.get("/:versionNumber", asyncHandler(versionController.getVersion));
