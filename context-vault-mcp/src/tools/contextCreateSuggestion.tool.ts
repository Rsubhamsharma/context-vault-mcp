import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const suggestedPatchSchema = z.object({
  goal: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  issues: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
  architectureNotes: z.array(z.string()).optional(),
  aiInstructions: z.string().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one suggestedPatch field is required"
});

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  title: z.string().min(1).max(200),
  suggestedPatch: suggestedPatchSchema
};

export const registerContextCreateSuggestionTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_create_suggestion",
    "Create a pending context update suggestion without mutating official ProjectContext.",
    inputSchema,
    async (input) => {
      try {
        const suggestion = await client.createSuggestion(input);
        const text = [
          "# Context Vault Suggestion Created",
          `Suggestion ID: ${suggestion.id}`,
          `Title: ${suggestion.title}`,
          `Status: ${suggestion.status}`,
          "",
          "This is a pending suggestion only. It has not changed the official ProjectContext.",
          "Review and apply it through the Context Vault backend or future dashboard."
        ].join("\n");

        return {
          content: [{ type: "text", text }]
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
