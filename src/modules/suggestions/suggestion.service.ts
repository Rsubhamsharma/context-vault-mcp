import { SuggestionStatus, VersionSource } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { contextPatchSchema } from "../context/context.schemas";
import { contextService } from "../context/context.service";
import { projectContextNormalizerService } from "../context/projectContextNormalizer.service";
import { versionMetadataService } from "../context/versionMetadata.service";
import { projectService } from "../projects/project.service";
import type { ApplySuggestionInput, CreateSuggestionInput } from "./suggestion.schemas";

const hasNormalizedContent = (value: ReturnType<typeof projectContextNormalizerService.normalize>): boolean =>
  Boolean(
    value.goal ||
    value.aiInstructions ||
    value.techStack.length ||
    value.features.length ||
    value.decisions.length ||
    value.constraints.length ||
    value.issues.length ||
    value.dependencies.length ||
    value.nextSteps.length ||
    value.architectureNotes.length
  );

export const suggestionService = {
  async createSuggestion(userId: string, projectId: string, input: CreateSuggestionInput) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.contextSuggestion.create({
      data: {
        projectId,
        title: input.title,
        source: input.source,
        suggestedPatch: input.suggestedPatch
      }
    });
  },

  async listSuggestions(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.contextSuggestion.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });
  },

  async applySuggestion(
    userId: string,
    projectId: string,
    suggestionId: string,
    input: ApplySuggestionInput
  ) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.$transaction(async (tx) => {
      const suggestion = await tx.contextSuggestion.findFirst({
        where: { id: suggestionId, projectId }
      });

      if (!suggestion) {
        throw new ApiError(404, "Suggestion not found");
      }

      if (suggestion.status === SuggestionStatus.applied) {
        return {
          status: "already_applied",
          message: "This suggestion has already been applied.",
          suggestionId,
          appliedAt: suggestion.appliedAt,
          versionCreated: false
        };
      }

      if (suggestion.status === SuggestionStatus.rejected) {
        throw new ApiError(409, "This suggestion was rejected and cannot be applied.");
      }

      const claimed = await tx.contextSuggestion.updateMany({
        where: {
          id: suggestionId,
          projectId,
          status: SuggestionStatus.pending
        },
        data: {
          status: SuggestionStatus.applied,
          appliedAt: new Date()
        }
      });

      if (claimed.count === 0) {
        const latestSuggestion = await tx.contextSuggestion.findFirst({
          where: { id: suggestionId, projectId }
        });

        if (latestSuggestion?.status === SuggestionStatus.applied) {
          return {
            status: "already_applied",
            message: "This suggestion has already been applied.",
            suggestionId,
            appliedAt: latestSuggestion.appliedAt,
            versionCreated: false
          };
        }

        throw new ApiError(409, "Suggestion is no longer pending.");
      }

      const patch = contextPatchSchema.parse(suggestion.suggestedPatch);
      const existingContext = await tx.projectContext.findUnique({ where: { projectId } });
      if (!existingContext) {
        const normalizedPatch = projectContextNormalizerService.normalize(patch);
        if (!hasNormalizedContent(normalizedPatch)) {
          const updatedSuggestion = await tx.contextSuggestion.findUnique({
            where: { id: suggestionId }
          });

          return {
            status: "no_changes",
            message: "Suggestion did not contain durable ProjectContext content after cleanup.",
            suggestionId,
            versionCreated: false,
            suggestion: updatedSuggestion
          };
        }

        const context = await tx.projectContext.create({
          data: {
            projectId,
            goal: normalizedPatch.goal,
            techStack: normalizedPatch.techStack,
            features: normalizedPatch.features,
            decisions: normalizedPatch.decisions,
            constraints: normalizedPatch.constraints,
            issues: normalizedPatch.issues,
            dependencies: normalizedPatch.dependencies,
            nextSteps: normalizedPatch.nextSteps,
            architectureNotes: normalizedPatch.architectureNotes,
            aiInstructions: normalizedPatch.aiInstructions,
            currentVersionNumber: 1
          }
        });
        const previousContext = {
          ...context,
          goal: "",
          techStack: [],
          features: [],
          decisions: [],
          constraints: [],
          issues: [],
          dependencies: [],
          nextSteps: [],
          architectureNotes: [],
          aiInstructions: "",
          currentVersionNumber: 0
        };
        const metadata = versionMetadataService.generateVersionMetadata({
          source: VersionSource.suggestion,
          patch: normalizedPatch,
          previousContext,
          nextContext: context,
          suggestionTitle: suggestion.title,
          summaryHint: input.changeSummary
        });
        const version = await tx.contextVersion.create({
          data: {
            projectId,
            versionNumber: 1,
            snapshot: contextService.toSnapshot(context),
            versionTitle: metadata.versionTitle,
            changeSummary: metadata.changeSummary,
            changedSections: versionMetadataService.asJson(metadata.changedSections),
            changePreview: versionMetadataService.asJson(metadata.changePreview),
            source: VersionSource.suggestion
          }
        });
        const updatedSuggestion = await tx.contextSuggestion.findUnique({
          where: { id: suggestionId }
        });

        return {
          status: "applied",
          versionCreated: true,
          context,
          version,
          suggestion: updatedSuggestion
        };
      }

      const mergedData = contextService.buildMergedContextData(existingContext, patch, input.mergeMode);
      const nextVersionNumber = existingContext.currentVersionNumber + 1;
      const candidateContext = {
        ...existingContext,
        ...mergedData,
        currentVersionNumber: nextVersionNumber
      } as typeof existingContext;

      const metadata = versionMetadataService.generateVersionMetadata({
        source: VersionSource.suggestion,
        patch,
        previousContext: existingContext,
        nextContext: candidateContext,
        suggestionTitle: suggestion.title,
        summaryHint: input.changeSummary
      });

      if (Object.keys(metadata.changedSections).length === 0) {
        const updatedSuggestion = await tx.contextSuggestion.findUnique({
          where: { id: suggestionId }
        });

        return {
          status: "no_changes",
          message: "Suggestion did not change ProjectContext because all items already exist.",
          suggestionId,
          versionCreated: false,
          suggestion: updatedSuggestion
        };
      }

      const context = await tx.projectContext.update({
        where: { projectId },
        data: {
          ...mergedData,
          currentVersionNumber: nextVersionNumber
        }
      });

      const version = await tx.contextVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          snapshot: contextService.toSnapshot(context),
          versionTitle: metadata.versionTitle,
          changeSummary: metadata.changeSummary,
          changedSections: versionMetadataService.asJson(metadata.changedSections),
          changePreview: versionMetadataService.asJson(metadata.changePreview),
          source: VersionSource.suggestion
        }
      });

      const updatedSuggestion = await tx.contextSuggestion.findUnique({
        where: { id: suggestionId }
      });

      return {
        status: "applied",
        versionCreated: true,
        context,
        version,
        suggestion: updatedSuggestion
      };
    });
  },

  async rejectSuggestion(userId: string, projectId: string, suggestionId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const suggestion = await prisma.contextSuggestion.findFirst({
      where: { id: suggestionId, projectId }
    });

    if (!suggestion) {
      throw new ApiError(404, "Suggestion not found");
    }

    if (suggestion.status !== SuggestionStatus.pending) {
      throw new ApiError(409, `Suggestion is already ${suggestion.status}`);
    }

    return prisma.contextSuggestion.update({
      where: { id: suggestionId },
      data: { status: SuggestionStatus.rejected }
    });
  },

  async reopenSuggestion(userId: string, projectId: string, suggestionId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const suggestion = await prisma.contextSuggestion.findFirst({
      where: { id: suggestionId, projectId }
    });

    if (!suggestion) {
      throw new ApiError(404, "Suggestion not found");
    }

    if (suggestion.status !== SuggestionStatus.rejected) {
      throw new ApiError(400, "Only rejected suggestions can be reopened.");
    }

    return prisma.contextSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.pending,
        appliedAt: null
      }
    });
  },

  async deleteSuggestion(userId: string, projectId: string, suggestionId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const suggestion = await prisma.contextSuggestion.findFirst({
      where: { id: suggestionId, projectId }
    });

    if (!suggestion) {
      throw new ApiError(404, "Suggestion not found");
    }

    if (suggestion.status === SuggestionStatus.pending) {
      throw new ApiError(400, "Pending suggestions must be applied or rejected before deletion.");
    }

    await prisma.contextSuggestion.delete({
      where: { id: suggestionId }
    });

    return { success: true };
  }
};
