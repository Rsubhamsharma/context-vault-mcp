import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";
import { formatCaptureSuggestion } from "./contextCapture.tool.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  rawText: z.string().min(3).describe("Pasted commits, diffs, or git summary text to convert into a pending suggestion.")
};

export const registerContextImportGitTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_import_git",
    "Convert pasted git summaries into a pending Context Vault suggestion.",
    inputSchema,
    async (input) => {
      try {
        const suggestion = await client.captureContext({
          projectId: input.projectId,
          rawText: input.rawText,
          mode: "git_summary"
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
