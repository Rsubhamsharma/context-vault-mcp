import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { apiKeyIdParamsSchema, createApiKeySchema } from "./apiKey.schemas";
import { apiKeyService } from "./apiKey.service";

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const apiKeyController = {
  async createApiKey(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const input = createApiKeySchema.parse(req.body);
    const apiKey = await apiKeyService.createApiKey(userId, input);
    res.status(201).json(apiKey);
  },

  async listApiKeys(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const apiKeys = await apiKeyService.listApiKeys(userId);
    res.json({ apiKeys });
  },

  async revokeApiKey(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { apiKeyId } = apiKeyIdParamsSchema.parse(req.params);
    const apiKey = await apiKeyService.revokeApiKey(userId, apiKeyId);
    res.json({ apiKey: { ...apiKey, scopes: apiKeyService.parseScopes(apiKey.scopes) } });
  }
};
