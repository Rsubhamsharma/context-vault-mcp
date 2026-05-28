import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextVaultClient } from "../lib/contextVaultClient.js";
import { toSafeErrorMessage } from "../lib/errors.js";

const inputSchema = {
  projectId: z.string().optional().describe("Context Vault project ID. Defaults to CONTEXT_VAULT_PROJECT_ID.")
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

const list = (value: unknown): string => {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "None";
};

const countLines = (value: unknown): string[] => {
  const sections = asRecord(value);
  const labels: Record<string, string> = {
    goal: "Goal",
    techStack: "Tech Stack",
    features: "Features",
    decisions: "Decisions",
    constraints: "Constraints",
    issues: "Issues",
    dependencies: "Dependencies",
    nextSteps: "Next Steps",
    architectureNotes: "Architecture Notes",
    aiInstructions: "AI Instructions"
  };

  return Object.entries(sections)
    .filter(([, count]) => Boolean(count))
    .map(([section, count]) => `- ${labels[section] ?? section}: ${count === true ? "changed" : `+${String(count)}`}`);
};

const previewLines = (value: unknown): string[] => {
  const preview = asRecord(value);
  const labels: Record<string, string> = {
    addedTechStack: "Added tech stack",
    addedFeatures: "Added feature",
    addedDecisions: "Added decision",
    addedConstraints: "Added constraint",
    addedIssues: "Added issue",
    addedDependencies: "Added dependency",
    addedNextSteps: "Added next step",
    addedArchitectureNotes: "Added architecture note"
  };

  return Object.entries(preview).flatMap(([key, rawItems]) => {
    if (!Array.isArray(rawItems)) {
      return [];
    }
    return rawItems.slice(0, 3).map((item) => `- ${labels[key] ?? key}: ${String(item)}`);
  });
};

export const registerContextVersionsTool = (
  server: McpServer,
  client: ContextVaultClient
): void => {
  server.tool(
    "context_versions",
    "List context versions for a project.",
    inputSchema,
    async (input) => {
      try {
        const versions = await client.listVersions(input.projectId);
        const text = [
          "# Context Vault Versions",
          "",
          ...versions.map((version) => {
            const preview = asRecord(version.preview);
            const counts = asRecord(preview.counts);
            const changed = countLines(version.changedSections);
            const generatedPreview = previewLines(version.changePreview);
            return [
              `## Version ${version.versionNumber} — ${version.versionTitle ?? "Project Context Updated"}`,
              `Source: ${version.source}`,
              `Created: ${version.createdAt}`,
              `Summary: ${version.changeSummary}`,
              "",
              "Changed:",
              changed.length > 0 ? changed.join("\n") : "- No section changes detected",
              "",
              "Preview:",
              generatedPreview.length > 0 ? generatedPreview.join("\n") : [
                `- Goal: ${preview.goal || "None"}`,
                `- Features: ${list(preview.features)}`,
                `- Decisions: ${list(preview.decisions)}`,
                `- Next Steps: ${list(preview.nextSteps)}`,
                `- Counts: ${counts.featuresCount ?? 0} features, ${counts.decisionsCount ?? 0} decisions, ${counts.constraintsCount ?? 0} constraints, ${counts.issuesCount ?? 0} issues, ${counts.nextStepsCount ?? 0} next steps`
              ].join("\n")
            ].join("\n");
          })
        ].join("\n\n");

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
