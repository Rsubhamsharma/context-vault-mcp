import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../utils/ApiError";
import { projectIdParamsSchema } from "../projects/project.schemas";
import { versionService } from "./version.service";

const versionParamsSchema = projectIdParamsSchema.extend({
  versionNumber: z.coerce.number().int().positive()
});

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const versionController = {
  async listVersions(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const versions = await versionService.listVersions(userId, projectId);
    res.json({ versions });
  },

  async getVersion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, versionNumber } = versionParamsSchema.parse(req.params);
    const version = await versionService.getVersion(userId, projectId, versionNumber);
    res.json({ version });
  },

  async getVersionContext(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId, versionNumber } = versionParamsSchema.parse(req.params);
    const version = await versionService.getVersionContext(userId, projectId, versionNumber);
    res.json({ version });
  }
};
