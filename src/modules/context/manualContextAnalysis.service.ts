import type { ProjectContext } from "@prisma/client";

type CaptureSource = "mcp" | "manual" | "cli" | "git_import";
type CaptureMode = "general_note" | "git_summary" | "release_note" | "session_summary";

type ManualContextAnalysisInput = {
  rawText: string;
  source?: CaptureSource;
  currentProjectContext?: ProjectContext;
  mode?: CaptureMode;
};

type ManualContextAnalysisResult = {
  title: string;
  suggestedPatch: {
    features: string[];
    decisions: string[];
    constraints: string[];
    issues: string[];
    dependencies: string[];
    nextSteps: string[];
    architectureNotes: string[];
    aiInstructions?: string;
  };
  confidence: "low" | "medium" | "high";
  reasoningSummary: string;
};

export type ContextAnalysisProvider = {
  analyze(input: ManualContextAnalysisInput): Promise<ManualContextAnalysisResult>;
};

const sentenceFragments = (rawText: string): string[] => {
  return rawText
    .split(/\r?\n|[.;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 20);
};

const includesAny = (text: string, terms: readonly string[]): boolean => {
  return terms.some((term) => text.includes(term));
};

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const cleaned = item.trim().replace(/\s+/g, " ");
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }

  return result;
};

const normalizeLazyNote = (text: string): string => {
  return text
    .replace(/^commit:\s*/i, "")
    .replace(/^diff:\s*/i, "")
    .replace(/\bwe\b/gi, "Context Vault")
    .trim();
};

const hasCompletedWork = (text: string): boolean => {
  return includesAny(text, ["add", "added", "implemented", "built", "done", "works", "fixed", "created", "updated"]);
};

const titleFor = (text: string, mode: CaptureMode): string => {
  if (includesAny(text, ["duplicate apply", "duplicate suggestion", "no-op", "no changes", "another version"])) {
    return "Suggestion Apply Idempotency Captured";
  }
  if (includesAny(text, ["context_load", "context load", "handoff", "optimized ai handoff", "summary"])) {
    return "AI Context Handoff Captured";
  }
  if (includesAny(text, ["mcp api key", "api key", "jwt", "auth", "authentication"])) {
    return "MCP Authentication Context Captured";
  }
  if (includesAny(text, ["github", "webhook", "pr", "pull request", "review queue", "commit"])) {
    return "GitHub Sync Context Captured";
  }
  if (includesAny(text, ["dashboard", "frontend", "page", "ui", "copy"])) {
    return "Dashboard Context Captured";
  }
  if (mode === "git_summary") {
    return "Git Summary Context Captured";
  }
  if (mode === "release_note") {
    return "Release Note Context Captured";
  }
  if (mode === "session_summary") {
    return "Session Summary Context Captured";
  }
  return "Manual Context Captured";
};

const featureFrom = (fragment: string): string => {
  const note = normalizeLazyNote(fragment);
  if (includesAny(note.toLowerCase(), ["mcp api key", "api key auth", "api key authentication"])) {
    return "Added scoped MCP API key authentication for Context Vault AI-tool access.";
  }
  if (includesAny(note.toLowerCase(), ["context_load", "context load", "handoff"])) {
    return "Improved context_load to return a full optimized AI handoff instead of a short summary.";
  }
  if (includesAny(note.toLowerCase(), ["dashboard", "frontend", "page", "ui"])) {
    return `Updated dashboard workflow: ${note}.`;
  }
  if (includesAny(note.toLowerCase(), ["backend endpoint", "api route", "endpoint added", "route added"])) {
    return `Added backend API capability: ${note}.`;
  }
  if (includesAny(note.toLowerCase(), ["mcp tool", "tool added"])) {
    return `Added MCP tool capability: ${note}.`;
  }
  if (includesAny(note.toLowerCase(), ["dashboard form", "frontend form", "capture form"])) {
    return `Added dashboard capture workflow: ${note}.`;
  }
  if (includesAny(note.toLowerCase(), ["github", "webhook", "review queue"])) {
    return `Added or improved GitHub review workflow: ${note}.`;
  }
  return `Added or improved project capability: ${note}.`;
};

const issueFrom = (fragment: string): string => {
  const note = normalizeLazyNote(fragment);
  if (includesAny(note.toLowerCase(), ["duplicate apply", "another version", "duplicate suggestion"])) {
    return "Fixed duplicate suggestion apply behavior that could create repeated ContextVersion records.";
  }
  return `Fixed or addressed issue: ${note}.`;
};

export const manualContextAnalysisService = {
  analyzeManualContextInput(input: ManualContextAnalysisInput): ManualContextAnalysisResult {
    const rawText = input.rawText.trim();
    const lowered = rawText.toLowerCase();
    const mode = input.mode ?? "general_note";
    const fragments = sentenceFragments(rawText);

    const patch: ManualContextAnalysisResult["suggestedPatch"] = {
      features: [],
      decisions: [],
      constraints: [],
      issues: [],
      dependencies: [],
      nextSteps: [],
      architectureNotes: []
    };

    for (const fragment of fragments) {
      const text = fragment.toLowerCase();

      if (includesAny(text, ["add", "added", "implemented", "built", "create", "created", "done", "works", "support", "updated"])) {
        patch.features.push(featureFrom(fragment));
      }

      if (includesAny(text, ["fixed", "fix", "bug", "error", "issue", "failing", "broken"])) {
        patch.issues.push(issueFrom(fragment));
      }

      if (includesAny(text, ["verified", "build passes", "tests pass", "build passed", "tested"])) {
        patch.architectureNotes.push(`Verification captured from implementation summary: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["no projectcontext mutation", "does not mutate projectcontext", "pending only", "review only", "review-first"])) {
        patch.decisions.push("Manual and automatic context capture should create pending suggestions only.");
        patch.constraints.push("Context capture must not directly mutate official ProjectContext or create ContextVersion records.");
      }

      if (includesAny(text, ["backend endpoint", "api route", "endpoint added", "route added"])) {
        patch.architectureNotes.push(`Backend API surface changed: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["mcp tool", "tool added"])) {
        patch.architectureNotes.push(`MCP tool surface changed: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["dashboard form", "frontend form", "page added", "form added"])) {
        patch.architectureNotes.push(`Dashboard workflow changed: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["decided", "should", "must"])) {
        patch.decisions.push(`Decision captured from manual context: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["never", "must not", "cannot", "should not"])) {
        patch.constraints.push(`Constraint captured from manual context: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["next", "later", "todo", "need to"])) {
        patch.nextSteps.push(`Follow-up captured from manual context: ${normalizeLazyNote(fragment)}.`);
      }

      if (includesAny(text, ["package", "dependency", "install", "sdk", "prisma", "migration"])) {
        patch.dependencies.push(`Review dependency or migration change: ${normalizeLazyNote(fragment)}.`);
      }
    }

    if (includesAny(lowered, ["api key", "jwt", "auth", "authentication", "security", "ownership"])) {
      patch.decisions.push("Authentication and API key behavior should be represented in project memory.");
      patch.constraints.push("Authentication changes must preserve ownership checks, scope checks, and safe secret handling.");
      patch.architectureNotes.push("Authentication connects users and AI tools to the same account-based Context Vault memory.");
    }

    if (includesAny(lowered, ["mcp", "context_load", "context load", "context_smart", "context_versions", "context_capture", "handoff", "skill", "plugin"])) {
      patch.architectureNotes.push("MCP tools are the AI-tool access layer for loading, searching, and proposing Context Vault memory updates.");
      if (hasCompletedWork(lowered) && patch.features.length === 0) {
        patch.features.push("Improved MCP-based Context Vault memory workflow for AI-tool continuity.");
      }
    }

    if (includesAny(lowered, ["github", "webhook", "pr", "pull request", "commit", "review queue"])) {
      patch.architectureNotes.push("GitHub changes should flow into pending ContextSuggestion records for review before official memory changes.");
    }

    if (includesAny(lowered, ["duplicate apply", "applied suggestions", "another version", "duplicate version", "no-op"])) {
      patch.decisions.push("A ContextSuggestion should not create another ContextVersion after it has already been applied.");
      patch.constraints.push("Applying an already-applied or no-op suggestion must not create a duplicate version.");
    }

    if (includesAny(lowered, ["dashboard", "frontend", "page", "ui", "copy"])) {
      patch.architectureNotes.push("The React dashboard is the user-facing review and control layer for Context Vault.");
    }

    if (patch.features.length === 0 && patch.issues.length === 0 && patch.decisions.length === 0 && patch.architectureNotes.length === 0) {
      patch.nextSteps.push(`Review manual context note and apply only if it accurately affects project memory: ${rawText}.`);
    }

    const signalCount = Object.values(patch).reduce((count, value) => count + (Array.isArray(value) ? value.length : 0), 0);
    const confidence: ManualContextAnalysisResult["confidence"] = signalCount >= 5 ? "high" : signalCount >= 2 ? "medium" : "low";

    return {
      title: titleFor(lowered, mode),
      suggestedPatch: {
        features: unique(patch.features),
        decisions: unique(patch.decisions),
        constraints: unique(patch.constraints),
        issues: unique(patch.issues),
        dependencies: unique(patch.dependencies),
        nextSteps: unique(patch.nextSteps),
        architectureNotes: unique(patch.architectureNotes),
        ...(patch.aiInstructions ? { aiInstructions: patch.aiInstructions } : {})
      },
      confidence,
      reasoningSummary: `Rule-based manual context capture converted messy ${mode} input into a pending structured suggestion. Detected ${signalCount} signal(s). Confidence: ${confidence}. No official ProjectContext mutation was performed.`
    };
  }
};
