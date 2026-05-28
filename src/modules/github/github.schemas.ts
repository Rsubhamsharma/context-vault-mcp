import { z } from "zod";

export const connectGitHubSchema = z.object({
  repoOwner: z.string().min(1).max(120),
  repoName: z.string().min(1).max(120),
  repoUrl: z.string().url(),
  defaultBranch: z.string().min(1).max(120).default("main"),
  webhookSecret: z.string().min(8).max(500).optional()
});

export const githubEventIdParamsSchema = z.object({
  projectId: z.string().min(1),
  eventId: z.string().min(1)
});

export const reprocessGitHubEventSchema = z.object({
  force: z.boolean().default(false)
});

export type ConnectGitHubInput = z.infer<typeof connectGitHubSchema>;
export type ReprocessGitHubEventInput = z.infer<typeof reprocessGitHubEventSchema>;
