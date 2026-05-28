import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { githubController } from "./github.controller";

export const githubRoutes = Router();
export const projectGithubRoutes = Router({ mergeParams: true });

githubRoutes.post("/webhook", asyncHandler(githubController.handleWebhook));

projectGithubRoutes.use(requireAuth);
projectGithubRoutes.post("/connect", asyncHandler(githubController.connectRepository));
projectGithubRoutes.get("/connection", asyncHandler(githubController.getConnection));
projectGithubRoutes.get("/events", asyncHandler(githubController.listEvents));
projectGithubRoutes.post("/events/:eventId/reprocess", asyncHandler(githubController.reprocessEvent));
