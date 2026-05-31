import { Router } from "express";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { githubController } from "./github.controller";

export const githubRoutes = Router();
export const projectGithubRoutes = Router({ mergeParams: true });

githubRoutes.post("/webhook", asyncHandler(githubController.handleWebhook));
githubRoutes.get("/app/setup", asyncHandler(githubController.handleAppSetup));
githubRoutes.post("/app/webhook", asyncHandler(githubController.handleAppWebhook));

projectGithubRoutes.get(
  "/app/install-url",
  requireAuth,
  asyncHandler(githubController.getInstallUrl)
);
projectGithubRoutes.use(requireAuth);
projectGithubRoutes.post("/connect", asyncHandler(githubController.connectRepository));
projectGithubRoutes.get("/connection", asyncHandler(githubController.getConnection));
if (env.ENABLE_GITHUB_DEBUG_ROUTES) {
  projectGithubRoutes.post("/dev/clear-connections", asyncHandler(githubController.clearConnectionsForDev));
  projectGithubRoutes.post("/dev/reset", asyncHandler(githubController.resetConnectionsForDev));
  projectGithubRoutes.get("/app/debug-installation/:installationId", asyncHandler(githubController.debugInstallation));
}
projectGithubRoutes.get("/events", asyncHandler(githubController.listEvents));
projectGithubRoutes.post("/events/:eventId/reprocess", asyncHandler(githubController.reprocessEvent));
