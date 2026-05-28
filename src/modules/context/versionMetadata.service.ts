import type { Prisma, ProjectContext, VersionSource } from "@prisma/client";
import type { ContextPatchInput } from "./context.schemas";

type ContextArrayField =
  | "techStack"
  | "features"
  | "decisions"
  | "constraints"
  | "issues"
  | "dependencies"
  | "nextSteps"
  | "architectureNotes";

type ChangedSections = {
  goal?: boolean;
  techStack?: number;
  features?: number;
  decisions?: number;
  constraints?: number;
  issues?: number;
  dependencies?: number;
  nextSteps?: number;
  architectureNotes?: number;
  aiInstructions?: boolean;
};

type ChangePreview = {
  addedTechStack?: string[];
  addedFeatures?: string[];
  addedDecisions?: string[];
  addedConstraints?: string[];
  addedIssues?: string[];
  addedDependencies?: string[];
  addedNextSteps?: string[];
  addedArchitectureNotes?: string[];
};

type GenerateVersionMetadataInput = {
  source: VersionSource;
  patch: ContextPatchInput;
  previousContext: ProjectContext;
  nextContext: ProjectContext;
  suggestionTitle?: string;
  githubMetadata?: object;
  commandName?: string;
  summaryHint?: string;
};

type GeneratedVersionMetadata = {
  versionTitle: string;
  changeSummary: string;
  changedSections: ChangedSections;
  changePreview: ChangePreview;
};

const arrayFields: Array<{
  field: ContextArrayField;
  sectionKey: keyof ChangedSections;
  previewKey: keyof ChangePreview;
}> = [
  { field: "techStack", sectionKey: "techStack", previewKey: "addedTechStack" },
  { field: "features", sectionKey: "features", previewKey: "addedFeatures" },
  { field: "decisions", sectionKey: "decisions", previewKey: "addedDecisions" },
  { field: "constraints", sectionKey: "constraints", previewKey: "addedConstraints" },
  { field: "issues", sectionKey: "issues", previewKey: "addedIssues" },
  { field: "dependencies", sectionKey: "dependencies", previewKey: "addedDependencies" },
  { field: "nextSteps", sectionKey: "nextSteps", previewKey: "addedNextSteps" },
  { field: "architectureNotes", sectionKey: "architectureNotes", previewKey: "addedArchitectureNotes" }
];

const toStringItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => typeof item === "string" ? item.trim() : JSON.stringify(item).trim())
    .filter((item) => item.length > 0);
};

const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

const addedItems = (previous: unknown, next: unknown): string[] => {
  const previousSet = new Set(toStringItems(previous).map(normalize));
  return toStringItems(next).filter((item) => !previousSet.has(normalize(item)));
};

const includesAny = (text: string, terms: string[]): boolean => {
  const lowered = text.toLowerCase();
  return terms.some((term) => lowered.includes(term));
};

const patchText = (input: GenerateVersionMetadataInput): string => {
  return [
    input.suggestionTitle,
    input.commandName,
    input.summaryHint,
    JSON.stringify(input.patch),
    input.githubMetadata ? JSON.stringify(input.githubMetadata) : ""
  ].filter(Boolean).join(" ");
};

const titleFor = (input: GenerateVersionMetadataInput): string => {
  const text = patchText(input);

  if (input.source === "cleanup") {
    return "Context Memory Cleaned";
  }
  if (includesAny(text, ["version", "metadata", "history"])) {
    return "Version History Improved";
  }
  if (includesAny(text, ["smart github analysis", "githubanalysisservice"])) {
    return "Smart GitHub Analysis Planned";
  }
  if (includesAny(text, ["context_load", "context_smart", "handoff", "optimizer", "optimized context"])) {
    return "AI Context Handoff Improved";
  }
  if (includesAny(text, ["mcp", "api key", "apikey", "auth", "authentication", "scope"])) {
    return "MCP Authentication Updated";
  }
  if (includesAny(text, ["github", "webhook", "githubevent", "review queue"])) {
    return "GitHub Sync Context Updated";
  }
  if (includesAny(text, ["dashboard", "frontend", "api keys page", "react"])) {
    return "Dashboard Context Updated";
  }

  return "Project Context Updated";
};

const summaryFor = (title: string, source: VersionSource): string => {
  if (title === "AI Context Handoff Improved") {
    return "Updated project memory with MCP context handoff improvements so AI tools receive structured continuation context instead of short summaries.";
  }
  if (title === "GitHub Sync Context Updated") {
    return "Updated project memory with GitHub sync/review queue changes and review-first suggestion behavior.";
  }
  if (title === "Version History Improved") {
    return "Updated version history behavior with readable titles, summaries, changed section counts, and previews.";
  }
  if (title === "Context Memory Cleaned" || source === "cleanup") {
    return "Cleaned project memory while preserving the official cumulative context.";
  }
  if (title === "MCP Authentication Updated") {
    return "Updated project memory with MCP/API key authentication details and scoped access behavior.";
  }
  if (title === "Dashboard Context Updated") {
    return "Updated project memory with dashboard changes for reviewing context, suggestions, versions, GitHub setup, and MCP API keys.";
  }
  if (title === "Smart GitHub Analysis Planned") {
    return "Updated project memory with Smart GitHub Analysis planning for more meaningful reviewable suggestions.";
  }

  return "Updated the official ProjectContext with new project memory.";
};

export const versionMetadataService = {
  generateVersionMetadata(input: GenerateVersionMetadataInput): GeneratedVersionMetadata {
    const changedSections: ChangedSections = {};
    const changePreview: ChangePreview = {};

    if (input.previousContext.goal !== input.nextContext.goal) {
      changedSections.goal = true;
    }
    if (input.previousContext.aiInstructions !== input.nextContext.aiInstructions) {
      changedSections.aiInstructions = true;
    }

    for (const { field, sectionKey, previewKey } of arrayFields) {
      const added = addedItems(input.previousContext[field], input.nextContext[field]);
      if (added.length > 0) {
        (changedSections as Record<string, number | boolean>)[sectionKey] = added.length;
        (changePreview as Record<string, string[]>)[previewKey] = added.slice(0, 3);
      }
    }

    const versionTitle = titleFor(input);

    return {
      versionTitle,
      changeSummary: summaryFor(versionTitle, input.source),
      changedSections,
      changePreview
    };
  },

  asJson(value: ChangedSections | ChangePreview): Prisma.InputJsonObject {
    return value as Prisma.InputJsonObject;
  }
};
