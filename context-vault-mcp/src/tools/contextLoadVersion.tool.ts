import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";
import { formatHistoricalContext } from "../lib/formatContext.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  versionNumber: z.number().int().positive()
};

export const registerContextLoadVersionTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_load_version",
    "Load a specific historical ContextVersion snapshot from Context Vault.",
    inputSchema,
    async (input) => {
      try {
        const version = await client.loadVersionContext(input.projectId, input.versionNumber);
        return {
          content: [{ type: "text", text: formatHistoricalContext(version) }]
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
