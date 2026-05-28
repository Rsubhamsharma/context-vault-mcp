import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const registerAfterTaskContextCapturePrompt = (server: McpServer): void => {
  server.prompt(
    "after_task_context_capture",
    "Instruct an AI agent to auto-capture meaningful completed work into Context Vault.",
    {
      taskTitle: z.string().optional().describe("The task the assistant completed.")
    },
    ({ taskTitle }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "After completing meaningful implementation, bug fix, refactor, integration, or verification work, create a pending Context Vault suggestion using context_auto_capture.",
              "",
              taskTitle ? `Completed task: ${taskTitle}` : "Completed task: use the current task title if known.",
              "",
              "Rules:",
              "- Do not call context_auto_capture for tiny/no-op changes.",
              "- Never apply the suggestion automatically.",
              "- Keep the implementation summary factual and concise.",
              "- Do not invent work that was not done.",
              "- Include changedAreas and filesTouched if known.",
              "- Use mode implementation_summary, bug_fix_summary, refactor_summary, or demo_progress.",
              "- Mention tests, build verification, or manual verification if completed.",
              "- Summarize what changed, why it matters, and any affected decisions or constraints.",
              "",
              "Example tool call:",
              "context_auto_capture {",
              '  "taskTitle": "Manual Context Capture",',
              '  "implementedSummary": "Implemented Manual Context Capture backend endpoint, context_capture and context_import_git MCP tools, and dashboard Capture Manual Context form. Capture creates pending ContextSuggestion records only and does not mutate ProjectContext.",',
              '  "changedAreas": ["backend", "mcp", "frontend"],',
              '  "mode": "implementation_summary"',
              "}"
            ].join("\n")
          }
        }
      ]
    })
  );
};
