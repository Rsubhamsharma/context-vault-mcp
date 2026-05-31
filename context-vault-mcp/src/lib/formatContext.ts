import { z } from "zod";
import { env } from "../config/env.js";
import type { HistoricalContextVersion, OptimizedContextResponse, ProjectContext } from "./contextVaultClient.js";

const toTextItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string" ? item : JSON.stringify(item)
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${JSON.stringify(item)}`);
  }

  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  return [];
};

const section = (title: string, value: unknown): string => {
  const items = toTextItems(value);
  if (items.length === 0) {
    return `## ${title}\n- None recorded`;
  }
  return `## ${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
};

export const formatFullContext = (context: ProjectContext): string => {
  return [
    "# Context Vault Project Context",
    `Current version: ${context.currentVersionNumber}`,
    "",
    "## Project Goal",
    context.goal || "None recorded",
    "",
    section("Tech Stack", context.techStack),
    "",
    section("Features", context.features),
    "",
    section("Decisions", context.decisions),
    "",
    section("Constraints", context.constraints),
    "",
    section("Issues", context.issues),
    "",
    section("Dependencies", context.dependencies),
    "",
    section("Next Steps", context.nextSteps),
    "",
    section("Architecture Notes", context.architectureNotes),
    "",
    "## AI Instructions",
    context.aiInstructions || "None recorded"
  ].join("\n");
};

export const formatOptimizedContext = (result: OptimizedContextResponse): string => {
  if (result.rawContext) {
    return [
      "# Context Vault Raw Project Context",
      "This is raw/unoptimized stored ProjectContext.",
      "",
      formatFullContext(result.rawContext)
    ].join("\n");
  }

  const context = result.optimizedContext;
  if (!context) {
    return "Context Vault optimized context was not available.";
  }

  return [
    "# Context Vault Optimized Project Context",
    `Current version: ${context.currentVersionNumber}`,
    "",
    "## Optimization",
    result.optimizationSummary,
    `Original token estimate: ${result.originalTokenEstimate}`,
    `Optimized token estimate: ${result.tokenEstimate}`,
    `Estimated savings: ${result.estimatedSavingsPercent}%`,
    "",
    "## Project Goal",
    context.goal || "None recorded",
    "",
    section("Tech Stack", context.techStack),
    "",
    section("Features", context.features),
    "",
    section("Decisions", context.decisions),
    "",
    section("Constraints", context.constraints),
    "",
    section("Issues", context.issues),
    "",
    section("Dependencies", context.dependencies),
    "",
    section("Next Steps", context.nextSteps),
    "",
    section("Architecture Notes", context.architectureNotes),
    "",
    "## AI Instructions",
    context.aiInstructions || "None recorded"
  ].join("\n");
};

export const formatHistoricalContext = (version: HistoricalContextVersion): string => {
  const snapshot = version.snapshot && typeof version.snapshot === "object" && !Array.isArray(version.snapshot)
    ? version.snapshot as Record<string, unknown>
    : {};

  return [
    "# Context Vault Historical Context",
    `Version: ${version.versionNumber}`,
    `Source: ${version.source}`,
    `Created: ${version.createdAt}`,
    `Change Summary: ${version.changeSummary}`,
    "",
    "This is a historical version. For the latest source of truth, use context_load.",
    "",
    "## Project Goal",
    typeof snapshot.goal === "string" && snapshot.goal ? snapshot.goal : "None recorded",
    "",
    section("Tech Stack", snapshot.techStack),
    "",
    section("Features", snapshot.features),
    "",
    section("Decisions", snapshot.decisions),
    "",
    section("Constraints", snapshot.constraints),
    "",
    section("Issues", snapshot.issues),
    "",
    section("Dependencies", snapshot.dependencies),
    "",
    section("Next Steps", snapshot.nextSteps),
    "",
    section("Architecture Notes", snapshot.architectureNotes),
    "",
    "## AI Instructions",
    typeof snapshot.aiInstructions === "string" && snapshot.aiInstructions ? snapshot.aiInstructions : "None recorded"
  ].join("\n");
};

export type SearchResult = {
  section: string;
  matches: string[];
};

const searchableSections = (context: ProjectContext): Array<[string, unknown]> => [
  ["Project Goal", context.goal],
  ["Tech Stack", context.techStack],
  ["Features", context.features],
  ["Decisions", context.decisions],
  ["Constraints", context.constraints],
  ["Issues", context.issues],
  ["Dependencies", context.dependencies],
  ["Next Steps", context.nextSteps],
  ["Architecture Notes", context.architectureNotes],
  ["AI Instructions", context.aiInstructions]
];

const keywordSet = (input: string): Set<string> => {
  const words = input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  return new Set(words);
};

const matchesKeywords = (value: string, keywords: Set<string>): boolean => {
  const lowered = value.toLowerCase();
  return [...keywords].some((keyword) => lowered.includes(keyword));
};

export const searchContext = (context: ProjectContext, query: string): SearchResult[] => {
  const keywords = keywordSet(query);
  if (keywords.size === 0) {
    return [];
  }

  return searchableSections(context)
    .map(([name, value]) => ({
      section: name,
      matches: toTextItems(value).filter((item) => matchesKeywords(item, keywords))
    }))
    .filter((result) => result.matches.length > 0);
};

export const formatSearchResults = (
  query: string,
  context: ProjectContext,
  results: SearchResult[]
): string => {
  if (results.length === 0) {
    return [
      "# Context Vault Search",
      `Query: ${query}`,
      `Current version: ${context.currentVersionNumber}`,
      "",
      "No matching context sections found."
    ].join("\n");
  }

  return [
    "# Context Vault Search",
    `Query: ${query}`,
    `Current version: ${context.currentVersionNumber}`,
    "",
    ...results.map((result) => [
      `## ${result.section}`,
      result.matches.map((match) => `- ${match}`).join("\n")
    ].join("\n\n"))
  ].join("\n\n");
};

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export const filterRelevantItems = (items: unknown, task: string): string[] => {
  const keywords = keywordSet(task);
  if (keywords.size === 0) {
    return [];
  }
  return toTextItems(items).filter((item) => matchesKeywords(item, keywords));
};

export const formatSmartContext = (context: ProjectContext, task: string): string => {
  const relevantFeatures = filterRelevantItems(context.features, task);
  const relevantDecisions = filterRelevantItems(context.decisions, task);
  const relevantIssues = filterRelevantItems(context.issues, task);
  const relevantArchitectureNotes = filterRelevantItems(context.architectureNotes, task);
  const relevantNextSteps = filterRelevantItems(context.nextSteps, task);

  const body = [
    "# Context Vault Smart Context",
    `Task: ${task}`,
    `Current version: ${context.currentVersionNumber}`,
    "",
    "## Project Goal",
    context.goal || "None recorded",
    "",
    section("Relevant Tech Stack", context.techStack),
    "",
    section("Mandatory Constraints", context.constraints),
    "",
    section("Relevant Features", relevantFeatures),
    "",
    section("Relevant Decisions", relevantDecisions),
    "",
    section("Relevant Issues", relevantIssues),
    "",
    section("Relevant Architecture Notes", relevantArchitectureNotes),
    "",
    section("Relevant Next Steps", relevantNextSteps),
    "",
    "## AI Instructions",
    context.aiInstructions || "None recorded"
  ].join("\n");

  const fullContext = formatFullContext(context);
  const smartTokens = estimateTokens(body);
  const fullTokens = estimateTokens(fullContext);
  const savings = fullTokens > 0 ? Math.max(0, Math.round((1 - smartTokens / fullTokens) * 100)) : 0;

  return [
    body,
    "",
    "## Token Estimate",
    `Approximate tokens: ${smartTokens}`,
    `Approximate savings vs full context: ${savings}%`
  ].join("\n");
};

type DetailLevel = "compact" | "standard" | "detailed";
type CompressionLevel = "standard" | "aggressive" | "ultra";

const includesAny = (text: string, terms: string[]): boolean => {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
};

const takeByDetail = (items: string[], detailLevel: DetailLevel): string[] => {
  const limit = detailLevel === "compact" ? 7 : detailLevel === "detailed" ? 28 : 18;
  return items.slice(0, limit);
};

const bullets = (items: string[], fallback = "None recorded"): string => {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
};

const withoutNormalized = (items: string[], blocked: string[]): string[] => {
  const blockedSet = new Set(blocked.map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
  return items.filter((item) => !blockedSet.has(item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
};

const filterNoiseContaining = (items: string[], blockedFragments: string[]): string[] => {
  return items.filter((item) => {
    const normalized = item.toLowerCase();
    return !blockedFragments.some((fragment) => normalized.includes(fragment));
  });
};

const optimizedNoiseFragments = [
  "need api tests later",
  "review github push",
  "context service is ready for future mcp integration",
  "github push was detected from repository",
  "create suggestion",
  "apply suggestion",
  "check versions",
  "verify suggestion lifecycle",
  "inspect version history",
  "add api key auth for mcp clients later"
];

const filterOptimizedNoise = (items: string[]): string[] => {
  return filterNoiseContaining(items, optimizedNoiseFragments);
};

const relevantItems = (items: unknown, task: string, detailLevel: DetailLevel): string[] => {
  const all = toTextItems(items);
  const matched = filterRelevantItems(all, task);
  return takeByDetail(matched.length > 0 ? matched : all, detailLevel);
};

const architectureFlowForTask = (task: string): string[] => {
  const flows: string[] = [];
  if (includesAny(task, ["github", "queue", "webhook", "review", "suggestion"])) {
    flows.push(
      "GitHub webhook receives push or pull_request events.",
      "Backend stores safe event metadata in GitHubEvent.",
      "GitHub analysis creates a pending ContextSuggestion instead of mutating ProjectContext.",
      "Dashboard Suggestions / Review Queue shows pending suggestions with source, confidence, reasoning, and patch groups.",
      "User explicitly applies or rejects each suggestion.",
      "Applying a suggestion merges into ProjectContext and creates a full ContextVersion snapshot.",
      "MCP context_load and context_smart read the latest cumulative ProjectContext."
    );
  }
  if (includesAny(task, ["mcp", "api key", "cursor", "claude", "codex", "windsurf"])) {
    flows.push(
      "AI tool launches the local Context Vault MCP stdio server.",
      "MCP server authenticates to the backend with a scoped Context Vault API key.",
      "Backend verifies API key scope and project ownership.",
      "MCP tools fetch ProjectContext, versions, search results, or create pending suggestions.",
      "API keys can read context and create suggestions, but cannot directly mutate official ProjectContext."
    );
  }
  if (includesAny(task, ["context", "version", "snapshot", "apply", "merge"])) {
    flows.push(
      "ProjectContext stores the latest official cumulative memory.",
      "ContextSuggestion stores proposed patches from manual, MCP, cleanup, AI, or GitHub sources.",
      "Apply merges suggestion patches into ProjectContext by default.",
      "Reject leaves ProjectContext unchanged.",
      "ContextVersion stores immutable full snapshots after each official context change."
    );
  }
  return flows.length > 0 ? flows : [
    "Backend owns project memory, auth, ownership checks, suggestions, versions, and integrations.",
    "Dashboard is the user control layer for context review and setup.",
    "MCP is the AI-tool access layer for loading and suggesting context updates."
  ];
};

const backendFrontendAreasForTask = (task: string): string[] => {
  const areas = new Set<string>();
  if (includesAny(task, ["github", "queue", "webhook", "review"])) {
    [
      "Backend GitHub webhook module",
      "GitHubAnalysisService / rule-based analysis",
      "GitHubEvent persistence",
      "ContextSuggestion service and apply/reject flow",
      "Version metadata and ContextVersion snapshot creation",
      "Frontend Suggestions / Review Queue page",
      "Frontend GitHub setup/events page"
    ].forEach((area) => areas.add(area));
  }
  if (includesAny(task, ["mcp", "context_smart", "context_load", "codex"])) {
    [
      "context-vault-mcp tool definitions",
      "MCP context_smart formatter",
      "MCP API key auth middleware",
      "Backend optimized context endpoint"
    ].forEach((area) => areas.add(area));
  }
  if (includesAny(task, ["context", "version", "merge"])) {
    [
      "Context service merge logic",
      "ContextVersion service",
      "ProjectContext optimizer"
    ].forEach((area) => areas.add(area));
  }
  return [...areas];
};

const implementationDirectionForTask = (task: string): string[] => {
  if (includesAny(task, ["github", "queue", "webhook", "review"])) {
    return [
      "Build or improve deterministic GitHubAnalysisService rules before adding any AI provider.",
      "Classify commit messages, PR titles, branch names, and safe changed-file metadata into features, issues, decisions, constraints, dependencies, architectureNotes, and nextSteps.",
      "Generate meaningful ContextSuggestion patches that are reviewable in the dashboard.",
      "Generate readable version metadata automatically when suggestions are applied.",
      "Keep the mutation path review-first: GitHub events must never directly mutate ProjectContext.",
      "Keep raw payloads, secrets, and raw patches out of logs and stored metadata."
    ];
  }
  return [
    "Preserve ProjectContext as cumulative source of truth.",
    "Keep suggestions pending until explicit user apply.",
    "Create full ContextVersion snapshots after official context changes.",
    "Keep MCP API key access scoped and ownership-checked."
  ];
};

const coreProductPromise = [
  "Context Vault is a persistent, account-based context store for AI-assisted development.",
  "GitHub stores the codebase. Context Vault stores AI-readable project memory.",
  "Users can switch AI tools, install the MCP or a future skill/plugin, authenticate with the same account/API key, and load the same project context without starting from scratch.",
  "The MCP server is the AI-tool access layer. The web dashboard is the review and control layer.",
  "Suggestions are review-first: AI, MCP, GitHub, and cleanup suggestions must not auto-apply."
].join(" ");

const systemArchitecture = (context: NonNullable<OptimizedContextResponse["optimizedContext"]>, detailLevel: DetailLevel): string[] => {
  return takeByDetail([
    "Backend source of truth: Express/TypeScript API owns auth, project ownership, ProjectContext, ContextVersion, ContextSuggestion, API keys, GitHub connections, and webhooks.",
    "Database models include User, Project, ProjectContext, ContextVersion, ContextSuggestion, ApiKey, McpSession, GitHubConnection, and GitHubEvent.",
    "ProjectContext stores the latest official cumulative project memory.",
    "ContextVersion stores immutable full snapshots after every official ProjectContext change.",
    "ContextSuggestion stores pending proposed updates from dashboard, MCP, GitHub, AI, or cleanup workflows.",
    "MCP server is a standalone stdio API bridge that authenticates with scoped API keys and exposes context tools to Codex, Cursor, Claude Desktop, Windsurf, Claude Code, and similar clients.",
    "React dashboard lets users manage projects, inspect context, review suggestions, inspect versions, configure GitHub, and create/revoke MCP API keys.",
    "GitHub sync receives webhook events, stores safe GitHubEvent metadata, and creates pending ContextSuggestion records.",
    "Future skill/plugin layer should authenticate to the same backend account and reuse the same ProjectContext source of truth.",
    `Current optimized context has ${context.features.length} features, ${context.decisions.length} decisions, ${context.constraints.length} active constraints, and ${context.architectureNotes.length} architecture notes.`
  ], detailLevel);
};

const workingFlow = [
  "User creates a project.",
  "ProjectContext stores official AI-readable memory.",
  "GitHub, MCP, dashboard, or future AI actions create ContextSuggestion records.",
  "User reviews suggestions in the dashboard review queue.",
  "User applies or rejects each suggestion.",
  "Apply merges suggestion data cumulatively into ProjectContext.",
  "ContextVersion stores a full immutable snapshot after the official change.",
  "Any AI tool calls context_load through MCP.",
  "The AI receives optimized latest project context as a working handoff."
];

type SemanticStats = {
  removedDuplicateCount: number;
  mergedRelatedItemCount: number;
  removedStaleResolvedItemCount: number;
};

const newSemanticStats = (): SemanticStats => ({
  removedDuplicateCount: 0,
  mergedRelatedItemCount: 0,
  removedStaleResolvedItemCount: 0
});

const semanticKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const wordOverlap = (left: string, right: string): number => {
  const leftWords = new Set(semanticKey(left).split(" ").filter((word) => word.length >= 4));
  const rightWords = new Set(semanticKey(right).split(" ").filter((word) => word.length >= 4));
  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  return intersection / Math.max(leftWords.size, rightWords.size);
};

const staleResolvedPrefixes = [
  "fixed or addressed issue",
  "implementation summary",
  "verification captured",
  "capture mode"
];

const staleResolvedFragments = [
  "review github push",
  "abc123postmantest",
  "smartgithub001",
  "14737f810afcf6c1d706d236c1d4d40c5156ea97",
  "f5e66921f7568b900d8055b7361c61887bce0772",
  "need api tests later",
  "manual github webhook setup is acceptable for mvp",
  "old temporary github setup debugging"
];

const isStaleResolvedNoise = (item: string): boolean => {
  const key = semanticKey(item);
  return staleResolvedPrefixes.some((prefix) => key.startsWith(prefix)) ||
    staleResolvedFragments.some((fragment) => key.includes(fragment));
};

const compactItems = (items: string[], stats: SemanticStats): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const rawItem of items) {
    const item = rawItem.replace(/\s+/g, " ").trim();
    if (!item) {
      continue;
    }
    if (isStaleResolvedNoise(item)) {
      stats.removedStaleResolvedItemCount += 1;
      continue;
    }
    const key = semanticKey(item);
    if (!key || seen.has(key) || result.some((existing) => wordOverlap(existing, item) >= 0.82)) {
      stats.removedDuplicateCount += 1;
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
};

const countRelatedMerges = (items: string[], stats: SemanticStats): void => {
  const groups = [
    ["source of truth", ["source of truth", "projectcontext", "official", "cumulative", "github stores code", "ai readable"]],
    ["review first", ["auto apply", "review", "apply", "reject", "pending", "suggestion"]],
    ["api keys", ["api key", "scoped", "hash", "ownership", "mutate official"]],
    ["github", ["github", "webhook", "githubevent", "github app", "repository"]],
    ["mcp", ["mcp", "context load", "context smart", "ai tool", "stdio"]],
    ["versions", ["version", "snapshot", "contextversion", "duplicate", "no op"]],
    ["auth", ["auth", "jwt", "login", "ownership"]],
    ["ui", ["dashboard", "react", "vite", "frontend", "page"]]
  ] as const;
  const normalizedItems = items.map(semanticKey);
  for (const [, terms] of groups) {
    const matches = normalizedItems.filter((item) => terms.some((term) => item.includes(semanticKey(term))));
    if (matches.length > 1) {
      stats.mergedRelatedItemCount += matches.length - 1;
    }
  }
};

const compactAllContextItems = (
  context: NonNullable<OptimizedContextResponse["optimizedContext"]>,
  stats: SemanticStats
): string[] => {
  const compacted = compactItems([
    context.goal,
    ...context.techStack,
    ...context.features,
    ...context.decisions,
    ...context.constraints,
    ...context.issues,
    ...context.dependencies,
    ...context.nextSteps,
    ...context.architectureNotes,
    context.aiInstructions
  ], stats);
  countRelatedMerges(compacted, stats);
  return compacted;
};

const hasSignal = (items: string[], terms: string[]): boolean => {
  const text = semanticKey(items.join(" "));
  return terms.some((term) => text.includes(semanticKey(term)));
};

const compactLimit = (compression: CompressionLevel, aggressiveLimit: number, ultraLimit: number): number =>
  compression === "ultra" ? ultraLimit : aggressiveLimit;

const compactSection = (items: string[], limit: number): string[] => items.slice(0, limit);

const buildStackBullet = (context: NonNullable<OptimizedContextResponse["optimizedContext"]>): string => {
  const stack = new Set([...context.techStack, ...context.dependencies].map(semanticKey));
  const has = (name: string) => [...stack].some((item) => item.includes(semanticKey(name)));
  const backend = [
    has("node") ? "Node.js" : null,
    has("express") ? "Express" : null,
    "TypeScript",
    has("prisma") ? "Prisma" : null,
    has("postgres") ? "PostgreSQL" : null,
    has("zod") ? "Zod" : null,
    has("jwt") ? "JWT" : null,
    has("bcrypt") ? "bcrypt" : null
  ].filter(Boolean).join(", ");
  const frontend = [has("react") ? "React" : null, has("vite") ? "Vite" : null, "TypeScript"].filter(Boolean).join(", ");
  return `Stack: backend ${backend}; frontend ${frontend}; integrations MCP TypeScript SDK, GitHub App/Webhooks, scoped API keys.`;
};

const buildCapabilities = (
  context: NonNullable<OptimizedContextResponse["optimizedContext"]>,
  compression: CompressionLevel
): string[] => {
  const signals = compactItems([...context.features, ...context.architectureNotes], newSemanticStats());
  const capabilities = [
    "Auth, project management, official ProjectContext storage, cumulative merge behavior, suggestions, and immutable version history.",
    "Scoped MCP API key creation, listing, revocation, and MCP access to context tools.",
    "Standalone MCP stdio server exposes context_health_check, context_load, context_smart, context_search, context_versions, context_load_version, and suggestion/capture tools.",
    "GitHub App/webhook foundation stores GitHubEvent metadata and creates reviewable ContextSuggestions.",
    "React/Vite dashboard covers projects, context, suggestions, versions, GitHub setup, API keys, MCP setup, and docs.",
    "Version metadata and duplicate/no-op suggestion protection are implemented.",
    "GitHub suggestion refinement can use deterministic analysis and optional Gemini refinement with safe fallback.",
    "Optimized context export supports semantic compression levels for MCP handoffs."
  ];
  if (!hasSignal(signals, ["gemini", "refinement"])) {
    capabilities.splice(6, 1);
  }
  return compactSection(capabilities, compactLimit(compression, 8, 5));
};

const buildGaps = (
  context: NonNullable<OptimizedContextResponse["optimizedContext"]>,
  stats: SemanticStats,
  compression: CompressionLevel
): string[] => {
  const useful = compactItems([...context.issues, ...context.nextSteps], stats);
  const gaps = [
    hasSignal(useful, ["smart github", "github suggestion"]) ? "Improve smart GitHub suggestion quality beyond generic placeholder suggestions." : null,
    hasSignal(useful, ["context smart", "handoff"]) ? "Improve context_smart task-specific handoff output." : null,
    hasSignal(useful, ["demo", "screenshots", "presentation"]) ? "Polish demo data, fallback screenshots, recorded flow, and presentation path." : null,
    hasSignal(useful, ["api key", "revocation", "scope"]) ? "Verify API key creation, revocation, scope enforcement, and MCP client access." : null,
    hasSignal(useful, ["optimizer skill", "plugin"]) ? "Later: build Context Optimizer skill/plugin for token-efficient memory workflows." : null,
    hasSignal(useful, ["github app", "repository mapping"]) ? "Later: continue hardening GitHub App installation and repository mapping flows." : null
  ].filter((item): item is string => Boolean(item));
  return compactSection(gaps.length > 0 ? gaps : ["Continue improving MCP handoff quality, GitHub suggestion quality, and demo readiness."], compactLimit(compression, 5, 3));
};

const buildActiveConstraints = (
  context: NonNullable<OptimizedContextResponse["optimizedContext"]>,
  stats: SemanticStats,
  compression: CompressionLevel
): string[] => {
  const constraints = compactItems(context.constraints, stats);
  const merged = [
    "Never auto-apply GitHub, MCP, AI, or cleanup suggestions; official memory changes require explicit review/apply or authorized manual update.",
    "Every meaningful official ProjectContext change creates one immutable ContextVersion snapshot; duplicate, already-applied, or no-op suggestions must not create versions.",
    "MCP context output must remain complete enough for cross-AI continuity while preserving ProjectContext as cumulative source of truth.",
    "Scoped API keys must enforce project ownership, show raw values only once, store only hashes, and never directly mutate official ProjectContext.",
    "GitHub webhook handling must avoid storing/logging secrets or full sensitive payloads.",
    "Do not change storage, auth, suggestion/version behavior, dashboard UI, or MCP tool names when improving optimized output."
  ];
  const extra = constraints.filter((item) =>
    !hasSignal([item], ["auto apply", "version", "api key", "ownership", "hash", "webhook", "secret", "projectcontext", "mcp"])
  );
  return compactSection([...merged, ...extra], compactLimit(compression, 8, 5));
};

const buildSemanticHandoffBody = (
  result: OptimizedContextResponse,
  compression: Exclude<CompressionLevel, "standard">,
  stats: SemanticStats
): string => {
  const context = result.optimizedContext;
  if (!context) {
    return "Context Vault optimized context was not available.";
  }

  compactAllContextItems(context, stats);
  const architecture = [
    buildStackBullet(context),
    "Backend owns JWT auth, project ownership checks, ProjectContext, ContextSuggestion, ContextVersion, API keys, GitHub connections, and webhooks.",
    "ProjectContext is the latest official cumulative memory; ContextVersion stores immutable full snapshots; ContextSuggestion stores pending proposed patches.",
    "MCP stdio server authenticates with scoped API keys and exposes context tools to Codex, Cursor, Claude Desktop, Windsurf, Claude Code, and similar clients.",
    "Dashboard is the user review/control layer for projects, context, suggestions, versions, GitHub setup, MCP setup, docs, and API keys.",
    "GitHub App/webhooks create GitHubEvent records and pending ContextSuggestions; connected repo UX and install redirects are implemented."
  ];
  const workflow = [
    "User creates a project and stores official AI-readable ProjectContext.",
    "User connects MCP/API keys and optionally GitHub.",
    "GitHub, MCP, dashboard, AI capture, or cleanup flows create pending ContextSuggestions.",
    "User reviews then applies or rejects suggestions.",
    "Meaningful applied changes merge cumulatively into ProjectContext and create ContextVersion snapshots.",
    "AI tools call context_load/context_smart to continue from latest project memory."
  ];
  const safetyRules = [
    "Review-first memory model: suggestions from GitHub, MCP, AI, dashboard, or cleanup never auto-apply.",
    "API keys can read context and create suggestions only; they cannot bypass ownership checks or mutate official memory.",
    "Raw API keys are shown once and stored only as hashes.",
    "Duplicate, already-applied, or no-op suggestion apply attempts must return safely without extra versions.",
    "Raw context remains available only through raw=true; optimized output is formatting/compression only and must not alter stored ProjectContext.",
    "Latest MCP context must stay cumulative and portable across AI tools."
  ];
  const aiInstructions = [
    "Treat this handoff as the working source of truth for implementation.",
    "Respect review-first memory updates and scoped MCP access.",
    "Create pending Context Vault suggestions for meaningful project changes instead of mutating official memory directly.",
    "Preserve cumulative project memory unless the user explicitly requests cleanup or replacement.",
    "When uncertain, prefer current active behavior over historical implementation notes."
  ];

  return [
    "# Context Vault - AI Handoff",
    "",
    "## Product Identity",
    bullets(compactSection([
      "Persistent cross-AI project memory layer for AI-assisted development: GitHub stores code, Context Vault stores AI-readable project memory.",
      "ProjectContext is the official cumulative source of truth; ContextVersions preserve immutable snapshots.",
      "MCP is the AI-tool access layer; dashboard is the review/control layer.",
      context.goal || "Build account-based project memory that lets users switch AI tools without losing context."
    ], compactLimit(compression, 5, 3))),
    "",
    "## Current Architecture",
    bullets(compactSection(architecture, compactLimit(compression, 6, 4))),
    "",
    "## Core Workflow",
    bullets(compactSection(workflow, compactLimit(compression, 6, 4))),
    "",
    "## Safety / Access Rules",
    bullets(compactSection(safetyRules, compactLimit(compression, 6, 4))),
    "",
    "## Current Capabilities",
    bullets(buildCapabilities(context, compression)),
    "",
    "## Active Constraints",
    bullets(buildActiveConstraints(context, stats, compression)),
    "",
    "## Current Gaps / Next Work",
    bullets(buildGaps(context, stats, compression)),
    "",
    "## AI Handoff Instructions",
    bullets(compactSection(aiInstructions, compactLimit(compression, 5, 4)))
  ].join("\n");
};

const appendSemanticTokenSummary = (
  body: string,
  result: OptimizedContextResponse,
  compression: CompressionLevel
): string => {
  const optimizedEstimate = estimateTokens(body);
  const rawEstimate = result.originalTokenEstimate;
  const savings = rawEstimate > 0 ? Math.max(0, Math.round((1 - optimizedEstimate / rawEstimate) * 100)) : 0;
  return [
    body,
    "",
    "## Token Optimization Summary",
    `- Raw token estimate: ${rawEstimate}`,
    `- Optimized token estimate: ${optimizedEstimate}`,
    `- Estimated savings: ${savings}%`,
    `- Compression level: ${compression}`
  ].join("\n");
};

const aiSemanticHandoffSchema = z.object({
  productIdentity: z.array(z.string()).min(1).max(5),
  currentArchitecture: z.array(z.string()).min(1).max(6),
  coreWorkflow: z.array(z.string()).min(1).max(6),
  safetyAccessRules: z.array(z.string()).min(1).max(6),
  currentCapabilities: z.array(z.string()).min(1).max(8),
  activeConstraints: z.array(z.string()).min(1).max(8),
  currentGapsNextWork: z.array(z.string()).min(1).max(5),
  aiHandoffInstructions: z.array(z.string()).min(1).max(5)
});

const formatAiSemanticHandoff = (handoff: z.infer<typeof aiSemanticHandoffSchema>): string => [
  "# Context Vault - AI Handoff",
  "",
  "## Product Identity",
  bullets(handoff.productIdentity),
  "",
  "## Current Architecture",
  bullets(handoff.currentArchitecture),
  "",
  "## Core Workflow",
  bullets(handoff.coreWorkflow),
  "",
  "## Safety / Access Rules",
  bullets(handoff.safetyAccessRules),
  "",
  "## Current Capabilities",
  bullets(handoff.currentCapabilities),
  "",
  "## Active Constraints",
  bullets(handoff.activeConstraints),
  "",
  "## Current Gaps / Next Work",
  bullets(handoff.currentGapsNextWork),
  "",
  "## AI Handoff Instructions",
  bullets(handoff.aiHandoffInstructions)
].join("\n");

const readGeminiText = (value: unknown): string | null => {
  const response = value as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || null;
};

const tryAiSemanticCompaction = async (
  result: OptimizedContextResponse,
  compression: Exclude<CompressionLevel, "standard">,
  stats: SemanticStats
): Promise<string | null> => {
  if (env.compactionAiProvider !== "gemini" || !env.geminiApiKey || !result.optimizedContext) {
    return null;
  }

  const context = result.optimizedContext;
  const normalizedItems = compactAllContextItems(context, stats);
  const deterministicReference = buildSemanticHandoffBody(result, compression, newSemanticStats());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const prompt = [
      "Return strict JSON only. Compact this Context Vault project memory into the exact schema below.",
      "Schema keys: productIdentity, currentArchitecture, coreWorkflow, safetyAccessRules, currentCapabilities, activeConstraints, currentGapsNextWork, aiHandoffInstructions.",
      "Each value must be an array of concise strings.",
      "Rules: merge related bullets; remove duplicates; preserve constraints, review-first safety, scoped API key rules, current next steps, and source-of-truth model; remove resolved/fixed implementation noise.",
      compression === "ultra" ? "Use the smallest useful handoff." : "Use an aggressive but useful handoff.",
      "",
      "Normalized source items:",
      JSON.stringify(normalizedItems),
      "",
      "Deterministic fallback reference:",
      deterministicReference
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.compactionAiModel)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      }
    );
    if (!response.ok) {
      return null;
    }
    const text = readGeminiText(await response.json());
    if (!text) {
      return null;
    }
    const parsed = aiSemanticHandoffSchema.safeParse(JSON.parse(text));
    return parsed.success ? formatAiSemanticHandoff(parsed.data) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const formatSmartHandoff = (
  result: import("./contextVaultClient.js").OptimizedContextResponse,
  task: string,
  detailLevel: DetailLevel = "standard"
): string => {
  const context = result.optimizedContext;
  if (!context) {
    return formatOptimizedContext(result);
  }

  const features = relevantItems(context.features, task, detailLevel);
  const decisions = relevantItems(context.decisions, task, detailLevel);
  const issues = filterOptimizedNoise(relevantItems(context.issues, task, detailLevel));
  const nextSteps = relevantItems(context.nextSteps, task, detailLevel);
  const architectureNotes = relevantItems(context.architectureNotes, task, detailLevel);
  const implementation = takeByDetail(implementationDirectionForTask(task), detailLevel);

  return [
    "# Context Vault Task Handoff",
    "",
    "## Receiving AI Instruction",
    "Use this as task-specific project context. Do not summarize it away.",
    "",
    "## Task",
    task,
    "",
    "## Product Context Needed For This Task",
    "Context Vault is a persistent account-based context store for AI-assisted development. GitHub stores code, while Context Vault stores AI-readable project memory. MCP lets AI tools load the same account/project memory across tools, and the dashboard gives the user review and control over suggestions before official memory changes.",
    "",
    "## Relevant Current Flow",
    bullets(architectureFlowForTask(task)),
    "",
    "## Relevant Completed Features",
    bullets(features),
    "",
    "## Relevant Decisions",
    bullets(decisions),
    "",
    "## Mandatory Constraints",
    bullets(takeByDetail([
      "Never auto-apply GitHub, AI, MCP, or cleanup suggestions.",
      "Every official context update creates a ContextVersion.",
      "Latest context returned by MCP must be complete and cumulative.",
      "MCP API keys must not bypass ownership checks.",
      "MCP API keys cannot directly mutate official ProjectContext.",
      "Raw API keys are shown once and only hashes are stored.",
      "GitHub webhook payloads should not expose secrets.",
      "ProjectContext must remain portable across AI tools.",
      ...toTextItems(context.constraints)
    ], detailLevel)),
    "",
    "## Known Issues / Current Gap",
    bullets(issues),
    "",
    "## Recommended Implementation Direction",
    bullets(takeByDetail([...implementation, ...architectureNotes, ...nextSteps], detailLevel)),
    "",
    "## Expected Result",
    bullets([
      "GitHub commit \"Implement MCP API key authentication\" produces a suggestion with feature, decision, constraint, and architecture note.",
      "context_versions shows readable version titles, previews, and counts.",
      "context_load still returns latest cumulative optimized context.",
      "Official ProjectContext changes only through explicit apply or authorized manual update."
    ]),
    "",
    "## Token Metadata",
    `- Original token estimate: ${result.originalTokenEstimate}`,
    `- Optimized token estimate: ${result.tokenEstimate}`,
    `- Estimated savings: ${result.estimatedSavingsPercent}%`
  ].join("\n");
};

const formatStandardProjectHandoff = (
  result: OptimizedContextResponse,
  detailLevel: DetailLevel = "standard"
): string => {
  if (result.rawContext) {
    return [
      "# Context Vault Raw Project Context",
      "Receiving AI: this is raw/unoptimized stored ProjectContext. Use it only when the user explicitly asks for raw context.",
      "",
      formatFullContext(result.rawContext)
    ].join("\n");
  }

  const context = result.optimizedContext;
  if (!context) {
    return "Context Vault optimized context was not available.";
  }

  const issues = filterOptimizedNoise(withoutNormalized(context.issues, ["Need API tests later"]));
  const nextSteps = filterOptimizedNoise(withoutNormalized(context.nextSteps, [
    "Verify future PATCH and suggestion apply operations merge cumulatively instead of replacing arrays."
  ]));
  const architectureNotes = filterOptimizedNoise(withoutNormalized(context.architectureNotes, [
    "Context service is ready for future MCP integration."
  ]));

  return [
    "# Context Vault Optimized Project Handoff",
    "",
    "## Receiving AI Instruction",
    "This is the latest optimized Context Vault project memory. Treat it as the working source of truth for this project. Do not replace it with a short summary. Use it to continue implementation.",
    "",
    "## Current Version",
    `Version: ${context.currentVersionNumber}`,
    "",
    "## Product Goal",
    context.goal || "None recorded",
    "",
    "## Core Product Promise",
    coreProductPromise,
    "",
    "## Current System Architecture",
    bullets(systemArchitecture(context, detailLevel)),
    "",
    "## Current Working Flow",
    bullets(workingFlow),
    "",
    "## Completed Features",
    bullets(takeByDetail(context.features, detailLevel)),
    "",
    "## Important Decisions",
    bullets(takeByDetail(context.decisions, detailLevel)),
    "",
    "## Active Constraints",
    bullets(takeByDetail(context.constraints, detailLevel)),
    "",
    "## Known Issues / Current Gaps",
    bullets(takeByDetail(issues, detailLevel)),
    "",
    "## Tech Stack / Dependencies",
    bullets(takeByDetail([...context.techStack, ...context.dependencies], detailLevel)),
    "",
    "## Current Next Steps",
    bullets(takeByDetail(nextSteps, detailLevel)),
    "",
    "## Architecture Notes",
    bullets(takeByDetail(architectureNotes, detailLevel)),
    "",
    "## AI Instructions",
    context.aiInstructions || "Load Context Vault context first, respect constraints, and create pending suggestions for meaningful memory updates.",
    "",
    "## Token Optimization Summary",
    `- Raw token estimate: ${result.originalTokenEstimate}`,
    `- Optimized token estimate: ${result.tokenEstimate}`,
    `- Estimated savings: ${result.estimatedSavingsPercent}%`,
    "- Compression level: standard"
  ].join("\n");
};

export const formatProjectHandoff = async (
  result: OptimizedContextResponse,
  detailLevel: DetailLevel = "standard",
  compression: CompressionLevel = "aggressive"
): Promise<string> => {
  if (result.rawContext) {
    return [
      "# Context Vault Raw Project Context",
      "Receiving AI: this is raw/unoptimized stored ProjectContext. Use it only when the user explicitly asks for raw context.",
      "",
      formatFullContext(result.rawContext)
    ].join("\n");
  }

  if (compression === "standard") {
    return formatStandardProjectHandoff(result, detailLevel);
  }

  const stats = newSemanticStats();
  const aiBody = await tryAiSemanticCompaction(result, compression, stats);
  if (aiBody) {
    return appendSemanticTokenSummary(aiBody, result, compression);
  }

  const fallbackStats = newSemanticStats();
  const body = buildSemanticHandoffBody(result, compression, fallbackStats);
  return appendSemanticTokenSummary(body, result, compression);
};
