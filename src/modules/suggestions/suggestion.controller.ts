import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { projectIdParamsSchema } from "../projects/project.schemas";
import {
  applySuggestionSchema,
  createSuggestionSchema,
  suggestionIdParamsSchema
} from "./suggestion.schemas";
import { suggestionService } from "./suggestion.service";

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const suggestionController = {
  async createSuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const input = createSuggestionSchema.parse(req.body);
    const suggestion = await suggestionService.createSuggestion(userId, projectId, input);
    res.status(201).json({ suggestion });
  },

  async listSuggestions(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const suggestions = await suggestionService.listSuggestions(userId, projectId);
    res.json({ suggestions });
  },

  async applySuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, suggestionId } = suggestionIdParamsSchema.parse(req.params);
    const input = applySuggestionSchema.parse(req.body);
    const result = await suggestionService.applySuggestion(userId, projectId, suggestionId, input);
    res.json(result);
  },

  async rejectSuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, suggestionId } = suggestionIdParamsSchema.parse(req.params);
    const suggestion = await suggestionService.rejectSuggestion(userId, projectId, suggestionId);
    res.json({ suggestion });
  },

  async reopenSuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, suggestionId } = suggestionIdParamsSchema.parse(req.params);
    const suggestion = await suggestionService.reopenSuggestion(userId, projectId, suggestionId);
    res.json({ suggestion });
  },

  async deleteSuggestion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, suggestionId } = suggestionIdParamsSchema.parse(req.params);
    const result = await suggestionService.deleteSuggestion(userId, projectId, suggestionId);
    res.json(result);
  }
};
