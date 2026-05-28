import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID.")
};

export const registerContextHealthCheckTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_health_check",
    "Verify the Context Vault MCP server can reach the backend, authenticate, and access the project.",
    inputSchema,
    async (input) => {
      try {
        const result = await client.healthCheck(input.projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
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
