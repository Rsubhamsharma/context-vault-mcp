import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const modeSchema = z.enum(["general_note", "git_summary", "release_note", "session_summary"]);

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  rawText: z.string().min(3).describe("Messy natural-language context update to convert into a pending suggestion."),
  mode: modeSchema.optional().describe("Capture mode. Defaults to general_note.")
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

const linesForPatch = (patch: unknown): string[] => {
  const raw = asRecord(patch);
  const labels: Record<string, string> = {
    features: "Features",
    decisions: "Decisions",
    constraints: "Constraints",
    issues: "Issues",
    dependencies: "Dependencies",
    nextSteps: "Next Steps",
    architectureNotes: "Architecture Notes",
    aiInstructions: "AI Instructions"
  };

  return Object.entries(labels).flatMap(([key, label]) => {
    const value = raw[key];
    if (Array.isArray(value) && value.length > 0) {
      return [`## ${label}`, ...value.slice(0, 5).map((item) => `- ${String(item)}`), ""];
    }
    if (typeof value === "string" && value.trim()) {
      return [`## ${label}`, value, ""];
    }
    return [];
  });
};

export const formatCaptureSuggestion = (suggestion: Awaited<ReturnType<ContextVaultClient["captureContext"]>>): string => {
  const patchLines = linesForPatch(suggestion.suggestedPatch);

  return [
    "# Context Capture Suggestion Created",
    `Suggestion ID: ${suggestion.id}`,
    `Title: ${suggestion.title}`,
    `Status: ${suggestion.status}`,
    `Confidence: ${suggestion.confidence ?? "unknown"}`,
    "",
    "## Reasoning Summary",
    suggestion.reasoningSummary ?? "No reasoning summary returned.",
    "",
    "## Suggested Patch Preview",
    patchLines.length > 0 ? patchLines.join("\n") : "- No patch preview available.",
    "Reminder: this is pending only. Review and apply it in the Context Vault dashboard."
  ].join("\n");
};

export const registerContextCaptureTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_capture",
    "Convert messy natural-language context into a pending Context Vault suggestion.",
    inputSchema,
    async (input) => {
      try {
        const suggestion = await client.captureContext({
          projectId: input.projectId,
          rawText: input.rawText,
          mode: input.mode ?? "general_note"
        });
        return {
          content: [{ type: "text", text: formatCaptureSuggestion(suggestion) }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: toSafeErrorMessage(error) }]
        };
      }
    }
  );
};
