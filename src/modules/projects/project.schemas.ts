import { z } from "zod";

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  repoUrl: z.string().url().optional(),
  defaultBranch: z.string().min(1).max(120).optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
