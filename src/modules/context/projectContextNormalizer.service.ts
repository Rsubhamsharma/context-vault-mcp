import type { Prisma, ProjectContext } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env";

const arrayFields = [
  "techStack",
  "features",
  "decisions",
  "constraints",
  "issues",
  "dependencies",
  "nextSteps",
  "architectureNotes"
] as const;

type ContextArrayField = typeof arrayFields[number];

export type NormalizedProjectContextData = {
  goal: string;
  techStack: string[];
  features: string[];
  decisions: string[];
  constraints: string[];
  issues: string[];
  dependencies: string[];
  nextSteps: string[];
  architectureNotes: string[];
  aiInstructions: string;
};

export type ProjectContextNormalizationMetrics = {
  removedDuplicates: number;
  mergedRelatedItems: number;
  movedFixedIssues: number;
  removedStaleItems: number;
  removedContradictions: number;
  cleanedDependencies: number;
};

export type ProjectContextNormalizationResult = {
  context: NormalizedProjectContextData;
  metrics: ProjectContextNormalizationMetrics;
  usedAi: boolean;
  fallbackReason?: string;
};

type ProjectContextNormalizerInput = {
  goal?: unknown;
  techStack?: unknown;
  features?: unknown;
  decisions?: unknown;
  constraints?: unknown;
  issues?: unknown;
  dependencies?: unknown;
  nextSteps?: unknown;
  architectureNotes?: unknown;
  aiInstructions?: unknown;
};

const normalizedContextSchema = z.object({
  goal: z.string().default(""),
  techStack: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  architectureNotes: z.array(z.string()).default([]),
  aiInstructions: z.string().default("")
});

const emptyMetrics = (): ProjectContextNormalizationMetrics => ({
  removedDuplicates: 0,
  mergedRelatedItems: 0,
  movedFixedIssues: 0,
  removedStaleItems: 0,
  removedContradictions: 0,
  cleanedDependencies: 0
});

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9@./#+-]+/g, " ").replace(/\s+/g, " ").trim();
const sentence = (value: string): string => value.endsWith(".") || value.endsWith("!") || value.endsWith("?") ? value : `${value}.`;
const includesAny = (text: string, terms: string[]): boolean => {
  const key = normalizeKey(text);
  return terms.some((term) => key.includes(normalizeKey(term)));
};

const words = (value: string): Set<string> =>
  new Set(normalizeKey(value).split(" ").filter((word) => word.length > 2));

const similarity = (left: string, right: string): number => {
  const a = words(left);
  const b = words(right);
  if (a.size === 0 || b.size === 0) return 0;
  const overlap = [...a].filter((word) => b.has(word)).length;
  return overlap / Math.max(a.size, b.size);
};

const toItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => typeof item === "string" ? item : JSON.stringify(item))
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
};

const isVague = (value: string): boolean => {
  const key = normalizeKey(value);
  const vague = new Set([
    "projects",
    "project",
    "context",
    "versions",
    "version",
    "suggestions",
    "suggestion",
    "dashboard",
    "docs",
    "github",
    "mcp",
    "api",
    "auth",
    "fix bug",
    "improve ui",
    "update dashboard",
    "check versions",
    "create suggestion",
    "apply suggestion"
  ]);
  return vague.has(key) || key.split(" ").length <= 1;
};

const stripNoisyPrefix = (value: string): { text: string; hadNoisyPrefix: boolean } => {
  const prefixes = [
    "fixed or addressed issue:",
    "implementation summary:",
    "verification captured from implementation summary:",
    "verification captured:",
    "review dependency or migration change:",
    "added or improved",
    "task:",
    "capture mode:",
    "commit message:",
    "github push detected:",
    "generated from github event:",
    "constraint captured from manual context:",
    "decision captured from manual context:",
    "follow-up captured from manual context:"
  ];

  let text = value.trim();
  let hadNoisyPrefix = false;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      const normalized = text.toLowerCase();
      if (normalized.startsWith(prefix)) {
        text = text.slice(prefix.length).replace(/^[:\s-]+/, "").trim();
        hadNoisyPrefix = true;
        changed = true;
      } else if (prefix === "added or improved" && normalized.startsWith(prefix)) {
        text = text.slice(prefix.length).replace(/^[:\s-]+/, "").trim();
        hadNoisyPrefix = true;
        changed = true;
      }
    }
  }

  return { text, hadNoisyPrefix };
};

const canonicalDependencyMap: Record<string, string> = {
  node: "Node.js",
  nodejs: "Node.js",
  "node js": "Node.js",
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  express: "Express",
  prisma: "Prisma",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlite: "SQLite",
  mongodb: "MongoDB",
  redis: "Redis",
  react: "React",
  vite: "Vite",
  nextjs: "Next.js",
  "next js": "Next.js",
  vue: "Vue",
  angular: "Angular",
  svelte: "Svelte",
  zod: "Zod",
  jsonwebtoken: "JWT/jsonwebtoken",
  jwt: "JWT/jsonwebtoken",
  bcrypt: "bcrypt",
  dotenv: "dotenv",
  tailwindcss: "Tailwind CSS",
  tailwind: "Tailwind CSS",
  docker: "Docker",
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Azure",
  gemini: "Gemini API",
  openai: "OpenAI API",
  "modelcontextprotocol/sdk": "MCP SDK",
  "@modelcontextprotocol/sdk": "MCP SDK"
};

const looksLikeDependency = (value: string): boolean => {
  const key = normalizeKey(value);
  if (canonicalDependencyMap[key]) return true;
  if (key.split(" ").length > 4) return false;
  return /^@?[a-z0-9][a-z0-9._/@+-]*(\s+[a-z0-9][a-z0-9._/@+-]*){0,2}$/i.test(value.trim());
};

const normalizeDependency = (value: string): string | null => {
  const key = normalizeKey(value);
  if (!key || !looksLikeDependency(value)) return null;
  return canonicalDependencyMap[key] ?? value.trim();
};

const appendUnique = (target: string[], item: string, metrics: ProjectContextNormalizationMetrics): void => {
  const clean = item.replace(/\s+/g, " ").trim();
  if (!clean || isVague(clean)) {
    metrics.removedStaleItems += 1;
    return;
  }
  const key = normalizeKey(clean);
  const existing = target.find((candidate) => normalizeKey(candidate) === key || similarity(candidate, clean) >= 0.88);
  if (existing) {
    metrics.removedDuplicates += 1;
    return;
  }
  target.push(clean);
};

const isFixedOrResolved = (value: string, hadNoisyPrefix = false): boolean =>
  hadNoisyPrefix ||
  includesAny(value, [
    "fixed",
    "resolved",
    "addressed",
    "implemented",
    "completed",
    "done",
    "no longer an issue",
    "bug fixed",
    "issue fixed",
    "implementation summary"
  ]);

const isEventLog = (value: string): boolean =>
  includesAny(value, [
    "commit message",
    "github push",
    "pull request event",
    "generated from github event",
    "delivery id",
    "webhook payload",
    "verification captured",
    "debug log",
    "event log"
  ]);

const isStaleNextStep = (value: string): boolean =>
  isVague(value) ||
  includesAny(value, [
    "review github push",
    "review commit",
    "review and apply",
    "inspect version history",
    "check versions",
    "verify this suggestion",
    "apply this suggestion",
    "if needed",
    "if accurate"
  ]);

const isLikelyArchitecture = (value: string): boolean =>
  includesAny(value, [
    "architecture",
    "service",
    "server",
    "client",
    "database",
    "schema",
    "model",
    "api",
    "endpoint",
    "worker",
    "queue",
    "webhook",
    "transaction",
    "cache",
    "storage",
    "auth",
    "integration",
    "pipeline",
    "layer",
    "module"
  ]);

const isLikelyRule = (value: string): boolean =>
  includesAny(value, ["must", "must not", "never", "should", "cannot", "only", "requires", "require", "source of truth"]);

const isLikelyCompletedCapability = (value: string): boolean =>
  includesAny(value, ["implemented", "added", "created", "supports", "provides", "allows", "can ", "management", "flow", "page", "endpoint", "integration"]);

const normalizeFeature = (value: string): string | null => {
  if (isVague(value) || isEventLog(value)) return null;
  return sentence(value);
};

const normalizeDecision = (value: string): string | null => {
  if (isVague(value) || isEventLog(value)) return null;
  return sentence(value);
};

const normalizeConstraint = (value: string): string | null => {
  if (isVague(value) || isEventLog(value) || isFixedOrResolved(value)) return null;
  return sentence(value);
};

const normalizeIssue = (value: string): string | null => {
  if (isVague(value) || isEventLog(value) || isFixedOrResolved(value)) return null;
  if (includesAny(value, ["issue", "bug", "error", "fails", "failing", "broken", "risk", "missing", "needs", "need", "unresolved", "blocked"])) {
    return sentence(value);
  }
  return null;
};

const normalizeNextStep = (value: string): string | null => {
  if (isStaleNextStep(value) || isFixedOrResolved(value) || isEventLog(value)) return null;
  return sentence(value);
};

const normalizeArchitecture = (value: string): string | null => {
  if (isVague(value) || isEventLog(value)) return null;
  return sentence(value);
};

const mergeConceptGroups = (context: NormalizedProjectContextData, metrics: ProjectContextNormalizationMetrics): void => {
  const merge = (field: "decisions" | "constraints" | "architectureNotes", terms: string[], replacement: string): void => {
    const items = context[field];
    const matches = items.filter((item) => includesAny(item, terms));
    if (matches.length <= 1) return;
    context[field] = items.filter((item) => !matches.includes(item));
    context[field].push(replacement);
    metrics.mergedRelatedItems += matches.length - 1;
  };

  merge("decisions", ["source of truth", "official memory", "canonical memory"], "The documented project memory is the durable source of truth for future AI work.");
  merge("decisions", ["review", "apply", "pending suggestion", "auto apply", "auto-apply"], "Proposed memory changes should become official only after explicit review and apply.");
  merge("constraints", ["api key", "scoped key", "ownership", "mutate"], "Scoped API keys must enforce ownership and cannot directly mutate official project memory.");
  merge("constraints", ["version", "snapshot", "history", "duplicate", "no-op"], "Meaningful memory changes should create one history entry, while duplicate or no-op updates should not create extra history.");
  merge("architectureNotes", ["webhook", "github", "event"], "Webhook and event integrations should record auditable events before turning useful changes into reviewable memory updates.");
  merge("architectureNotes", ["frontend", "dashboard", "ui"], "The user-facing interface is the review and control layer for project memory.");
  merge("architectureNotes", ["mcp", "tool", "client"], "External AI tools access project memory through the configured tool integration layer.");
  merge("architectureNotes", ["auth", "session", "jwt", "login"], "Authentication and ownership checks guard project memory access.");
};

const removeContradictedConstraints = (context: NormalizedProjectContextData, metrics: ProjectContextNormalizationMetrics): void => {
  const signalText = normalizeKey([
    ...context.techStack,
    ...context.dependencies,
    ...context.features,
    ...context.architectureNotes
  ].join(" "));
  const before = context.constraints.length;

  context.constraints = context.constraints.filter((constraint) => {
    const text = normalizeKey(constraint);
    const contradicted =
      (includesAny(text, ["no frontend", "frontend not", "no ui", "no dashboard"]) && includesAny(signalText, ["react", "vite", "vue", "angular", "svelte", "frontend", "dashboard", "ui"])) ||
      (includesAny(text, ["no github", "github not", "no webhook", "webhook not"]) && includesAny(signalText, ["github", "webhook", "pull request", "push event"])) ||
      (includesAny(text, ["no api key", "api keys not", "no scoped key"]) && includesAny(signalText, ["api key", "scoped key"])) ||
      (includesAny(text, ["no mcp", "mcp not", "no tool integration"]) && includesAny(signalText, ["mcp", "tool integration", "ai tool"]));
    if (contradicted) metrics.removedContradictions += 1;
    return !contradicted;
  });

  metrics.removedStaleItems += Math.max(0, before - context.constraints.length - metrics.removedContradictions);
};

const routeFixedIssue = (text: string, context: NormalizedProjectContextData, metrics: ProjectContextNormalizationMetrics): void => {
  metrics.movedFixedIssues += 1;
  if (isLikelyRule(text)) {
    appendUnique(context.decisions, sentence(text), metrics);
  } else if (isLikelyArchitecture(text)) {
    appendUnique(context.architectureNotes, sentence(text), metrics);
  } else if (isLikelyCompletedCapability(text)) {
    appendUnique(context.features, sentence(text), metrics);
  } else {
    metrics.removedStaleItems += 1;
  }
};

const normalizeDeterministic = (input: ProjectContextNormalizerInput | ProjectContext): ProjectContextNormalizationResult => {
  const metrics = emptyMetrics();
  const context: NormalizedProjectContextData = {
    goal: typeof input.goal === "string" ? input.goal.replace(/\s+/g, " ").trim() : "",
    techStack: [],
    features: [],
    decisions: [],
    constraints: [],
    issues: [],
    dependencies: [],
    nextSteps: [],
    architectureNotes: [],
    aiInstructions: typeof input.aiInstructions === "string" ? input.aiInstructions.replace(/\s+/g, " ").trim() : ""
  };

  const route = (field: ContextArrayField, raw: string): void => {
    const { text, hadNoisyPrefix } = stripNoisyPrefix(raw);
    if (!text || isVague(text)) {
      metrics.removedStaleItems += 1;
      return;
    }

    if (field === "techStack" || field === "dependencies") {
      const dependency = normalizeDependency(text);
      if (dependency) {
        appendUnique(context[field], dependency, metrics);
        if (dependency !== text.trim()) metrics.cleanedDependencies += 1;
      } else {
        metrics.cleanedDependencies += 1;
        metrics.removedStaleItems += 1;
      }
      return;
    }

    if (field === "issues") {
      if (isFixedOrResolved(text, hadNoisyPrefix)) {
        routeFixedIssue(text, context, metrics);
        return;
      }
      const issue = normalizeIssue(text);
      if (issue) appendUnique(context.issues, issue, metrics);
      else metrics.removedStaleItems += 1;
      return;
    }

    const normalized =
      field === "features" ? normalizeFeature(text) :
      field === "decisions" ? normalizeDecision(text) :
      field === "constraints" ? normalizeConstraint(text) :
      field === "nextSteps" ? normalizeNextStep(text) :
      normalizeArchitecture(text);

    if (normalized) appendUnique(context[field], normalized, metrics);
    else metrics.removedStaleItems += 1;
  };

  for (const field of arrayFields) {
    for (const item of toItems(input[field])) route(field, item);
  }

  context.dependencies = context.dependencies.filter((item) => !context.techStack.some((dependency) => normalizeKey(dependency) === normalizeKey(item)));
  mergeConceptGroups(context, metrics);
  removeContradictedConstraints(context, metrics);
  context.nextSteps = context.nextSteps.slice(0, 8);
  context.architectureNotes = context.architectureNotes.slice(0, 12);

  if (context.aiInstructions.length > 900) {
    context.aiInstructions = context.aiInstructions.slice(0, 897).trimEnd() + "...";
  }

  return { context, metrics, usedAi: false };
};

const extractJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI normalizer returned no JSON object");
  return JSON.parse(match[0]);
};

const callGeminiNormalizer = async (context: NormalizedProjectContextData): Promise<NormalizedProjectContextData> => {
  if (!env.GEMINI_API_KEY || env.GITHUB_SUGGESTION_AI_PROVIDER !== "gemini") {
    throw new Error("AI normalizer unavailable");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const prompt = [
      "You are cleaning a project memory object for an AI coding handoff.",
      "Keep current, durable, useful project knowledge.",
      "Remove duplicates, stale tasks, fixed issues, event logs, and miscategorized entries.",
      "Move useful facts to the correct section.",
      "Do not invent information.",
      "Dependencies and techStack must contain dependency/service names only.",
      "Issues must contain only unresolved/current issues.",
      "Output strict JSON matching this schema: goal string, techStack string[], features string[], decisions string[], constraints string[], issues string[], dependencies string[], nextSteps string[], architectureNotes string[], aiInstructions string.",
      JSON.stringify(context)
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GITHUB_SUGGESTION_AI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) throw new Error(`AI normalizer failed: ${response.status}`);
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    return normalizedContextSchema.parse(extractJson(text));
  } finally {
    clearTimeout(timeout);
  }
};

export const projectContextNormalizerService = {
  normalize(input: ProjectContextNormalizerInput | ProjectContext): NormalizedProjectContextData {
    return normalizeDeterministic(input).context;
  },

  normalizeWithMetrics(input: ProjectContextNormalizerInput | ProjectContext): ProjectContextNormalizationResult {
    return normalizeDeterministic(input);
  },

  async normalizeWithAiFallback(input: ProjectContextNormalizerInput | ProjectContext): Promise<ProjectContextNormalizationResult> {
    const deterministic = normalizeDeterministic(input);
    try {
      const aiContext = await callGeminiNormalizer(deterministic.context);
      const normalizedAi = normalizeDeterministic(aiContext);
      return {
        context: normalizedAi.context,
        metrics: {
          removedDuplicates: deterministic.metrics.removedDuplicates + normalizedAi.metrics.removedDuplicates,
          mergedRelatedItems: deterministic.metrics.mergedRelatedItems + normalizedAi.metrics.mergedRelatedItems,
          movedFixedIssues: deterministic.metrics.movedFixedIssues + normalizedAi.metrics.movedFixedIssues,
          removedStaleItems: deterministic.metrics.removedStaleItems + normalizedAi.metrics.removedStaleItems,
          removedContradictions: deterministic.metrics.removedContradictions + normalizedAi.metrics.removedContradictions,
          cleanedDependencies: deterministic.metrics.cleanedDependencies + normalizedAi.metrics.cleanedDependencies
        },
        usedAi: true
      };
    } catch (error) {
      return {
        ...deterministic,
        fallbackReason: error instanceof Error ? error.message : "AI normalizer failed"
      };
    }
  },

  normalizeProjectContext(context: ProjectContext): NormalizedProjectContextData {
    return normalizeDeterministic(context).context;
  },

  asUpdateInput(context: NormalizedProjectContextData): Prisma.ProjectContextUpdateInput {
    return {
      goal: context.goal,
      techStack: context.techStack,
      features: context.features,
      decisions: context.decisions,
      constraints: context.constraints,
      issues: context.issues,
      dependencies: context.dependencies,
      nextSteps: context.nextSteps,
      architectureNotes: context.architectureNotes,
      aiInstructions: context.aiInstructions
    };
  }
};
