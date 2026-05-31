import type { ProjectContext } from "@prisma/client";
import { projectContextNormalizerService } from "./projectContextNormalizer.service";

type OptimizerMode = "full-clean" | "smart-task";

type OptimizedContext = {
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
  currentVersionNumber: number;
};

type CleanResult = {
  context: OptimizedContext;
  removedStaleConstraintsCount: number;
  deduplicatedItemsCount: number;
  removedNoisyItemsCount: number;
};

type OptimizerInput = {
  projectContext: ProjectContext;
  mode: OptimizerMode;
  task?: string;
};

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

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const toItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => typeof item === "string" ? item : JSON.stringify(item))
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);
};

const similarity = (left: string, right: string): number => {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / Math.max(a.size, b.size);
};

const dedupe = (items: string[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = normalize(item);
    if (!key || seen.has(key)) {
      continue;
    }
    if (result.some((existing) => similarity(existing, item) >= 0.9)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
};

const dedupeCount = (before: string[], after: string[]): number => Math.max(0, before.length - after.length);

const genericFeatureKeys = new Set(["auth", "projects", "context", "versions", "suggestions"]);

const removeGenericFeatures = (features: string[]): string[] =>
  features.filter((feature) => !genericFeatureKeys.has(normalize(feature)));

const noisyNextStepKeys = new Set([
  "create suggestion",
  "apply suggestion",
  "check versions",
  "verify suggestion lifecycle",
  "inspect version history",
  "add api key auth for mcp clients later",
  "verify context replacement using mcp context load"
]);

const removeNoisyNextSteps = (nextSteps: string[]): string[] =>
  nextSteps.filter((step) => !noisyNextStepKeys.has(normalize(step)));

const taskKeywords = (task?: string): string[] => normalize(task ?? "").split(" ").filter((word) => word.length >= 3);

const relevantToTask = (items: string[], task?: string): string[] => {
  const keywords = taskKeywords(task);
  if (keywords.length === 0) {
    return [];
  }
  return items.filter((item) => {
    const text = normalize(item);
    return keywords.some((keyword) => text.includes(keyword));
  });
};

const removeOutdatedNextSteps = (nextSteps: string[], features: string[]): string[] => {
  const featureText = normalize(features.join(" "));
  return nextSteps.filter((step) => {
    const text = normalize(step);
    if (!text.startsWith("add ") && !text.startsWith("implement ") && !text.startsWith("build ")) {
      return true;
    }
    const meaningfulWords = text.split(" ").filter((word) => word.length >= 5);
    return !meaningfulWords.some((word) => featureText.includes(word));
  });
};

const filterStaleConstraints = (constraints: string[], contextSignals: string[]): string[] => {
  const signalText = normalize(contextSignals.join(" "));
  return constraints.filter((constraint) => {
    const text = normalize(constraint);
    if (text === "no frontend" && includesSignal(signalText, ["frontend", "dashboard", "react", "vite"])) {
      return false;
    }
    if (text === "no github integration yet" && includesSignal(signalText, ["github", "webhook", "githubconnection", "githubevent"])) {
      return false;
    }
    if (
      includesSignal(text, ["api key auth not", "mcp auth not", "api keys later"]) &&
      includesSignal(signalText, ["mcp api key", "api key auth", "scoped api keys", "scoped mcp api key"])
    ) {
      return false;
    }
    return true;
  });
};

const includesSignal = (text: string, signals: string[]): boolean => signals.some((signal) => text.includes(signal));

const estimateTokens = (value: unknown): number => Math.ceil(JSON.stringify(value).length / 4);

const savingsPercent = (original: number, optimized: number): number => {
  if (original <= 0) {
    return 0;
  }
  return Math.max(0, Math.round((1 - optimized / original) * 100));
};

const buildCleanContext = (projectContext: ProjectContext): CleanResult => {
  const rawItems = arrayFields.flatMap((field) => toItems(projectContext[field]));
  const normalized = projectContextNormalizerService.normalizeProjectContext(projectContext);
  const normalizedItems = arrayFields.flatMap((field) => normalized[field]);
  const deduplicatedItemsCount = Math.max(0, rawItems.length - dedupe(rawItems).length);
  const removedNoisyItemsCount = Math.max(0, rawItems.length - normalizedItems.length - deduplicatedItemsCount);

  return {
    context: {
      ...normalized,
      currentVersionNumber: projectContext.currentVersionNumber
    },
    removedStaleConstraintsCount: 0,
    deduplicatedItemsCount,
    removedNoisyItemsCount
  };
};

export const contextOptimizerService = {
  optimizeProjectContext(input: OptimizerInput) {
    const originalTokenEstimate = estimateTokens(input.projectContext);
    const cleanResult = buildCleanContext(input.projectContext);
    const fullClean = cleanResult.context;
    const optimizedContext = input.mode === "smart-task"
      ? {
          ...fullClean,
          features: relevantToTask(fullClean.features, input.task),
          decisions: relevantToTask(fullClean.decisions, input.task),
          issues: relevantToTask(fullClean.issues, input.task),
          nextSteps: relevantToTask(fullClean.nextSteps, input.task),
          architectureNotes: relevantToTask(fullClean.architectureNotes, input.task)
        }
      : fullClean;
    const tokenEstimate = estimateTokens(optimizedContext);

    return {
      optimizedContext,
      optimizationSummary: [
        `Mode: ${input.mode}.`,
        "Deduplicated arrays case-insensitively, normalized whitespace, removed empty values, and compressed near-duplicates.",
        input.mode === "smart-task" ? "Filtered task-relevant optional sections while preserving goal, tech stack, constraints, and AI instructions." : "Preserved full cleaned project memory without mutating stored ProjectContext."
      ].join(" "),
      tokenEstimate,
      originalTokenEstimate,
      estimatedSavingsPercent: savingsPercent(originalTokenEstimate, tokenEstimate),
      removedStaleConstraintsCount: cleanResult.removedStaleConstraintsCount,
      deduplicatedItemsCount: cleanResult.deduplicatedItemsCount,
      removedNoisyItemsCount: cleanResult.removedNoisyItemsCount
    };
  }
};
