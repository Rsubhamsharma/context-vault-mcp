import { z } from "zod";
import { env } from "../config/env.js";
import { McpToolError } from "./errors.js";

const contextSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  goal: z.string(),
  techStack: z.unknown(),
  features: z.unknown(),
  decisions: z.unknown(),
  constraints: z.unknown(),
  issues: z.unknown(),
  dependencies: z.unknown(),
  nextSteps: z.unknown(),
  architectureNotes: z.unknown(),
  aiInstructions: z.string(),
  currentVersionNumber: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const contextResponseSchema = z.object({
  context: contextSchema
});

const optimizedContextSchema = z.object({
  goal: z.string(),
  techStack: z.array(z.string()),
  features: z.array(z.string()),
  decisions: z.array(z.string()),
  constraints: z.array(z.string()),
  issues: z.array(z.string()),
  dependencies: z.array(z.string()),
  nextSteps: z.array(z.string()),
  architectureNotes: z.array(z.string()),
  aiInstructions: z.string(),
  currentVersionNumber: z.number()
});

const optimizedContextResponseSchema = z.object({
  optimizedContext: optimizedContextSchema.optional(),
  rawContext: contextSchema.optional(),
  optimizationSummary: z.string(),
  tokenEstimate: z.number(),
  originalTokenEstimate: z.number(),
  estimatedSavingsPercent: z.number(),
  removedStaleConstraintsCount: z.number().optional(),
  deduplicatedItemsCount: z.number().optional(),
  removedNoisyItemsCount: z.number().optional()
});

const versionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionNumber: z.number(),
  snapshot: z.unknown(),
  versionTitle: z.string().nullable().optional(),
  changeSummary: z.string(),
  changedSections: z.unknown().optional(),
  changePreview: z.unknown().optional(),
  source: z.string(),
  createdAt: z.string(),
  preview: z.unknown().optional()
});

const versionsResponseSchema = z.object({
  versions: z.array(versionSchema)
});

const versionContextSchema = z.object({
  versionNumber: z.number(),
  source: z.string(),
  versionTitle: z.string().nullable().optional(),
  changeSummary: z.string(),
  changedSections: z.unknown().optional(),
  changePreview: z.unknown().optional(),
  createdAt: z.string(),
  snapshot: z.unknown()
});

const versionContextResponseSchema = z.object({
  version: versionContextSchema
});

const githubInstallUrlResponseSchema = z.object({
  installUrl: z.string()
});

const suggestionResponseSchema = z.object({
  suggestion: z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    source: z.string(),
    suggestedPatch: z.unknown(),
    confidence: z.string().nullable().optional(),
    reasoningSummary: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    appliedAt: z.string().nullable().optional()
  })
});

export type ProjectContext = z.infer<typeof contextSchema>;
export type OptimizedContextResponse = z.infer<typeof optimizedContextResponseSchema>;
export type ContextVersion = z.infer<typeof versionSchema>;
export type HistoricalContextVersion = z.infer<typeof versionContextSchema>;
export type ContextSuggestion = z.infer<typeof suggestionResponseSchema>["suggestion"];

export type SuggestedPatch = {
  goal?: string;
  techStack?: string[];
  features?: string[];
  decisions?: string[];
  constraints?: string[];
  issues?: string[];
  dependencies?: string[];
  nextSteps?: string[];
  architectureNotes?: string[];
  aiInstructions?: string;
};

const resolveProjectId = (projectId?: string): string => {
  const resolvedProjectId = projectId ?? env.defaultProjectId;
  if (!resolvedProjectId) {
    throw new McpToolError(
      "Missing CONTEXT_VAULT_PROJECT_ID. Pass projectId or set it in MCP env.",
      "env"
    );
  }
  return resolvedProjectId;
};

const getApiKey = (): string => {
  if (!env.apiKey) {
    throw new McpToolError(
      "Context Vault API key is invalid, revoked, or missing required scope.",
      "env"
    );
  }
  return env.apiKey;
};

const request = async <T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers
      }
    });
  } catch {
    throw new McpToolError(
      "Context Vault backend is not reachable. Check CONTEXT_VAULT_API_URL and make sure the backend is running.",
      "network"
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new McpToolError(
        "Context Vault API key is invalid, revoked, or missing required scope.",
        "unauthorized"
      );
    }
    if (response.status === 404) {
      throw new McpToolError(
        "Project not found or this API key does not have access to it.",
        "not_found"
      );
    }

    let message = `Context Vault API returned ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Keep the generic status message if the backend did not return JSON.
    }
    throw new McpToolError(message, "api");
  }

  const body = await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new McpToolError("Context Vault API returned an unexpected response shape", "api");
  }

  return parsed.data;
};

export class ContextVaultClient {
  resolveProjectId(projectId?: string): string {
    return resolveProjectId(projectId);
  }

  get apiUrl(): string {
    return env.apiUrl;
  }

  hasApiKey(): boolean {
    return Boolean(env.apiKey);
  }

  async loadContext(projectId?: string): Promise<ProjectContext> {
    const resolvedProjectId = resolveProjectId(projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/context?rebuild=true`,
      contextResponseSchema
    );
    return response.context;
  }

  async loadOptimizedContext(input: {
    projectId?: string;
    mode: "full-clean" | "smart-task";
    task?: string;
    raw?: boolean;
  }): Promise<OptimizedContextResponse> {
    const resolvedProjectId = resolveProjectId(input.projectId);
    const params = new URLSearchParams({
      mode: input.mode,
      raw: input.raw ? "true" : "false"
    });
    if (input.task) {
      params.set("task", input.task);
    }
    return request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/context/optimized?${params.toString()}`,
      optimizedContextResponseSchema
    );
  }

  async loadVersionContext(projectId: string | undefined, versionNumber: number): Promise<HistoricalContextVersion> {
    const resolvedProjectId = resolveProjectId(projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/versions/${versionNumber}/context`,
      versionContextResponseSchema
    );
    return response.version;
  }

  async listVersions(projectId?: string): Promise<ContextVersion[]> {
    const resolvedProjectId = resolveProjectId(projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/versions`,
      versionsResponseSchema
    );
    return response.versions;
  }

  async createSuggestion(input: {
    projectId?: string;
    title: string;
    suggestedPatch: SuggestedPatch;
  }): Promise<ContextSuggestion> {
    const resolvedProjectId = resolveProjectId(input.projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/suggestions`,
      suggestionResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          source: "ai",
          suggestedPatch: input.suggestedPatch
        })
      }
    );
    return response.suggestion;
  }

  async getGitHubInstallUrl(projectId?: string): Promise<string> {
    const resolvedProjectId = resolveProjectId(projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/github/app/install-url`,
      githubInstallUrlResponseSchema
    );
    return response.installUrl;
  }

  async captureContext(input: {
    projectId?: string;
    rawText: string;
    mode?: "general_note" | "git_summary" | "release_note" | "session_summary";
  }): Promise<ContextSuggestion> {
    const resolvedProjectId = resolveProjectId(input.projectId);
    const response = await request(
      `/api/projects/${encodeURIComponent(resolvedProjectId)}/context/capture`,
      suggestionResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({
          rawText: input.rawText,
          mode: input.mode ?? "general_note"
        })
      }
    );
    return response.suggestion;
  }

  async healthCheck(projectId?: string) {
    const resolvedProjectId = projectId ?? env.defaultProjectId;
    const base = {
      backendReachable: false,
      authenticated: false,
      projectFound: false,
      projectId: resolvedProjectId ?? null,
      apiUrl: env.apiUrl
    };

    if (!resolvedProjectId) {
      return {
        ...base,
        message: "Missing CONTEXT_VAULT_PROJECT_ID. Pass projectId or set it in MCP env."
      };
    }

    if (!env.apiKey) {
      return {
        ...base,
        message: "Context Vault API key is invalid, revoked, or missing required scope."
      };
    }

    try {
      await this.loadContext(resolvedProjectId);
      return {
        ...base,
        backendReachable: true,
        authenticated: true,
        projectFound: true,
        message: "Context Vault MCP is configured correctly."
      };
    } catch (error) {
      if (error instanceof McpToolError) {
        return {
          ...base,
          backendReachable: error.code !== "network",
          authenticated: error.code !== "network" && error.code !== "unauthorized",
          projectFound: error.code !== "network" && error.code !== "unauthorized" && error.code !== "not_found",
          message: error.message
        };
      }
      return {
        ...base,
        message: "Context Vault MCP health check failed."
      };
    }
  }
}
