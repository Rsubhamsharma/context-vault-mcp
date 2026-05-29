import type { ProjectContext } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";
import type { GitHubChangedFile } from "./githubAnalysis.service";

const contextArrayFields = [
  "features",
  "decisions",
  "constraints",
  "issues",
  "dependencies",
  "nextSteps",
  "architectureNotes"
] as const;

export type GitHubSuggestionPatch = {
  features: string[];
  decisions: string[];
  constraints: string[];
  issues: string[];
  dependencies: string[];
  nextSteps: string[];
  architectureNotes: string[];
  aiInstructions?: string;
};

export type GitHubSuggestionRefinementInput = {
  eventType: "push" | "pull_request";
  action?: string;
  branch?: string;
  commitMessages?: string[];
  prTitle?: string;
  prBody?: string;
  changedFiles?: GitHubChangedFile[];
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  currentProjectContext: ProjectContext;
  deterministicSuggestion: {
    title: string;
    suggestedPatch: GitHubSuggestionPatch;
    confidence: "low" | "medium" | "high";
    reasoningSummary: string;
  };
};

export type GitHubSuggestionRefinementResult = {
  title: string;
  suggestedPatch: GitHubSuggestionPatch;
  confidence: "low" | "medium" | "high";
  reasoningSummary: string;
  refinementUsed: boolean;
};

export type GitHubSuggestionRefinementAttempt = {
  result: GitHubSuggestionRefinementResult;
  attempted: boolean;
  succeeded: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
};

const stringArraySchema = z.array(z.string()).default([]);

const patchSchema = z.object({
  features: stringArraySchema,
  decisions: stringArraySchema,
  constraints: stringArraySchema,
  issues: stringArraySchema,
  dependencies: stringArraySchema,
  nextSteps: stringArraySchema,
  architectureNotes: stringArraySchema,
  aiInstructions: z.string().optional()
}).strict();

const refinementSchema = z.object({
  title: z.string().min(1).max(160),
  suggestedPatch: patchSchema,
  confidence: z.enum(["low", "medium", "high"]),
  reasoningSummary: z.string().min(1).max(1200)
}).strict();

const toItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizePatch = (patch: GitHubSuggestionPatch): GitHubSuggestionPatch => {
  const normalized: GitHubSuggestionPatch = {
    features: [],
    decisions: [],
    constraints: [],
    issues: [],
    dependencies: [],
    nextSteps: [],
    architectureNotes: []
  };

  for (const field of contextArrayFields) {
    const seen = new Set<string>();
    normalized[field] = patch[field]
      .map((item) => item.trim())
      .filter((item) => {
        const key = item.toLowerCase();
        if (!item || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  if (patch.aiInstructions?.trim()) {
    normalized.aiInstructions = patch.aiInstructions.trim();
  }

  return normalized;
};

const contextForPrompt = (context: ProjectContext) => ({
  goal: context.goal,
  techStack: toItems(context.techStack),
  features: toItems(context.features),
  decisions: toItems(context.decisions),
  constraints: toItems(context.constraints),
  issues: toItems(context.issues),
  dependencies: toItems(context.dependencies),
  nextSteps: toItems(context.nextSteps),
  architectureNotes: toItems(context.architectureNotes),
  aiInstructions: context.aiInstructions,
  currentVersionNumber: context.currentVersionNumber
});

const buildPrompt = (input: GitHubSuggestionRefinementInput): string => {
  return [
    "You are refining a Context Vault GitHub suggestion.",
    "Context Vault stores AI-readable project memory, not code.",
    "GitHub remains the code source of truth.",
    "Suggestions must remain pending and review-first.",
    "Use current ProjectContext to avoid duplicates.",
    "Do not invent completed work not implied by GitHub metadata.",
    "Prefer useful product, architecture, decision, constraint, and issue updates over generic commit summaries.",
    "If the commit is minor, typo-only, formatting-only, or not meaningful for project memory, return an empty patch with low confidence.",
    "Make the suggestion useful for future context_load handoffs.",
    "Output strict JSON only matching this schema:",
    '{"title":"string","suggestedPatch":{"features":["string"],"decisions":["string"],"constraints":["string"],"issues":["string"],"dependencies":["string"],"nextSteps":["string"],"architectureNotes":["string"],"aiInstructions":"optional string"},"confidence":"low|medium|high","reasoningSummary":"string"}',
    "",
    `Current ProjectContext:\n${JSON.stringify(contextForPrompt(input.currentProjectContext))}`,
    "",
    `GitHub event metadata:\n${JSON.stringify({
      eventType: input.eventType,
      action: input.action,
      branch: input.branch,
      commitMessages: input.commitMessages ?? [],
      prTitle: input.prTitle,
      prBody: input.prBody,
      changedFiles: input.changedFiles ?? [],
      repository: input.repository
    })}`,
    "",
    `Deterministic suggestion:\n${JSON.stringify(input.deterministicSuggestion)}`
  ].join("\n");
};

const extractJsonText = (value: unknown): string | undefined => {
  const response = value as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
};

const parseStrictJson = (text: string): unknown => {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
};

const fallback = (
  input: GitHubSuggestionRefinementInput,
  attempted: boolean,
  fallbackReason?: string
): GitHubSuggestionRefinementAttempt => ({
  attempted,
  succeeded: false,
  fallbackUsed: true,
  fallbackReason,
  result: {
    title: input.deterministicSuggestion.title,
    suggestedPatch: normalizePatch(input.deterministicSuggestion.suggestedPatch),
    confidence: input.deterministicSuggestion.confidence,
    reasoningSummary: input.deterministicSuggestion.reasoningSummary,
    refinementUsed: false
  }
});

export const githubSuggestionRefinementService = {
  async refine(input: GitHubSuggestionRefinementInput): Promise<GitHubSuggestionRefinementAttempt> {
    if (!env.GEMINI_API_KEY) {
      return fallback(input, false, "missing_gemini_api_key");
    }

    if (env.GITHUB_SUGGESTION_AI_PROVIDER !== "gemini") {
      return fallback(input, false, "unsupported_provider");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GITHUB_SUGGESTION_AI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(input) }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        return fallback(input, true, `provider_http_${response.status}`);
      }

      const data = await response.json();
      const text = extractJsonText(data);
      if (!text) {
        return fallback(input, true, "empty_ai_response");
      }

      const parsed = refinementSchema.parse(parseStrictJson(text));
      return {
        attempted: true,
        succeeded: true,
        fallbackUsed: false,
        result: {
          title: parsed.title,
          suggestedPatch: normalizePatch(parsed.suggestedPatch),
          confidence: parsed.confidence,
          reasoningSummary: `${parsed.reasoningSummary} AI-refined from GitHub event metadata and current ProjectContext.`,
          refinementUsed: true
        }
      };
    } catch (error) {
      const reason = error instanceof Error && error.name === "AbortError"
        ? "provider_timeout"
        : "ai_refinement_failed";
      return fallback(input, true, reason);
    } finally {
      clearTimeout(timeout);
    }
  }
};
