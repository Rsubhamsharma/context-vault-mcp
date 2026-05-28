import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const registerContinueWithContextPrompt = (server: McpServer): void => {
  server.prompt(
    "continue_with_context",
    "Use Context Vault as the source of truth before continuing project work.",
    {
      task: z.string().optional().describe("The task the assistant is about to work on.")
    },
    ({ task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use Context Vault before giving implementation advice.",
              "",
              task ? `Task: ${task}` : "Task: continue the current project work.",
              "",
              "Instructions:",
              "- First call context_smart for task-specific work, or context_load if the whole project memory is needed.",
              "- Treat Context Vault as the project memory source of truth.",
              "- Respect all constraints from ProjectContext.",
              "- Do not assume stale chat memory is correct over Context Vault memory.",
              "- After completing a meaningful change, offer to create a context_create_suggestion.",
              "- Never directly apply memory updates."
            ].join("\n")
          }
        }
      ]
    })
  );
};
