import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const modeSchema = z.enum(["implementation_summary", "bug_fix_summary", "refactor_summary", "demo_progress"]);

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  taskTitle: z.string().optional().describe("Short title for the completed task."),
  implementedSummary: z.string().min(10).describe("Factual summary of what the AI agent implemented or verified."),
  changedAreas: z.array(z.string()).optional().describe("High-level areas changed, such as backend, mcp, frontend, docs."),
  filesTouched: z.array(z.string()).optional().describe("Files touched by the implementation, if known."),
  mode: modeSchema.optional().describe("Auto-capture mode. Defaults to implementation_summary.")
};

const rawTextFromInput = (input: {
  taskTitle?: string;
  implementedSummary: string;
  changedAreas?: string[];
  filesTouched?: string[];
  mode?: z.infer<typeof modeSchema>;
}): string => {
  return [
    input.taskTitle ? `Task: ${input.taskTitle}` : undefined,
    `Implementation summary: ${input.implementedSummary}`,
    input.changedAreas?.length ? `Changed areas: ${input.changedAreas.join(", ")}` : undefined,
    input.filesTouched?.length ? `Files touched: ${input.filesTouched.join(", ")}` : undefined,
    input.mode ? `Capture mode: ${input.mode}` : undefined
  ].filter(Boolean).join("\n");
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

const previewLine = (patch: Record<string, unknown>, key: string, label: string): string => {
  const value = patch[key];
  if (Array.isArray(value) && value.length > 0) {
    return `- ${label}: ${value.slice(0, 3).map((item) => String(item)).join("; ")}`;
  }
  if (typeof value === "string" && value.trim()) {
    return `- ${label}: ${value}`;
  }
  return `- ${label}: None`;
};

const formatAutoCapture = (suggestion: Awaited<ReturnType<ContextVaultClient["captureContext"]>>): string => {
  const patch = asRecord(suggestion.suggestedPatch);
  return [
    "# Context Vault Auto-Capture Created",
    "",
    "Title:",
    suggestion.title,
    "",
    "Status:",
    suggestion.status,
    "",
    "Confidence:",
    suggestion.confidence ?? "unknown",
    "",
    "Reasoning:",
    suggestion.reasoningSummary ?? "No reasoning summary returned.",
    "",
    "Suggested Patch Preview:",
    previewLine(patch, "features", "Features"),
    previewLine(patch, "decisions", "Decisions"),
    previewLine(patch, "constraints", "Constraints"),
    previewLine(patch, "issues", "Issues"),
    previewLine(patch, "dependencies", "Dependencies"),
    previewLine(patch, "nextSteps", "Next Steps"),
    previewLine(patch, "architectureNotes", "Architecture Notes"),
    "",
    "Reminder:",
    "This suggestion is pending only. Review and apply it in the Context Vault dashboard."
  ].join("\n");
};

export const registerContextAutoCaptureTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_auto_capture",
    "Create a pending Context Vault suggestion from an AI agent implementation summary after meaningful work.",
    inputSchema,
    async (input) => {
      try {
        const suggestion = await client.captureContext({
          projectId: input.projectId,
          rawText: rawTextFromInput(input),
          mode: "session_summary"
        });

        return {
          content: [{ type: "text", text: formatAutoCapture(suggestion) }]
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
