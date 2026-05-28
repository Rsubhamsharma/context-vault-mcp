import type { Prisma } from "@prisma/client";

export type GitHubChangedFile = {
  filename: string;
  status?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
};

export type GitHubAnalysisInput = {
  eventType: "push" | "pull_request";
  action?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: number;
  title?: string;
  author?: string;
  commitMessages: string[];
  changedFiles?: GitHubChangedFile[];
  diffSummary?: string;
  repoOwner: string;
  repoName: string;
  merged?: boolean;
};

export type GitHubAnalysisResult = {
  title: string;
  suggestionTitle: string;
  suggestedPatch: {
    features: string[];
    decisions: string[];
    issues: string[];
    dependencies: string[];
    constraints: string[];
    nextSteps: string[];
    architectureNotes: string[];
  };
  confidence: "low" | "medium" | "high";
  reasoningSummary: string;
};

const includesAny = (text: string, terms: readonly string[]): boolean => {
  return terms.some((term) => text.includes(term));
};

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
};

const keywordGroups = {
  feature: ["add", "added", "implement", "implemented", "create", "introduce", "support", "enable", "build"],
  fix: ["fix", "fixed", "resolve", "resolved", "bug", "patch", "error", "failing", "broken"],
  architecture: ["refactor", "restructure", "cleanup", "migrate", "architecture", "service", "module", "middleware", "schema", "prisma", "database"],
  security: ["auth", "authentication", "authorization", "jwt", "api key", "apikey", "scope", "permission", "token", "secret", "hash", "revoke", "ownership"],
  mcpContext: ["mcp", "context", "projectcontext", "suggestion", "version", "memory", "export", "smart", "handoff", "skill", "plugin"],
  github: ["github", "webhook", "pull request", "pr", "commit", "review queue", "event", "sync"],
  frontend: ["frontend", "react", "vite", "dashboard", "ui", "page", "route", "setup", "review queue"],
  dependency: ["install", "package", "dependency", "library", "sdk", "prisma migrate", "migration"]
} as const;

const matchedGroupNames = (signalText: string): string[] => {
  return Object.entries(keywordGroups)
    .filter(([, terms]) => includesAny(signalText, [...terms]))
    .map(([name]) => name);
};

const summarizeFiles = (changedFiles: GitHubChangedFile[] | undefined): string | undefined => {
  if (!changedFiles || changedFiles.length === 0) {
    return undefined;
  }

  return changedFiles
    .slice(0, 12)
    .map((file) => {
      const stats = [
        file.status,
        file.additions !== undefined ? `+${file.additions}` : undefined,
        file.deletions !== undefined ? `-${file.deletions}` : undefined
      ].filter(Boolean).join(", ");
      return stats ? `${file.filename} (${stats})` : file.filename;
    })
    .join("; ");
};

const fileHints = (changedFiles: GitHubChangedFile[] | undefined): string => {
  return changedFiles?.map((file) => file.filename.toLowerCase()).join(" ") ?? "";
};

const sourceSummaryFor = (input: GitHubAnalysisInput): string => {
  if (input.eventType === "push") {
    return input.commitMessages.join(" | ") || "GitHub push";
  }

  return input.title ?? `PR #${input.prNumber ?? "unknown"}`;
};

const titleFor = (signalText: string, input: GitHubAnalysisInput): string => {
  if (includesAny(signalText, ["duplicate suggestion apply", "suggestion apply", "duplicate", "idempotent", "idempotency"])) {
    return "Suggestion Apply Idempotency Fixed";
  }
  if (includesAny(signalText, ["mcp api key", "api key authentication", "scoped api key", "api keys"])) {
    return "MCP API Key Authentication Added";
  }
  if (includesAny(signalText, ["context_load", "context smart", "context_smart", "handoff", "optimizer", "optimized context"])) {
    return "AI Context Handoff Improved";
  }
  if (includesAny(signalText, ["github webhook review queue", "review queue", "github webhook", "github sync"])) {
    return "GitHub Review Queue Added";
  }
  if (includesAny(signalText, ["version metadata", "version history", "changed section", "change preview"])) {
    return "Version History Improved";
  }
  if (includesAny(signalText, keywordGroups.security)) {
    return "Authentication/Security Context Updated";
  }
  if (includesAny(signalText, keywordGroups.github)) {
    return input.eventType === "pull_request" ? "GitHub Pull Request Context Updated" : "GitHub Sync Context Updated";
  }
  if (includesAny(signalText, keywordGroups.frontend)) {
    return "Dashboard Context Updated";
  }
  if (includesAny(signalText, keywordGroups.feature)) {
    return "Project Feature Context Updated";
  }
  if (includesAny(signalText, keywordGroups.fix)) {
    return "Project Issue Context Updated";
  }

  return input.eventType === "pull_request"
    ? `GitHub PR Review Needed: #${input.prNumber ?? "unknown"}`
    : `GitHub Push Review Needed: ${input.branch ?? "unknown branch"}`;
};

export const githubAnalysisService = {
  analyze(input: GitHubAnalysisInput): GitHubAnalysisResult {
    const signalText = [
      input.title,
      input.branch,
      input.diffSummary,
      ...input.commitMessages,
      fileHints(input.changedFiles)
    ].filter(Boolean).join(" ").toLowerCase();

    const sourceSummary = input.eventType === "push"
      ? sourceSummaryFor(input)
      : sourceSummaryFor(input);
    const suggestionTitle = titleFor(signalText, input);
    const matchedGroups = matchedGroupNames(signalText);

    const patch = {
      features: [] as string[],
      decisions: [] as string[],
      issues: [] as string[],
      dependencies: [] as string[],
      constraints: [] as string[],
      nextSteps: [] as string[],
      architectureNotes: [] as string[]
    };

    if (suggestionTitle === "MCP API Key Authentication Added") {
      patch.features.push("Added scoped MCP API key authentication for AI-tool access to Context Vault.");
      patch.decisions.push("MCP clients should authenticate using scoped API keys instead of login JWTs.");
      patch.constraints.push("MCP API keys must not bypass project ownership checks or directly mutate official ProjectContext.");
      patch.architectureNotes.push("MCP authentication connects AI tools to the same account-based Context Vault source of truth.");
      patch.nextSteps.push("Verify API key creation, revocation, scope enforcement, and MCP client access.");
    }

    if (suggestionTitle === "Suggestion Apply Idempotency Fixed") {
      patch.issues.push("Fixed duplicate suggestion apply behavior that could create repeated ContextVersion records.");
      patch.decisions.push("A ContextSuggestion can only be applied once, and no ContextVersion should be created when no ProjectContext changes are detected.");
      patch.constraints.push("Applying an already-applied or duplicate suggestion must not create a new version.");
      patch.architectureNotes.push("Suggestion apply flow now checks status and detects no-op patches before version creation.");
    }

    if (suggestionTitle === "AI Context Handoff Improved") {
      patch.features.push("Improved context_load output to return a structured AI-ready project handoff instead of a short summary.");
      patch.decisions.push("context_load should serve optimized full project context by default while raw context remains available only through raw mode.");
      patch.architectureNotes.push("Optimized context output separates stored ProjectContext from AI-ready loaded context.");
      patch.nextSteps.push("Verify context_load and context_smart outputs are useful as cross-AI continuation briefs.");
    }

    if (suggestionTitle === "GitHub Review Queue Added") {
      patch.features.push("Added GitHub webhook processing and review queue support for pending context suggestions.");
      patch.decisions.push("GitHub push and pull request events should create pending suggestions rather than directly mutating ProjectContext.");
      patch.architectureNotes.push("GitHub webhook events are stored as GitHubEvent records and converted into ContextSuggestion records for review.");
      patch.nextSteps.push("Verify GitHub push and pull request events appear in the dashboard review queue.");
    }

    if (suggestionTitle === "Version History Improved") {
      patch.features.push("Auto-generated readable version titles, summaries, changed section counts, and previews.");
      patch.decisions.push("Users should not manually write version change summaries.");
      patch.architectureNotes.push("Version metadata is generated by comparing previous and next ProjectContext state after an official change.");
    }

    if (includesAny(signalText, keywordGroups.feature) && patch.features.length === 0) {
      patch.features.push(`Added or improved project capability indicated by GitHub change: ${sourceSummary}.`);
    }

    if (includesAny(signalText, keywordGroups.fix) && patch.issues.length === 0) {
      patch.issues.push(`Fixed issue indicated by GitHub change: ${sourceSummary}.`);
    }

    if (includesAny(signalText, keywordGroups.architecture)) {
      patch.architectureNotes.push(`Architecture or backend structure changed based on GitHub change: ${sourceSummary}.`);
    }

    if (includesAny(signalText, keywordGroups.security) && suggestionTitle !== "MCP API Key Authentication Added") {
      patch.decisions.push("Authentication, authorization, or security behavior changed and should be reflected in project memory.");
      patch.constraints.push("Security-sensitive changes must preserve ownership checks, scope checks, secret handling, and ProjectContext mutation safety.");
      patch.architectureNotes.push(`Security-related GitHub change detected in ${input.repoOwner}/${input.repoName}.`);
    }

    if (includesAny(signalText, keywordGroups.mcpContext) && suggestionTitle !== "AI Context Handoff Improved") {
      patch.architectureNotes.push("GitHub change appears related to Context Vault memory, ProjectContext, suggestions, versioning, MCP, or AI handoff behavior.");
    }

    if (includesAny(signalText, keywordGroups.github) && suggestionTitle !== "GitHub Review Queue Added") {
      patch.decisions.push("GitHub changes should remain review-first and create pending ContextSuggestion records before official context updates.");
      patch.architectureNotes.push("GitHub sync behavior is part of the review queue and ContextSuggestion pipeline.");
    }

    if (includesAny(signalText, keywordGroups.frontend)) {
      patch.features.push("Updated dashboard or frontend workflow for reviewing and managing Context Vault project memory.");
      patch.architectureNotes.push("React dashboard remains the user-facing review/control layer for Context Vault.");
    }

    if (includesAny(signalText, keywordGroups.dependency)) {
      patch.dependencies.push(`Review dependency, package, SDK, Prisma migration, or schema change: ${sourceSummary}.`);
      patch.architectureNotes.push("Dependency or database-related GitHub change detected; verify setup and migration notes.");
    }

    if (includesAny(signalText, ["remove", "removed", "deprecate", "deprecated", "delete", "deleted"])) {
      patch.decisions.push(`Review removed or deprecated behavior from GitHub change: ${sourceSummary}.`);
      patch.nextSteps.push("Confirm whether removed/deprecated behavior should be reflected in Context Vault memory.");
    }

    if (includesAny(signalText, ["test", "spec", "coverage"])) {
      patch.nextSteps.push(`Review test coverage implications from GitHub change: ${sourceSummary}.`);
      patch.architectureNotes.push("Testing or coverage-related GitHub change detected.");
    }

    const changedFileSummary = summarizeFiles(input.changedFiles);
    if (changedFileSummary) {
      patch.architectureNotes.push(`Changed files observed without storing raw patches: ${changedFileSummary}.`);
    }

    if (input.eventType === "push") {
      patch.nextSteps.push(
        `Review GitHub push ${input.commitSha ?? "unknown sha"} on ${input.branch ?? "unknown branch"} and apply this suggestion only if it accurately reflects completed behavior, architecture, dependencies, known issues, or AI handoff instructions.`
      );
    } else if (input.merged) {
      patch.nextSteps.push(
        `Review merged PR #${input.prNumber}: ${input.title ?? "untitled"} and apply this context update if the merged changes are represented accurately.`
      );
    } else if (input.action === "closed") {
      patch.nextSteps.push(
        `Review closed PR #${input.prNumber}: ${input.title ?? "untitled"} before applying any project memory update.`
      );
    } else if (input.action === "synchronize") {
      patch.nextSteps.push(
        `Review updated PR #${input.prNumber}: ${input.title ?? "untitled"} because the pull request changes were synchronized.`
      );
    } else {
      patch.nextSteps.push(
        `Review PR #${input.prNumber}: ${input.title ?? "untitled"} before applying project memory changes.`
      );
    }

    const meaningfulSignals =
      patch.features.length +
      patch.decisions.length +
      patch.issues.length +
      patch.dependencies.length +
      patch.constraints.length +
      patch.architectureNotes.length;

    if (meaningfulSignals === 0) {
      patch.nextSteps.push("Review the GitHub change and apply a context update only if it affects product behavior, architecture, dependencies, known issues, or AI handoff instructions.");
    }

    const confidence: GitHubAnalysisResult["confidence"] = input.eventType === "pull_request" && input.merged
      ? "high"
      : input.eventType === "pull_request"
        ? "medium"
        : meaningfulSignals >= 5 ? "high" : meaningfulSignals >= 2 ? "medium" : "low";

    const reasoningSummary = [
      `Rule-based GitHub analysis used event type, action, branch, title, commit messages, and safe changed-file metadata for ${input.repoOwner}/${input.repoName}.`,
      matchedGroups.length > 0 ? `Matched categories: ${matchedGroups.join(", ")}.` : "No strong category matched; fallback review step generated.",
      input.eventType === "pull_request" && input.action ? `Pull request action: ${input.action}${input.merged ? " and merged" : ""}.` : "",
      `Confidence: ${confidence}.`
    ].filter(Boolean).join(" ");

    return {
      title: suggestionTitle,
      suggestionTitle,
      suggestedPatch: {
        features: unique(patch.features),
        decisions: unique(patch.decisions),
        issues: unique(patch.issues),
        dependencies: unique(patch.dependencies),
        constraints: unique(patch.constraints),
        nextSteps: unique(patch.nextSteps),
        architectureNotes: unique(patch.architectureNotes)
      },
      confidence,
      reasoningSummary
    };
  },

  toInputJsonObject(result: GitHubAnalysisResult): Prisma.InputJsonObject {
    return result.suggestedPatch as Prisma.InputJsonObject;
  }
};
