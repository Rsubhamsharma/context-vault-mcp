import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";
import { formatProjectHandoff } from "../lib/formatContext.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  detailLevel: z.enum(["compact", "standard", "detailed"]).optional().describe("Controls handoff detail. Defaults to standard."),
  compression: z.enum(["standard", "aggressive", "ultra"]).optional().describe("Controls optimized handoff compression. Defaults to aggressive for raw=false."),
  raw: z.boolean().optional().describe("Return raw stored ProjectContext instead of optimized AI-ready context.")
};

export const registerContextLoadTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_load",
    "Load the latest official ProjectContext from Context Vault.",
    inputSchema,
    async (input) => {
      try {
        const context = await client.loadOptimizedContext({
          projectId: input.projectId,
          mode: "full-clean",
          raw: input.raw
        });
        return {
          content: [{ type: "text", text: await formatProjectHandoff(context, input.detailLevel ?? "standard", input.compression ?? "aggressive") }]
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
