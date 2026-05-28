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
    const connection = await githubService.getConnection(userId, projectId);
    res.json({ connection });
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

  async reprocessEvent(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, eventId } = githubEventIdParamsSchema.parse(req.params);
    const input = reprocessGitHubEventSchema.parse(req.body);
    const result = await githubService.reprocessEvent(userId, projectId, eventId, input);
    res.status(201).json(result);
  }
};
