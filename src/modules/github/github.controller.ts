import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { projectIdParamsSchema } from "../projects/project.schemas";
import {
  connectGitHubSchema,
  githubEventIdParamsSchema,
  reprocessGitHubEventSchema
} from "./github.schemas";
import { githubService } from "./github.service";

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const githubController = {
  async connectRepository(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = connectGitHubSchema.parse(req.body);
    const connection = await githubService.connectRepository(userId, projectId, input);
    res.status(201).json({ connection });
  },

  async getConnection(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await githubService.getConnection(userId, projectId);
    res.json(result);
  },

  async clearConnectionsForDev(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await githubService.clearConnectionsForDev(userId, projectId);
    res.json(result);
  },

  async resetConnectionsForDev(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await githubService.resetConnectionsForDev(userId, projectId);
    res.json(result);
  },

  async debugInstallation(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const installationId = typeof req.params.installationId === "string" ? req.params.installationId : "";
    const result = await githubService.debugInstallation(userId, projectId, installationId);
    res.json(result);
  },

  async getInstallUrl(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await githubService.getInstallUrl(userId, projectId);
    res.json(result);
  },

  async listEvents(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const events = await githubService.listEvents(userId, projectId);
    res.json({ events });
  },

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const result = await githubService.handleWebhook({
      eventType: req.header("x-github-event") ?? undefined,
      deliveryId: req.header("x-github-delivery") ?? undefined,
      signature: req.header("x-hub-signature-256") ?? undefined,
      rawBody: req.rawBody,
      payload: req.body
    });
    res.json(result);
  },

  async handleAppSetup(req: Request, res: Response): Promise<void> {
    console.log("[github-app] setup controller hit", {
      installation_id: typeof req.query.installation_id === "string" ? req.query.installation_id : undefined,
      setup_action: typeof req.query.setup_action === "string" ? req.query.setup_action : undefined,
      stateExists: typeof req.query.state === "string"
    });
    const result = await githubService.handleAppSetup({
      installationId: typeof req.query.installation_id === "string" ? req.query.installation_id : undefined,
      setupAction: typeof req.query.setup_action === "string" ? req.query.setup_action : undefined,
      state: typeof req.query.state === "string" ? req.query.state : undefined
    });
    res.redirect(result.redirectUrl);
  },

  async handleAppWebhook(req: Request, res: Response): Promise<void> {
    console.log("[github-app] webhook controller hit", {
      eventType: req.header("x-github-event") ?? undefined,
      deliveryId: req.header("x-github-delivery") ?? undefined,
      signaturePresent: Boolean(req.header("x-hub-signature-256")),
      contentType: req.header("content-type") ?? undefined,
      rawBodyBytes: req.rawBody?.length ?? 0,
      bodyType: Array.isArray(req.body) ? "array" : typeof req.body,
      bodyKeys: req.body && typeof req.body === "object" && !Array.isArray(req.body) ? Object.keys(req.body) : []
    });
    const result = await githubService.handleAppWebhook({
      eventType: req.header("x-github-event") ?? undefined,
      deliveryId: req.header("x-github-delivery") ?? undefined,
      signature: req.header("x-hub-signature-256") ?? undefined,
      rawBody: req.rawBody,
      payload: req.body
    });
    res.json(result);
  },

  async reprocessEvent(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, eventId } = githubEventIdParamsSchema.parse(req.params);
    const input = reprocessGitHubEventSchema.parse(req.body);
    const result = await githubService.reprocessEvent(userId, projectId, eventId, input);
    res.status(201).json(result);
  }
};
