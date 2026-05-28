import crypto from "crypto";
import { GitHubEventStatus, Prisma, SuggestionSource, SuggestionStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { projectService } from "../projects/project.service";
import { githubAnalysisService, type GitHubAnalysisInput, type GitHubChangedFile } from "./githubAnalysis.service";
import type { ConnectGitHubInput, ReprocessGitHubEventInput } from "./github.schemas";

type JsonObject = Record<string, unknown>;

type ParsedGitHubEvent = {
  eventType: "push" | "pull_request";
  repoOwner: string;
  repoName: string;
  repositoryFullName: string;
  action?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: number;
  title?: string;
  author?: string;
  compareUrl?: string;
  commitMessages: string[];
  changedFiles?: GitHubChangedFile[];
  merged?: boolean;
  rawMetadata: Prisma.InputJsonObject;
};

const hashSecret = (value: string): string => {
  return crypto.createHash("sha256").update(value).digest("hex");
};

const safeConnectionSelect = {
  id: true,
  userId: true,
  projectId: true,
  repoOwner: true,
  repoName: true,
  repoUrl: true,
  defaultBranch: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

const asRecord = (value: unknown): JsonObject => {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
};

const stringValue = (value: unknown): string | undefined => {
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const numberValue = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const booleanValue = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const safeChangedFiles = (value: unknown): GitHubChangedFile[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const files: GitHubChangedFile[] = [];

  for (const item of value) {
    const file = asRecord(item);
    const filename = stringValue(file.filename);
    if (!filename) {
      continue;
    }

    files.push({
      filename,
      status: stringValue(file.status),
      additions: numberValue(file.additions),
      deletions: numberValue(file.deletions),
      changes: numberValue(file.changes)
    });
  }

  return files.slice(0, 50);
};

const parseRepository = (payload: JsonObject): { owner: string; name: string; fullName: string; url?: string } => {
  const repository = asRecord(payload.repository);
  const owner = asRecord(repository.owner);
  const fullName = stringValue(repository.full_name);
  const ownerLogin = stringValue(owner.login);
  const repoName = stringValue(repository.name);

  if (!fullName || !ownerLogin || !repoName) {
    throw new ApiError(400, "Unsupported GitHub payload: missing repository metadata");
  }

  return {
    owner: ownerLogin,
    name: repoName,
    fullName,
    url: stringValue(repository.html_url)
  };
};

const parseBranchFromRef = (ref: string | undefined): string | undefined => {
  return ref?.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref;
};

const parsePushEvent = (payload: JsonObject): ParsedGitHubEvent => {
  const repository = parseRepository(payload);
  const headCommit = asRecord(payload.head_commit);
  const sender = asRecord(payload.sender);
  const commits = Array.isArray(payload.commits) ? payload.commits.map(asRecord) : [];
  const commitMessages = commits
    .map((commit) => stringValue(commit.message))
    .filter((message): message is string => Boolean(message))
    .slice(0, 10);
  const branch = parseBranchFromRef(stringValue(payload.ref));
  const commitSha = stringValue(payload.after) ?? stringValue(headCommit.id);
  const authorObject = asRecord(headCommit.author);
  const author = stringValue(sender.login) ?? stringValue(authorObject.username) ?? stringValue(authorObject.name);
  const changedFiles = safeChangedFiles(payload.files);

  return {
    eventType: "push",
    repoOwner: repository.owner,
    repoName: repository.name,
    repositoryFullName: repository.fullName,
    branch,
    commitSha,
    author,
    compareUrl: stringValue(payload.compare),
    commitMessages,
    changedFiles,
    rawMetadata: {
      eventType: "push",
      repoOwner: repository.owner,
      repoName: repository.name,
      repository: repository.fullName,
      repositoryUrl: repository.url,
      sender: stringValue(sender.login),
      branch,
      commitSha,
      commitMessages,
      changedFiles,
      compareUrl: stringValue(payload.compare)
    }
  };
};

const parsePullRequestEvent = (payload: JsonObject): ParsedGitHubEvent => {
  const repository = parseRepository(payload);
  const sender = asRecord(payload.sender);
  const pullRequest = asRecord(payload.pull_request);
  const head = asRecord(pullRequest.head);
  const user = asRecord(pullRequest.user);
  const prNumber = numberValue(payload.number);
  const title = stringValue(pullRequest.title);
  const action = stringValue(payload.action);
  const author = stringValue(user.login) ?? stringValue(sender.login);
  const changedFiles = safeChangedFiles(payload.files);
  const merged = booleanValue(pullRequest.merged);

  if (!prNumber || !title) {
    throw new ApiError(400, "Unsupported GitHub pull_request payload");
  }

  return {
    eventType: "pull_request",
    repoOwner: repository.owner,
    repoName: repository.name,
    repositoryFullName: repository.fullName,
    action,
    branch: stringValue(head.ref),
    prNumber,
    title,
    author,
    commitMessages: [],
    changedFiles,
    merged,
    rawMetadata: {
      eventType: "pull_request",
      repoOwner: repository.owner,
      repoName: repository.name,
      repository: repository.fullName,
      repositoryUrl: repository.url,
      sender: stringValue(sender.login),
      action,
      branch: stringValue(head.ref),
      prNumber,
      title,
      author,
      changedFiles,
      merged,
      pullRequestUrl: stringValue(pullRequest.html_url)
    }
  };
};

const timingSafeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifySignature = (rawBody: Buffer | undefined, signature: string | undefined): void => {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    if (env.GITHUB_WEBHOOK_DEV_MODE) {
      return;
    }
    throw new ApiError(401, "GitHub webhook signature verification is not configured");
  }

  if (!rawBody || !signature?.startsWith("sha256=")) {
    throw new ApiError(401, "Missing GitHub webhook signature");
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex")}`;

  if (!timingSafeEquals(expected, signature)) {
    throw new ApiError(401, "Invalid GitHub webhook signature");
  }
};

const parseWebhookPayload = (eventType: string | undefined, payload: JsonObject): ParsedGitHubEvent | null => {
  if (eventType === "push") {
    return parsePushEvent(payload);
  }
  if (eventType === "pull_request") {
    return parsePullRequestEvent(payload);
  }
  return null;
};

const analysisInputFromParsedEvent = (event: ParsedGitHubEvent): GitHubAnalysisInput => ({
  eventType: event.eventType,
  action: event.action,
  branch: event.branch,
  commitSha: event.commitSha,
  prNumber: event.prNumber,
  title: event.title,
  author: event.author,
  commitMessages: event.commitMessages,
  changedFiles: event.changedFiles,
  repoOwner: event.repoOwner,
  repoName: event.repoName,
  merged: event.merged
});

const analysisInputFromMetadata = (metadata: unknown): GitHubAnalysisInput => {
  const raw = asRecord(metadata);
  const eventType = stringValue(raw.eventType);
  if (eventType !== "push" && eventType !== "pull_request") {
    throw new ApiError(400, "GitHub event metadata cannot be reprocessed");
  }

  const commitMessages = Array.isArray(raw.commitMessages)
    ? raw.commitMessages.filter((message): message is string => typeof message === "string")
    : [];

  return {
    eventType,
    action: stringValue(raw.action),
    branch: stringValue(raw.branch),
    commitSha: stringValue(raw.commitSha),
    prNumber: numberValue(raw.prNumber),
    title: stringValue(raw.title),
    author: stringValue(raw.author),
    commitMessages,
    changedFiles: safeChangedFiles(raw.changedFiles),
    repoOwner: stringValue(raw.repoOwner) ?? "unknown",
    repoName: stringValue(raw.repoName) ?? "unknown",
    merged: booleanValue(raw.merged)
  };
};

export const githubService = {
  async connectRepository(userId: string, projectId: string, input: ConnectGitHubInput) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.gitHubConnection.upsert({
      where: { projectId },
      create: {
        userId,
        projectId,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        repoUrl: input.repoUrl,
        defaultBranch: input.defaultBranch,
        webhookSecretHash: input.webhookSecret ? hashSecret(input.webhookSecret) : undefined
      },
      update: {
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        repoUrl: input.repoUrl,
        defaultBranch: input.defaultBranch,
        webhookSecretHash: input.webhookSecret ? hashSecret(input.webhookSecret) : undefined,
        isActive: true
      },
      select: safeConnectionSelect
    });
  },

  async getConnection(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const connection = await prisma.gitHubConnection.findFirst({
      where: { projectId, isActive: true },
      select: safeConnectionSelect
    });

    if (!connection) {
      throw new ApiError(404, "GitHub connection not found");
    }

    return connection;
  },

  async listEvents(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.gitHubEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  },

  async handleWebhook(input: {
    eventType?: string;
    deliveryId?: string;
    signature?: string;
    rawBody?: Buffer;
    payload: unknown;
  }) {
    verifySignature(input.rawBody, input.signature);

    if (input.deliveryId) {
      const existing = await prisma.gitHubEvent.findUnique({
        where: { deliveryId: input.deliveryId }
      });
      if (existing) {
        return { status: "skipped", reason: "Duplicate delivery" };
      }
    }

    const parsed = parseWebhookPayload(input.eventType, asRecord(input.payload));
    if (!parsed) {
      return { status: "skipped", reason: "Unsupported GitHub event" };
    }

    const connection = await prisma.gitHubConnection.findFirst({
      where: {
        repoOwner: parsed.repoOwner,
        repoName: parsed.repoName,
        isActive: true
      }
    });

    if (!connection) {
      return { status: "skipped", reason: "No active Context Vault GitHub connection" };
    }

    const event = await prisma.gitHubEvent.create({
      data: {
        projectId: connection.projectId,
        connectionId: connection.id,
        eventType: parsed.eventType,
        deliveryId: input.deliveryId,
        action: parsed.action,
        branch: parsed.branch,
        commitSha: parsed.commitSha,
        prNumber: parsed.prNumber,
        title: parsed.title,
        author: parsed.author,
        rawMetadata: parsed.rawMetadata,
        status: GitHubEventStatus.received
      }
    });

    try {
      const analysis = githubAnalysisService.analyze(analysisInputFromParsedEvent(parsed));

      const result = await prisma.$transaction(async (tx) => {
        const suggestion = await tx.contextSuggestion.create({
          data: {
            projectId: connection.projectId,
            title: analysis.title,
            source: SuggestionSource.github,
            suggestedPatch: githubAnalysisService.toInputJsonObject(analysis),
            reasoningSummary: analysis.reasoningSummary,
            confidence: analysis.confidence,
            relatedGithubEventId: event.id
          }
        });

        const processedEvent = await tx.gitHubEvent.update({
          where: { id: event.id },
          data: {
            status: GitHubEventStatus.processed,
            processedAt: new Date(),
            errorMessage: null
          }
        });

        return { event: processedEvent, suggestion };
      });

      return {
        status: "processed",
        eventId: result.event.id,
        suggestionId: result.suggestion.id,
        confidence: analysis.confidence
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub analysis failed";
      await prisma.gitHubEvent.update({
        where: { id: event.id },
        data: {
          status: GitHubEventStatus.failed,
          errorMessage: message.slice(0, 500),
          processedAt: new Date()
        }
      });

      return {
        status: "failed",
        eventId: event.id,
        reason: "GitHub analysis failed"
      };
    }
  },

  async reprocessEvent(
    userId: string,
    projectId: string,
    eventId: string,
    input: ReprocessGitHubEventInput
  ) {
    await projectService.assertProjectOwner(userId, projectId);

    const event = await prisma.gitHubEvent.findFirst({
      where: { id: eventId, projectId },
      include: {
        suggestion: true
      }
    });

    if (!event) {
      throw new ApiError(404, "GitHub event not found");
    }

    if (!input.force && event.suggestion?.status === SuggestionStatus.pending) {
      throw new ApiError(409, "GitHub event already has a related pending suggestion");
    }

    const analysis = githubAnalysisService.analyze(analysisInputFromMetadata(event.rawMetadata));

    return prisma.$transaction(async (tx) => {
      if (event.suggestion) {
        await tx.contextSuggestion.update({
          where: { id: event.suggestion.id },
          data: { relatedGithubEventId: null }
        });
      }

      const suggestion = await tx.contextSuggestion.create({
        data: {
          projectId,
          title: analysis.title,
          source: SuggestionSource.github,
          suggestedPatch: githubAnalysisService.toInputJsonObject(analysis),
          reasoningSummary: analysis.reasoningSummary,
          confidence: analysis.confidence,
          relatedGithubEventId: event.id
        }
      });

      const updatedEvent = await tx.gitHubEvent.update({
        where: { id: event.id },
        data: {
          status: GitHubEventStatus.processed,
          processedAt: new Date(),
          errorMessage: null
        }
      });

      return { event: updatedEvent, suggestion };
    });
  }
};
