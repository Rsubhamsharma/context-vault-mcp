import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { projectService } from "../projects/project.service";

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

const toItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => typeof item === "string" ? item : JSON.stringify(item))
    .filter((item) => item.trim().length > 0);
};

const short = (value: unknown): string => {
  const text = typeof value === "string" ? value : "";
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
};

const previewForSnapshot = (snapshot: unknown) => {
  const raw = asRecord(snapshot);
  const features = toItems(raw.features);
  const decisions = toItems(raw.decisions);
  const constraints = toItems(raw.constraints);
  const issues = toItems(raw.issues);
  const nextSteps = toItems(raw.nextSteps);

  return {
    goal: short(raw.goal),
    features: features.slice(0, 2),
    decisions: decisions.slice(0, 2),
    nextSteps: nextSteps.slice(0, 2),
    counts: {
      featuresCount: features.length,
      decisionsCount: decisions.length,
      constraintsCount: constraints.length,
      issuesCount: issues.length,
      nextStepsCount: nextSteps.length
    }
  };
};

const changedSectionsFallback = (snapshot: unknown) => {
  const raw = asRecord(snapshot);
  return {
    features: toItems(raw.features).length,
    decisions: toItems(raw.decisions).length,
    constraints: toItems(raw.constraints).length,
    issues: toItems(raw.issues).length,
    nextSteps: toItems(raw.nextSteps).length
  };
};

export const versionService = {
  async listVersions(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);
    const versions = await prisma.contextVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: "desc" }
    });

    return versions.map((version) => ({
      ...version,
      versionTitle: version.versionTitle ?? "Project Context Updated",
      changedSections: version.changedSections ?? changedSectionsFallback(version.snapshot),
      changePreview: version.changePreview ?? {},
      preview: previewForSnapshot(version.snapshot)
    }));
  },

  async getVersion(userId: string, projectId: string, versionNumber: number) {
    await projectService.assertProjectOwner(userId, projectId);
    const version = await prisma.contextVersion.findUnique({
      where: {
        projectId_versionNumber: {
          projectId,
          versionNumber
        }
      }
    });

    if (!version) {
      throw new ApiError(404, "Context version not found");
    }

    return version;
  },

  async getVersionContext(userId: string, projectId: string, versionNumber: number) {
    const version = await this.getVersion(userId, projectId, versionNumber);

    return {
      versionNumber: version.versionNumber,
      source: version.source,
      versionTitle: version.versionTitle ?? "Project Context Updated",
      changeSummary: version.changeSummary,
      changedSections: version.changedSections ?? changedSectionsFallback(version.snapshot),
      changePreview: version.changePreview ?? {},
      createdAt: version.createdAt,
      snapshot: version.snapshot
    };
  }
};
