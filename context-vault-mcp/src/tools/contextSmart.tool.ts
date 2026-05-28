import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";
import { formatSmartHandoff } from "../lib/formatContext.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID."),
  task: z.string().min(1),
  detailLevel: z.enum(["compact", "standard", "detailed"]).optional().describe("Controls smart context size. Defaults to standard.")
};

export const registerContextSmartTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_smart",
    "Return deterministic task-relevant Context Vault memory for a specific task.",
    inputSchema,
    async (input) => {
      try {
        const context = await client.loadOptimizedContext({
          projectId: input.projectId,
          mode: "full-clean",
          task: input.task
        });
        return {
          content: [{ type: "text", text: formatSmartHandoff(context, input.task, input.detailLevel ?? "standard") }]
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
