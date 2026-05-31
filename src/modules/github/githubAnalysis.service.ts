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

type PatchField = keyof GitHubAnalysisResult["suggestedPatch"];

type FileEvidence = {
  files: string[];
  frontendFiles: string[];
  backendFiles: string[];
  docsFiles: string[];
  packageFiles: string[];
  testFiles: string[];
  versionUiFiles: string[];
  backendVersionFiles: string[];
  landingFiles: string[];
  styleFiles: string[];
  githubFiles: string[];
  mcpFiles: string[];
  authFiles: string[];
  databaseFiles: string[];
};

const patchFields: PatchField[] = [
  "features",
  "decisions",
  "issues",
  "dependencies",
  "constraints",
  "nextSteps",
  "architectureNotes"
];

const includesAny = (text: string, terms: readonly string[]): boolean => {
  return terms.some((term) => text.includes(term));
};

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
};

const normalizePath = (filename: string): string => filename.trim().replace(/\\/g, "/").toLowerCase();

const fileEvidenceFor = (changedFiles: GitHubChangedFile[] | undefined): FileEvidence => {
  const files = (changedFiles ?? []).map((file) => normalizePath(file.filename)).filter(Boolean);
  const by = (predicate: (file: string) => boolean) => files.filter(predicate);

  return {
    files,
    frontendFiles: by((file) =>
      file.includes("/src/pages/") ||
      file.includes("/src/components/") ||
      file.includes("/src/routes/") ||
      file.startsWith("frontend/") ||
      file.startsWith("client/") ||
      file.startsWith("app/") ||
      file.endsWith(".tsx") ||
      file.endsWith(".jsx") ||
      file.endsWith(".css") ||
      file.endsWith(".scss") ||
      file.includes("tailwind.config")
    ),
    backendFiles: by((file) =>
      file.startsWith("src/") ||
      file.startsWith("server/") ||
      file.startsWith("backend/") ||
      file.includes("/api/") ||
      file.includes("/controllers/") ||
      file.includes("/services/") ||
      file.includes("/modules/")
    ),
    docsFiles: by((file) => file.startsWith("docs/") || file.endsWith(".md") || file.includes("/docs/")),
    packageFiles: by((file) => /(^|\/)(package|pnpm-lock|package-lock|yarn\.lock|bun\.lockb)(\.json)?$/.test(file)),
    testFiles: by((file) => file.includes(".test.") || file.includes(".spec.") || file.includes("/tests/") || file.includes("__tests__")),
    versionUiFiles: by((file) => includesAny(file, ["versionpage", "versionspage", "version-history", "versionhistory", "/versions", "timeline"])),
    backendVersionFiles: by((file) =>
      includesAny(file, ["versionmetadata", "version-metadata", "version.service", "/versions/"]) &&
      !file.startsWith("frontend/") &&
      !file.startsWith("client/") &&
      !file.endsWith(".tsx") &&
      !file.endsWith(".jsx") &&
      !file.endsWith(".css")
    ),
    landingFiles: by((file) => includesAny(file, ["landing", "home", "marketing"])),
    styleFiles: by((file) => file.endsWith(".css") || file.endsWith(".scss") || file.includes("tailwind.config")),
    githubFiles: by((file) => includesAny(file, ["github", "webhook"])),
    mcpFiles: by((file) => includesAny(file, ["mcp", "modelcontextprotocol"])),
    authFiles: by((file) => includesAny(file, ["auth", "jwt", "apikey", "api-key", "session"])),
    databaseFiles: by((file) => includesAny(file, ["prisma", "schema.prisma", "migration", "database"]))
  };
};

const sourceTextFor = (input: GitHubAnalysisInput): string => {
  return [
    input.title,
    input.branch,
    input.diffSummary,
    ...input.commitMessages
  ].filter(Boolean).join(" ").toLowerCase();
};

const firstMeaningfulCommit = (input: GitHubAnalysisInput): string => {
  return input.commitMessages.find((message) => message.trim().length > 0)?.trim() ?? input.title?.trim() ?? "GitHub change";
};

const subjectFromCommit = (message: string): string => {
  return message
    .replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const titleCase = (value: string): string => {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const titleFor = (input: GitHubAnalysisInput, evidence: FileEvidence, text: string): string => {
  if (evidence.versionUiFiles.length > 0 && evidence.landingFiles.length > 0) {
    return "Frontend Version History and Landing Pages Updated";
  }
  if (evidence.versionUiFiles.length > 0) {
    return "Frontend Version History UI Updated";
  }
  if (evidence.backendVersionFiles.length > 0 && includesAny(text, ["metadata", "summary", "summaries", "changed section", "preview"])) {
    return "Version Metadata Generation Updated";
  }
  if (evidence.landingFiles.length > 0) {
    return "Landing Page UI Updated";
  }
  if (evidence.githubFiles.length > 0) {
    return "GitHub Integration Updated";
  }
  if (evidence.mcpFiles.length > 0) {
    return "MCP Integration Updated";
  }
  if (evidence.authFiles.length > 0) {
    return "Authentication/Security Updated";
  }
  if (evidence.docsFiles.length > 0 && evidence.files.length === evidence.docsFiles.length) {
    return "Documentation Updated";
  }
  if (evidence.frontendFiles.length > 0 && evidence.backendFiles.length === 0) {
    return "Frontend UI Updated";
  }
  const subject = subjectFromCommit(firstMeaningfulCommit(input));
  return subject ? titleCase(subject).slice(0, 120) : "GitHub Context Update";
};

const addDependencyHints = (patch: GitHubAnalysisResult["suggestedPatch"], text: string, evidence: FileEvidence) => {
  if (evidence.packageFiles.length === 0) {
    return;
  }

  const knownDependencies: Array<[string, string]> = [
    ["react", "React"],
    ["vite", "Vite"],
    ["express", "Express"],
    ["prisma", "Prisma"],
    ["zod", "Zod"],
    ["jsonwebtoken", "JWT/jsonwebtoken"],
    ["bcrypt", "bcrypt"],
    ["@modelcontextprotocol/sdk", "MCP TypeScript SDK"],
    ["gemini", "Gemini API"],
    ["postgres", "PostgreSQL"]
  ];

  for (const [needle, label] of knownDependencies) {
    if (text.includes(needle)) {
      patch.dependencies.push(label);
    }
  }
};

const changedFileSummary = (evidence: FileEvidence): string | undefined => {
  if (evidence.files.length === 0) {
    return undefined;
  }
  return evidence.files.slice(0, 8).join(", ");
};

const isDocsOnly = (evidence: FileEvidence): boolean => {
  return evidence.files.length > 0 && evidence.files.length === evidence.docsFiles.length;
};

const isFrontendOnly = (evidence: FileEvidence): boolean => {
  return evidence.frontendFiles.length > 0 && evidence.backendFiles.length === 0;
};

const hasExplicitDecision = (text: string): boolean => {
  return includesAny(text, ["decision:", "decide", "adopt", "standardize", "make ", "must ", "should "]);
};

const hasExplicitConstraint = (text: string): boolean => {
  return includesAny(text, ["constraint:", "must not", "cannot", "can't", "only if", "required to"]);
};

const hasExplicitFollowUp = (text: string): boolean => {
  return includesAny(text, ["todo", "follow up", "follow-up", "next step", "later", "remaining"]);
};

const cleanPatch = (patch: GitHubAnalysisResult["suggestedPatch"]): GitHubAnalysisResult["suggestedPatch"] => {
  const blocked = [
    "review github push",
    "review pr #",
    "users should not manually write version change summaries",
    "version metadata is generated by comparing previous and next projectcontext state",
    "auto-generated readable version titles"
  ];

  const cleaned = { ...patch };
  for (const field of patchFields) {
    cleaned[field] = unique(patch[field]).filter((item) => !includesAny(item.toLowerCase(), blocked));
  }
  return cleaned;
};

export const githubAnalysisService = {
  analyze(input: GitHubAnalysisInput): GitHubAnalysisResult {
    const evidence = fileEvidenceFor(input.changedFiles);
    const text = sourceTextFor(input);
    const commitSubject = subjectFromCommit(firstMeaningfulCommit(input));

    const patch: GitHubAnalysisResult["suggestedPatch"] = {
      features: [],
      decisions: [],
      issues: [],
      dependencies: [],
      constraints: [],
      nextSteps: [],
      architectureNotes: []
    };

    if (evidence.versionUiFiles.length > 0) {
      patch.features.push("Added or updated frontend version history UI for browsing project memory versions.");
    }

    if (evidence.landingFiles.length > 0) {
      patch.features.push("Added or updated landing page UI and associated frontend styling.");
    }

    if (evidence.styleFiles.length > 0 && evidence.landingFiles.length === 0 && evidence.versionUiFiles.length === 0) {
      patch.features.push("Updated frontend styling for the user-facing interface.");
    }

    if (isFrontendOnly(evidence) && patch.features.length === 0) {
      patch.features.push(commitSubject
        ? `Updated frontend UI related to ${commitSubject}.`
        : "Updated frontend UI files.");
    }

    if (evidence.backendVersionFiles.length > 0 && includesAny(text, ["metadata", "summary", "summaries", "changed section", "preview"])) {
      patch.features.push("Updated backend version metadata generation for readable version history.");
      patch.architectureNotes.push("Backend version metadata logic derives readable version summaries from ProjectContext changes.");
    }

    if (evidence.githubFiles.length > 0) {
      patch.features.push("Updated GitHub integration behavior.");
      if (!isFrontendOnly(evidence)) {
        patch.architectureNotes.push("GitHub integration changes are handled through webhook/event processing and reviewable suggestions.");
      }
    }

    if (evidence.mcpFiles.length > 0) {
      patch.features.push("Updated MCP integration behavior.");
      if (!isFrontendOnly(evidence)) {
        patch.architectureNotes.push("MCP integration changes affect AI-tool access to project memory.");
      }
    }

    if (evidence.authFiles.length > 0) {
      patch.features.push("Updated authentication, session, or API key behavior.");
      if (hasExplicitConstraint(text)) {
        patch.constraints.push("Authentication and API key changes must preserve ownership and access-scope checks.");
      }
    }

    if (evidence.databaseFiles.length > 0) {
      patch.architectureNotes.push("Database, Prisma schema, or migration files changed.");
    }

    if (isDocsOnly(evidence)) {
      patch.features.push("Updated project documentation.");
    }

    if (includesAny(text, ["fix", "fixed", "resolve", "resolved", "bug"]) && patch.features.length === 0) {
      patch.features.push(commitSubject ? `Resolved issue related to ${commitSubject}.` : "Resolved an issue indicated by the GitHub change.");
    }

    if (isFrontendOnly(evidence) && (evidence.versionUiFiles.length > 0 || evidence.landingFiles.length > 0)) {
      patch.architectureNotes.push("Frontend includes landing and version-history pages as part of the React/Vite dashboard or public UI.");
    } else if (isFrontendOnly(evidence)) {
      patch.architectureNotes.push("Frontend UI files changed without backend, database, MCP, or GitHub webhook changes.");
    }

    if (hasExplicitDecision(text) && !isFrontendOnly(evidence)) {
      patch.decisions.push(`Durable decision indicated by GitHub change: ${commitSubject || "see GitHub event metadata"}.`);
    }

    if (hasExplicitConstraint(text) && !isFrontendOnly(evidence)) {
      patch.constraints.push(`Active constraint indicated by GitHub change: ${commitSubject || "see GitHub event metadata"}.`);
    }

    if (hasExplicitFollowUp(text)) {
      patch.nextSteps.push(`Follow-up indicated by GitHub change: ${commitSubject || "see GitHub event metadata"}.`);
    }

    addDependencyHints(patch, text, evidence);

    if (patch.features.length === 0 && patch.architectureNotes.length === 0 && !isDocsOnly(evidence)) {
      if (commitSubject && includesAny(text, ["feat:", "feature", "add ", "added ", "implement", "implemented", "introduce", "support", "enable"])) {
        patch.features.push(`Updated project capability related to ${commitSubject}.`);
      } else if (evidence.files.length > 0 && commitSubject) {
        patch.features.push(`Updated files related to ${commitSubject}.`);
      }
    }

    const cleanedPatch = cleanPatch(patch);
    const meaningfulSignals = patchFields.reduce((total, field) => total + cleanedPatch[field].length, 0);
    const title = titleFor(input, evidence, text);
    const confidence: GitHubAnalysisResult["confidence"] =
      evidence.files.length === 0
        ? "low"
        : meaningfulSignals >= 3
          ? "high"
          : meaningfulSignals >= 1
            ? "medium"
            : "low";

    const fileSummary = changedFileSummary(evidence);
    const matchedCategories = [
      evidence.frontendFiles.length > 0 ? "frontend" : undefined,
      evidence.versionUiFiles.length > 0 ? "version-ui" : undefined,
      evidence.backendVersionFiles.length > 0 ? "backend-version-metadata" : undefined,
      evidence.landingFiles.length > 0 ? "landing" : undefined,
      evidence.styleFiles.length > 0 ? "styles" : undefined,
      evidence.githubFiles.length > 0 ? "github" : undefined,
      evidence.mcpFiles.length > 0 ? "mcp" : undefined,
      evidence.authFiles.length > 0 ? "auth" : undefined,
      evidence.databaseFiles.length > 0 ? "database" : undefined,
      evidence.packageFiles.length > 0 ? "package" : undefined,
      evidence.docsFiles.length > 0 ? "docs" : undefined,
      evidence.testFiles.length > 0 ? "tests" : undefined
    ].filter((item): item is string => Boolean(item));

    const reasoningSummary = [
      `Evidence-bound GitHub analysis used ${input.eventType} metadata, commit messages, and changed file paths for ${input.repoOwner}/${input.repoName}.`,
      matchedCategories.length > 0 ? `Matched categories: ${matchedCategories.join(", ")}.` : "No strong file-path category matched.",
      fileSummary ? `Changed files: ${fileSummary}.` : "",
      `Unsupported sections were left empty. Confidence: ${confidence}.`
    ].filter(Boolean).join(" ");

    return {
      title,
      suggestionTitle: title,
      suggestedPatch: cleanedPatch,
      confidence,
      reasoningSummary
    };
  },

  toInputJsonObject(result: GitHubAnalysisResult): Prisma.InputJsonObject {
    return result.suggestedPatch as Prisma.InputJsonObject;
  }
};
