import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import type { CreateProjectInput } from "./project.schemas";

export const projectService = {
  async createProject(userId: string, input: CreateProjectInput) {
    return prisma.project.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        repoUrl: input.repoUrl,
        defaultBranch: input.defaultBranch
      }
    });
  },

  async listProjects(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        context: {
          select: {
            id: true,
            currentVersionNumber: true,
            updatedAt: true
          }
        }
      }
    });
  },

  async getProject(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        context: true
      }
    });

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    return project;
  },

  async deleteProject(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);
    await prisma.project.delete({
      where: { id: projectId }
    });
    return { success: true };
  },

  async assertProjectOwner(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true, userId: true }
    });

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    return project;
  }
};
