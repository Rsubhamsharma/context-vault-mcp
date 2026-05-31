import type { Request, Response } from "express";
import { ApiError } from "../../utils/ApiError";
import { createProjectSchema, projectIdParamsSchema } from "./project.schemas";
import { projectService } from "./project.service";

const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  return req.user.id;
};

export const projectController = {
  async createProject(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.createProject(userId, input);
    res.status(201).json({ project });
  },

  async listProjects(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const projects = await projectService.listProjects(userId);
    res.json({ projects });
  },

  async getProject(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const project = await projectService.getProject(userId, projectId);
    res.json({ project });
  },

  async deleteProject(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);
    const { projectId } = projectIdParamsSchema.parse(req.params);
    const result = await projectService.deleteProject(userId, projectId);
    res.json(result);
  }
};
