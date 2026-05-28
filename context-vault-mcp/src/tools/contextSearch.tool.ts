import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";
import { formatSearchResults, searchContext } from "../lib/formatContext.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  query: z.string().min(1)
};

export const registerContextSearchTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_search",
    "Search inside the latest ProjectContext with deterministic local keyword matching.",
    inputSchema,
    async (input) => {
      try {
        const context = await client.loadContext(input.projectId);
        const results = searchContext(context, input.query);
        return {
          content: [{ type: "text", text: formatSearchResults(input.query, context, results) }]
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
