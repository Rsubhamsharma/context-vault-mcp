import type { ContextVersion, Prisma, ProjectContext } from "@prisma/client";
import { SuggestionSource, SuggestionStatus, VersionSource } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { projectService } from "../projects/project.service";
import type {
  ContextMergeMode,
  ContextPatchInput,
  InitializeContextInput,
  ReplaceContextInput,
  UpdateContextInput
} from "./context.schemas";
import { contextOptimizerService } from "./contextOptimizer.service";
import { manualContextAnalysisService } from "./manualContextAnalysis.service";
import { versionMetadataService } from "./versionMetadata.service";

type ContextSnapshot = {
  goal: string;
  techStack: Prisma.JsonValue;
  features: Prisma.JsonValue;
  decisions: Prisma.JsonValue;
  constraints: Prisma.JsonValue;
  issues: Prisma.JsonValue;
  dependencies: Prisma.JsonValue;
  nextSteps: Prisma.JsonValue;
  architectureNotes: Prisma.JsonValue;
  aiInstructions: string;
  versionNumber: number;
};

const toSnapshot = (context: ProjectContext): Prisma.InputJsonObject => {
  const snapshot: ContextSnapshot = {
    goal: context.goal,
    techStack: context.techStack,
    features: context.features,
    decisions: context.decisions,
    constraints: context.constraints,
    issues: context.issues,
    dependencies: context.dependencies,
    nextSteps: context.nextSteps,
    architectureNotes: context.architectureNotes,
    aiInstructions: context.aiInstructions,
    versionNumber: context.currentVersionNumber
  };

  return snapshot as Prisma.InputJsonObject;
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

type ContextArrayField = typeof arrayFields[number];
type ContextStringField = "goal" | "aiInstructions";

const toStringItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => typeof item === "string" ? item.trim() : JSON.stringify(item).trim())
    .filter((item) => item.length > 0);
};

const mergeStringArrays = (existing: unknown, patch: unknown): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of [...toStringItems(existing), ...toStringItems(patch)]) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};

const normalizeStringArray = (value: unknown): string[] => mergeStringArrays([], value);

const stringValue = (value: unknown): string | undefined => {
  return typeof value === "string" ? value.trim() : undefined;
};

const contextValue = (context: ProjectContext, field: ContextArrayField): Prisma.JsonValue => {
  return context[field];
};

const snapshotValue = (snapshot: Record<string, unknown>, field: ContextArrayField): unknown => {
  return snapshot[field];
};

const buildMergedContextData = (
  existing: ProjectContext,
  patch: ContextPatchInput,
  mergeMode: ContextMergeMode = "merge"
): Prisma.ProjectContextUpdateInput => {
  const data: Prisma.ProjectContextUpdateInput = {};

  const applyString = (field: ContextStringField): void => {
    if (patch[field] === undefined) {
      return;
    }

    const nextValue = stringValue(patch[field]);
    if (mergeMode === "replace") {
      data[field] = nextValue ?? "";
      return;
    }

    if (nextValue && nextValue.length > 0) {
      data[field] = nextValue;
    }
  };

  applyString("goal");
  applyString("aiInstructions");

  for (const field of arrayFields) {
    if (patch[field] === undefined) {
      continue;
    }

    data[field] = mergeMode === "replace"
      ? normalizeStringArray(patch[field])
      : mergeStringArrays(contextValue(existing, field), patch[field]);
  }

  return data;
};

const snapshotToPatch = (snapshot: Prisma.JsonValue): ContextPatchInput => {
  const raw = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : {};

  const patch: Record<string, unknown> = {};
  const goal = stringValue(raw.goal);
  const aiInstructions = stringValue(raw.aiInstructions);

  if (goal) {
    patch.goal = goal;
  }
  if (aiInstructions) {
    patch.aiInstructions = aiInstructions;
  }
  for (const field of arrayFields) {
    const items = normalizeStringArray(snapshotValue(raw, field));
    if (items.length > 0) {
      patch[field] = items;
    }
  }

  return patch as ContextPatchInput;
};

const jsonInput = (value: Prisma.JsonValue): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const emptyJsonArray = (): Prisma.JsonValue => [];

const emptyContextFrom = (existing: ProjectContext): ProjectContext => ({
  ...existing,
  goal: "",
  techStack: emptyJsonArray(),
  features: emptyJsonArray(),
  decisions: emptyJsonArray(),
  constraints: emptyJsonArray(),
  issues: emptyJsonArray(),
  dependencies: emptyJsonArray(),
  nextSteps: emptyJsonArray(),
  architectureNotes: emptyJsonArray(),
  aiInstructions: "",
  currentVersionNumber: 0
});

const buildLatestContextFromVersions = async (projectId: string): Promise<ProjectContext | null> => {
  const existing = await prisma.projectContext.findUnique({ where: { projectId } });
  if (!existing) {
    return null;
  }

  const versions = await prisma.contextVersion.findMany({
    where: { projectId },
    orderBy: { versionNumber: "asc" }
  });

  if (versions.length === 0) {
    return existing;
  }

  const rebuilt = versions.reduce<ProjectContext>((accumulator, version: ContextVersion) => {
    const patch = snapshotToPatch(version.snapshot);
    return {
      ...accumulator,
      ...buildMergedContextData(accumulator, patch, "merge")
    } as ProjectContext;
  }, emptyContextFrom(existing));

  return {
    ...rebuilt,
    id: existing.id,
    projectId: existing.projectId,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
    currentVersionNumber: existing.currentVersionNumber
  };
};

const isSparseContext = (context: ProjectContext): boolean => {
  const importantItems = [
    ...toStringItems(context.features),
    ...toStringItems(context.decisions),
    ...toStringItems(context.dependencies),
    ...toStringItems(context.architectureNotes)
  ];

  return importantItems.length <= 2;
};

const normalizeSuggestionTitle = (title: string): string => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
};

export const contextService = {
  async initializeContext(userId: string, projectId: string, input: InitializeContextInput) {
    await projectService.assertProjectOwner(userId, projectId);

    const existing = await prisma.projectContext.findUnique({ where: { projectId } });
    if (existing) {
      throw new ApiError(409, "Project context is already initialized");
    }

    return prisma.$transaction(async (tx) => {
      const context = await tx.projectContext.create({
        data: {
          projectId,
          goal: input.goal,
          techStack: input.techStack,
          features: input.features,
          decisions: input.decisions,
          constraints: input.constraints,
          issues: input.issues,
          dependencies: input.dependencies,
          nextSteps: input.nextSteps,
          architectureNotes: input.architectureNotes,
          aiInstructions: input.aiInstructions,
          currentVersionNumber: 1
        }
      });

      const metadata = versionMetadataService.generateVersionMetadata({
        source: VersionSource.manual,
        patch: input,
        previousContext: emptyContextFrom(context),
        nextContext: context,
        summaryHint: input.changeSummary
      });

      const version = await tx.contextVersion.create({
        data: {
          projectId,
          versionNumber: 1,
          snapshot: toSnapshot(context),
          versionTitle: metadata.versionTitle,
          changeSummary: metadata.changeSummary,
          changedSections: versionMetadataService.asJson(metadata.changedSections),
          changePreview: versionMetadataService.asJson(metadata.changePreview),
          source: VersionSource.manual
        }
      });

      return { context, version };
    });
  },

  async getContext(userId: string, projectId: string, options: { rebuild?: boolean } = {}) {
    await projectService.assertProjectOwner(userId, projectId);
    const context = await prisma.projectContext.findUnique({ where: { projectId } });

    if (!context) {
      throw new ApiError(404, "Project context is not initialized");
    }

    if (options.rebuild || isSparseContext(context)) {
      const rebuilt = await buildLatestContextFromVersions(projectId);
      if (rebuilt) {
        return rebuilt;
      }
    }

    return context;
  },

  async updateContext(userId: string, projectId: string, input: UpdateContextInput) {
    await projectService.assertProjectOwner(userId, projectId);

    const existing = await prisma.projectContext.findUnique({ where: { projectId } });
    if (!existing) {
      throw new ApiError(404, "Project context is not initialized");
    }

    const nextVersionNumber = existing.currentVersionNumber + 1;
    const { changeSummary, mergeMode, ...patch } = input;

    return prisma.$transaction(async (tx) => {
      const context = await tx.projectContext.update({
        where: { projectId },
        data: {
          ...buildMergedContextData(existing, patch, mergeMode),
          currentVersionNumber: nextVersionNumber
        }
      });

      const metadata = versionMetadataService.generateVersionMetadata({
        source: VersionSource.manual,
        patch,
        previousContext: existing,
        nextContext: context,
        summaryHint: changeSummary
      });

      const version = await tx.contextVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          snapshot: toSnapshot(context),
          versionTitle: metadata.versionTitle,
          changeSummary: metadata.changeSummary,
          changedSections: versionMetadataService.asJson(metadata.changedSections),
          changePreview: versionMetadataService.asJson(metadata.changePreview),
          source: VersionSource.manual
        }
      });

      return { context, version };
    });
  },

  async rebuildFromVersions(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const existing = await prisma.projectContext.findUnique({ where: { projectId } });
    if (!existing) {
      throw new ApiError(404, "Project context is not initialized");
    }

    const versions = await prisma.contextVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: "asc" }
    });

    if (versions.length === 0) {
      throw new ApiError(409, "No context versions found to rebuild from");
    }

    const rebuilt = await buildLatestContextFromVersions(projectId);
    if (!rebuilt) {
      throw new ApiError(404, "Project context is not initialized");
    }

    const nextVersionNumber = existing.currentVersionNumber + 1;

    return prisma.$transaction(async (tx) => {
      const context = await tx.projectContext.update({
        where: { projectId },
        data: {
          goal: rebuilt.goal,
          techStack: jsonInput(rebuilt.techStack),
          features: jsonInput(rebuilt.features),
          decisions: jsonInput(rebuilt.decisions),
          constraints: jsonInput(rebuilt.constraints),
          issues: jsonInput(rebuilt.issues),
          dependencies: jsonInput(rebuilt.dependencies),
          nextSteps: jsonInput(rebuilt.nextSteps),
          architectureNotes: jsonInput(rebuilt.architectureNotes),
          aiInstructions: rebuilt.aiInstructions,
          currentVersionNumber: nextVersionNumber
        }
      });

      const metadata = versionMetadataService.generateVersionMetadata({
        source: VersionSource.cleanup,
        patch: {
          goal: context.goal,
          techStack: normalizeStringArray(context.techStack),
          features: normalizeStringArray(context.features),
          decisions: normalizeStringArray(context.decisions),
          constraints: normalizeStringArray(context.constraints),
          issues: normalizeStringArray(context.issues),
          dependencies: normalizeStringArray(context.dependencies),
          nextSteps: normalizeStringArray(context.nextSteps),
          architectureNotes: normalizeStringArray(context.architectureNotes),
          aiInstructions: context.aiInstructions
        },
        previousContext: existing,
        nextContext: context,
        summaryHint: "Rebuilt cumulative ProjectContext from version history."
      });

      const version = await tx.contextVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          snapshot: toSnapshot(context),
          versionTitle: metadata.versionTitle,
          changeSummary: metadata.changeSummary,
          changedSections: versionMetadataService.asJson(metadata.changedSections),
          changePreview: versionMetadataService.asJson(metadata.changePreview),
          source: VersionSource.cleanup
        }
      });

      return { context, version, versionsMerged: versions.length };
    });
  },

  async replaceContext(userId: string, projectId: string, input: ReplaceContextInput) {
    await projectService.assertProjectOwner(userId, projectId);

    const existing = await prisma.projectContext.findUnique({ where: { projectId } });
    if (!existing) {
      throw new ApiError(404, "Project context is not initialized");
    }

    const nextVersionNumber = existing.currentVersionNumber + 1;

    return prisma.$transaction(async (tx) => {
      const context = await tx.projectContext.update({
        where: { projectId },
        data: {
          goal: input.goal,
          techStack: normalizeStringArray(input.techStack),
          features: normalizeStringArray(input.features),
          decisions: normalizeStringArray(input.decisions),
          constraints: normalizeStringArray(input.constraints),
          issues: normalizeStringArray(input.issues),
          dependencies: normalizeStringArray(input.dependencies),
          nextSteps: normalizeStringArray(input.nextSteps),
          architectureNotes: normalizeStringArray(input.architectureNotes),
          aiInstructions: input.aiInstructions,
          currentVersionNumber: nextVersionNumber
        }
      });

      const replacementPatch: ContextPatchInput = {
        goal: input.goal,
        techStack: input.techStack,
        features: input.features,
        decisions: input.decisions,
        constraints: input.constraints,
        issues: input.issues,
        dependencies: input.dependencies,
        nextSteps: input.nextSteps,
        architectureNotes: input.architectureNotes,
        aiInstructions: input.aiInstructions
      };
      const metadata = versionMetadataService.generateVersionMetadata({
        source: VersionSource.cleanup,
        patch: replacementPatch,
        previousContext: existing,
        nextContext: context,
        summaryHint: input.changeSummary
      });

      const version = await tx.contextVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          snapshot: toSnapshot(context),
          versionTitle: metadata.versionTitle,
          changeSummary: metadata.changeSummary,
          changedSections: versionMetadataService.asJson(metadata.changedSections),
          changePreview: versionMetadataService.asJson(metadata.changePreview),
          source: VersionSource.cleanup
        }
      });

      return { context, version };
    });
  },

  async getOptimizedContext(userId: string, projectId: string, input: { mode: "full-clean" | "smart-task"; task?: string; raw?: boolean }) {
    const context = await this.getContext(userId, projectId, { rebuild: true });
    if (input.raw) {
      return {
        rawContext: context,
        optimizationSummary: "Raw stored ProjectContext returned without optimization.",
        tokenEstimate: Math.ceil(JSON.stringify(context).length / 4),
        originalTokenEstimate: Math.ceil(JSON.stringify(context).length / 4),
        estimatedSavingsPercent: 0
      };
    }

    return contextOptimizerService.optimizeProjectContext({
      projectContext: context,
      mode: input.mode,
      task: input.task
    });
  },

  async createCleanupSuggestion(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);
    const context = await this.getContext(userId, projectId, { rebuild: true });
    const optimized = contextOptimizerService.optimizeProjectContext({
      projectContext: context,
      mode: "full-clean"
    });

    return prisma.contextSuggestion.create({
      data: {
        projectId,
        title: "Cleanup optimized ProjectContext",
        source: SuggestionSource.cleanup,
        suggestedPatch: optimized.optimizedContext,
        reasoningSummary: optimized.optimizationSummary,
        confidence: "medium"
      }
    });
  },

  async captureManualContext(
    userId: string,
    projectId: string,
    input: { rawText: string; mode: "general_note" | "git_summary" | "release_note" | "session_summary" },
    source: "mcp" | "manual"
  ) {
    await projectService.assertProjectOwner(userId, projectId);
    const currentProjectContext = await this.getContext(userId, projectId, { rebuild: true });
    const analysis = manualContextAnalysisService.analyzeManualContextInput({
      rawText: input.rawText,
      source,
      mode: input.mode,
      currentProjectContext
    });
    const suggestionSource = source === "mcp" ? SuggestionSource.mcp : SuggestionSource.manual;
    const recentPendingSuggestions = await prisma.contextSuggestion.findMany({
      where: {
        projectId,
        source: { in: [SuggestionSource.mcp, SuggestionSource.manual] },
        status: SuggestionStatus.pending,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000)
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    const normalizedTitle = normalizeSuggestionTitle(analysis.title);
    const duplicate = recentPendingSuggestions.find((suggestion) =>
      normalizeSuggestionTitle(suggestion.title) === normalizedTitle
    );

    if (duplicate) {
      return duplicate;
    }

    return prisma.contextSuggestion.create({
      data: {
        projectId,
        title: analysis.title,
        source: suggestionSource,
        suggestedPatch: analysis.suggestedPatch,
        confidence: analysis.confidence,
        reasoningSummary: analysis.reasoningSummary
      }
    });
  },

  toSnapshot,
  buildMergedContextData,
  buildLatestContextFromVersions
};
