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
  "review github push abc123postmantest",
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

export const formatProjectHandoff = (
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
  const nextSteps = [
    ...filterOptimizedNoise(withoutNormalized(context.nextSteps, [
      "Review GitHub push abc123postmantest on main and update project context if the change affects product behavior, architecture, dependencies, or known issues.",
      "Verify future PATCH and suggestion apply operations merge cumulatively instead of replacing arrays."
    ])),
    "Auto-generate readable version metadata.",
    "Improve context_smart task handoff output."
  ];
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
    `- Original token estimate: ${result.originalTokenEstimate}`,
    `- Optimized token estimate: ${result.tokenEstimate}`,
    `- Estimated savings: ${result.estimatedSavingsPercent}%`,
    `- Removed stale/noisy items: ${(result.removedStaleConstraintsCount ?? 0) + (result.removedNoisyItemsCount ?? 0)}`,
    `- Deduplicated items: ${result.deduplicatedItemsCount ?? 0}`
  ].join("\n");
};
