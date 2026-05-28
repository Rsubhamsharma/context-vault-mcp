import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { projectIdParamsSchema } from "../projects/project.schemas";
import { contextService } from "./context.service";
import {
  initializeContextSchema,
  manualContextCaptureSchema,
  optimizedContextQuerySchema,
  replaceContextSchema,
  updateContextSchema
} from "./context.schemas";

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const contextController = {
  async initializeContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = initializeContextSchema.parse(req.body);
    const result = await contextService.initializeContext(userId, projectId, input);
    res.status(201).json(result);
  },

  async getContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const context = await contextService.getContext(userId, projectId, {
      rebuild: req.query.rebuild === "true"
    });
    res.json({ context });
  },

  async updateContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = updateContextSchema.parse(req.body);
    const result = await contextService.updateContext(userId, projectId, input);
    res.json(result);
  },

  async rebuildFromVersions(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await contextService.rebuildFromVersions(userId, projectId);
    res.json(result);
  },

  async replaceContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = replaceContextSchema.parse(req.body);
    const result = await contextService.replaceContext(userId, projectId, input);
    res.json(result);
  },

  async getOptimizedContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = optimizedContextQuerySchema.parse(req.query);
    const result = await contextService.getOptimizedContext(userId, projectId, input);
    res.json(result);
  },

  async createCleanupSuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const suggestion = await contextService.createCleanupSuggestion(userId, projectId);
    res.status(201).json({ suggestion });
  },

  async captureManualContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = manualContextCaptureSchema.parse(req.body);
    const source = req.authType === "apiKey" ? "mcp" : "manual";
    const suggestion = await contextService.captureManualContext(userId, projectId, input, source);
    res.status(201).json({ suggestion });
  }
};
