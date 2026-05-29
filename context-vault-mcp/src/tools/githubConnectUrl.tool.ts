import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID.")
};

export const registerGitHubConnectUrlTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "github_connect_url",
    "Get the GitHub App installation URL for connecting repositories to Context Vault.",
    inputSchema,
    async (input) => {
      try {
        const installUrl = await client.getGitHubInstallUrl(input.projectId);
        return {
          content: [{
            type: "text",
            text: [
              "# GitHub App Connect URL",
              "",
              installUrl,
              "",
              "Open this URL in a browser to install the Context Vault GitHub App and select repositories."
            ].join("\n")
          }]
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
