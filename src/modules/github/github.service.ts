import crypto from "crypto";
import fs from "fs";
import { GitHubConnectionType, GitHubEventStatus, Prisma, SuggestionSource, SuggestionStatus } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import { projectService } from "../projects/project.service";
import { githubAnalysisService, type GitHubAnalysisInput, type GitHubChangedFile } from "./githubAnalysis.service";
import { githubSuggestionRefinementService, type GitHubSuggestionPatch, type GitHubSuggestionRefinementResult } from "./githubSuggestionRefinement.service";
import type { ConnectGitHubInput, ReprocessGitHubEventInput } from "./github.schemas";

type JsonObject = Record<string, unknown>;

type InstallationRepository = {
  id: number | string;
  name?: string;
  full_name?: string;
  html_url?: string;
  default_branch?: string;
  owner?: { login?: string; type?: string };
};

type PendingGitHubAppSetup = {
  id: string;
  userId: string;
  projectId: string;
  nonce: string;
  status: "pending" | "completed";
  createdAt: number;
  expiresAt: number;
  installationId?: string;
};

class GitHubAppSetupError extends Error {
  constructor(
    public readonly internalReason: string,
    public readonly safeReason: string,
    message: string
  ) {
    super(message);
  }
}

const pendingGitHubAppSetups = new Map<string, PendingGitHubAppSetup>();
const installationWebhookRepositories = new Map<string, InstallationRepository[]>();

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
  installationId?: string;
  repositoryId?: string;
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
  installationId: true,
  repositoryId: true,
  accountLogin: true,
  accountType: true,
  connectionType: true,
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

const normalizePrivateKey = (value: string): string => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.replace(/\\n/g, "\n");
};

const loadGitHubAppPrivateKey = (): { privateKey: string; source: "path" | "env" } => {
  if (env.GITHUB_APP_PRIVATE_KEY_PATH) {
    const pathExists = fs.existsSync(env.GITHUB_APP_PRIVATE_KEY_PATH);
    console.log("[github-app] private key path configured", {
      privateKeySource: "path",
      pathConfigured: true,
      pathExists
    });
    try {
      const privateKey = normalizePrivateKey(fs.readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH, "utf8"));
      console.log("[github-app] private key loaded", {
        privateKeyLoaded: Boolean(privateKey),
        privateKeySource: "path",
        byteLength: Buffer.byteLength(privateKey),
        hasBeginMarker: privateKey.includes("BEGIN"),
        hasEndMarker: privateKey.includes("END")
      });
      if (!privateKey) {
        throw new GitHubAppSetupError("private_key_empty", "repo_fetch_failed", "GitHub App private key file is empty");
      }
      return { privateKey, source: "path" };
    } catch (error) {
      console.log("[github-app] private key loaded", { privateKeyLoaded: false, privateKeySource: "path" });
      if (error instanceof GitHubAppSetupError) {
        throw error;
      }
      throw new GitHubAppSetupError("private_key_path_read_failed", "repo_fetch_failed", "GitHub App private key file could not be read");
    }
  }

  const privateKey = env.GITHUB_APP_PRIVATE_KEY ? normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY) : "";
  console.log("[github-app] private key loaded", {
    privateKeyLoaded: Boolean(privateKey),
    privateKeySource: "env",
    byteLength: Buffer.byteLength(privateKey),
    hasBeginMarker: privateKey.includes("BEGIN"),
    hasEndMarker: privateKey.includes("END")
  });
  if (!privateKey) {
    throw new GitHubAppSetupError("private_key_missing", "repo_fetch_failed", "GitHub App private key is not configured");
  }
  return { privateKey, source: "env" };
};

const gitHubPrivateKeyConfigSummary = () => ({
  privateKeyPathConfigured: Boolean(env.GITHUB_APP_PRIVATE_KEY_PATH),
  privateKeyPathExists: env.GITHUB_APP_PRIVATE_KEY_PATH ? fs.existsSync(env.GITHUB_APP_PRIVATE_KEY_PATH) : false,
  privateKeyEnvConfigured: Boolean(env.GITHUB_APP_PRIVATE_KEY),
  selectedSource: env.GITHUB_APP_PRIVATE_KEY_PATH ? "path" : "env"
});

const base64Url = (input: Buffer | string): string => {
  return Buffer.from(input).toString("base64url");
};

const signGitHubAppJwt = (): string => {
  if (!env.GITHUB_APP_ID) {
    throw new GitHubAppSetupError("app_id_missing", "repo_fetch_failed", "GitHub App ID is not configured");
  }

  const { privateKey } = loadGitHubAppPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: env.GITHUB_APP_ID
  }));
  const data = `${header}.${payload}`;
  let signature: string;
  try {
    signature = crypto
      .createSign("RSA-SHA256")
      .update(data)
      .sign(privateKey, "base64url");
  } catch {
    throw new GitHubAppSetupError("private_key_invalid", "repo_fetch_failed", "GitHub App private key could not sign JWT");
  }

  return `${data}.${signature}`;
};

const signedState = (payload: { userId: string; projectId: string; timestamp: number; nonce: string }): string => {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", env.JWT_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
};

const verifySignedState = (state: string | undefined): { userId: string; projectId: string; timestamp: number; nonce: string } => {
  if (!state) {
    throw new ApiError(400, "Missing GitHub App setup state");
  }

  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) {
    throw new ApiError(400, "Invalid GitHub App setup state");
  }

  const expected = crypto.createHmac("sha256", env.JWT_SECRET).update(encoded).digest("base64url");
  if (!timingSafeEquals(expected, signature)) {
    throw new ApiError(400, "Invalid GitHub App setup state signature");
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    userId?: unknown;
    projectId?: unknown;
    timestamp?: unknown;
    nonce?: unknown;
  };

  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.projectId !== "string" ||
    typeof parsed.timestamp !== "number" ||
    typeof parsed.nonce !== "string"
  ) {
    throw new ApiError(400, "Invalid GitHub App setup state payload");
  }

  if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
    throw new ApiError(400, "Expired GitHub App setup state");
  }

  return {
    userId: parsed.userId,
    projectId: parsed.projectId,
    timestamp: parsed.timestamp,
    nonce: parsed.nonce
  };
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

const changedFilesFromPushCommits = (commits: JsonObject[]): GitHubChangedFile[] => {
  const files = new Map<string, GitHubChangedFile>();

  for (const commit of commits) {
    const groups: Array<[unknown, string]> = [
      [commit.added, "added"],
      [commit.modified, "modified"],
      [commit.removed, "removed"]
    ];

    for (const [value, status] of groups) {
      if (!Array.isArray(value)) {
        continue;
      }

      for (const filename of value) {
        if (typeof filename !== "string" || !filename.trim()) {
          continue;
        }

        files.set(filename, {
          filename,
          status
        });
      }
    }
  }

  return Array.from(files.values()).slice(0, 50);
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
  const repositoryObject = asRecord(payload.repository);
  const installation = asRecord(payload.installation);
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
  const commitChangedFiles = changedFiles.length > 0 ? changedFiles : changedFilesFromPushCommits(commits);

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
    changedFiles: commitChangedFiles,
    installationId: numberValue(installation.id)?.toString(),
    repositoryId: numberValue(repositoryObject.id)?.toString(),
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
      changedFiles: commitChangedFiles,
      installationId: numberValue(installation.id)?.toString(),
      repositoryId: numberValue(repositoryObject.id)?.toString(),
      compareUrl: stringValue(payload.compare)
    }
  };
};

const parsePullRequestEvent = (payload: JsonObject): ParsedGitHubEvent => {
  const repository = parseRepository(payload);
  const repositoryObject = asRecord(payload.repository);
  const installation = asRecord(payload.installation);
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
    installationId: numberValue(installation.id)?.toString(),
    repositoryId: numberValue(repositoryObject.id)?.toString(),
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
      installationId: numberValue(installation.id)?.toString(),
      repositoryId: numberValue(repositoryObject.id)?.toString(),
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

const verifySignatureWithSecret = (
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string | undefined,
  errorMessage: string
): void => {
  if (!secret) {
    throw new ApiError(401, errorMessage);
  }

  if (!rawBody || !signature?.startsWith("sha256=")) {
    throw new ApiError(401, "Missing GitHub webhook signature");
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
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

const toStringItems = (value: unknown): string[] => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
};

const includesAnyText = (text: string, terms: readonly string[]): boolean => {
  return terms.some((term) => text.includes(term));
};

const patchArrayFields = [
  "features",
  "decisions",
  "constraints",
  "issues",
  "dependencies",
  "nextSteps",
  "architectureNotes"
] as const;

const patchHasNewInformation = (context: Awaited<ReturnType<typeof prisma.projectContext.findUnique>>, patch: GitHubSuggestionPatch): boolean => {
  if (!context) {
    return patchArrayFields.some((field) => patch[field].length > 0) || Boolean(patch.aiInstructions?.trim());
  }

  for (const field of patchArrayFields) {
    const existing = new Set(toStringItems(context[field]).map((item) => item.trim().toLowerCase()));
    if (patch[field].some((item) => item.trim() && !existing.has(item.trim().toLowerCase()))) {
      return true;
    }
  }

  return Boolean(patch.aiInstructions?.trim() && patch.aiInstructions.trim() !== context.aiInstructions.trim());
};

const isNoisyGitHubChange = (parsed: ParsedGitHubEvent, result: GitHubSuggestionRefinementResult): boolean => {
  const signalText = [
    parsed.title,
    ...parsed.commitMessages,
    ...(parsed.changedFiles?.map((file) => file.filename) ?? [])
  ].filter(Boolean).join(" ").toLowerCase();

  const onlyReviewNextStep =
    result.suggestedPatch.features.length === 0 &&
    result.suggestedPatch.decisions.length === 0 &&
    result.suggestedPatch.constraints.length === 0 &&
    result.suggestedPatch.issues.length === 0 &&
    result.suggestedPatch.dependencies.length === 0 &&
    result.suggestedPatch.architectureNotes.length === 0;

  const looksTrivial = includesAnyText(signalText, [
    "typo",
    "readme typo",
    "formatting",
    "whitespace",
    "lint",
    "prettier",
    "generic test",
    "test commit"
  ]);

  const packageLockOnly = parsed.changedFiles?.length
    ? parsed.changedFiles.every((file) => file.filename.toLowerCase().endsWith("package-lock.json"))
    : false;

  return result.confidence === "low" && (onlyReviewNextStep || looksTrivial || packageLockOnly);
};

const processGitHubSuggestion = async (
  projectId: string,
  eventId: string,
  parsed: ParsedGitHubEvent,
  failureReason: string
) => {
  console.log("[github-analysis] processing GitHub suggestion", { projectId, eventId, failureReason });
  const currentProjectContext = await prisma.projectContext.findUnique({ where: { projectId } });
  console.log("[github-analysis] currentProjectContextLoaded", {
    projectId,
    currentProjectContextLoaded: Boolean(currentProjectContext)
  });

  const deterministicAnalysis = githubAnalysisService.analyze(analysisInputFromParsedEvent(parsed));
  console.log("[github-analysis] deterministic suggestion", {
    deterministicSuggestionTitle: deterministicAnalysis.title
  });

  const deterministicSuggestion = {
    title: deterministicAnalysis.title,
    suggestedPatch: {
      features: deterministicAnalysis.suggestedPatch.features,
      decisions: deterministicAnalysis.suggestedPatch.decisions,
      constraints: deterministicAnalysis.suggestedPatch.constraints,
      issues: deterministicAnalysis.suggestedPatch.issues,
      dependencies: deterministicAnalysis.suggestedPatch.dependencies,
      nextSteps: deterministicAnalysis.suggestedPatch.nextSteps,
      architectureNotes: deterministicAnalysis.suggestedPatch.architectureNotes
    },
    confidence: deterministicAnalysis.confidence,
    reasoningSummary: deterministicAnalysis.reasoningSummary
  };

  const refinementAttempt = currentProjectContext
    ? await githubSuggestionRefinementService.refine({
        eventType: parsed.eventType,
        action: parsed.action,
        branch: parsed.branch,
        commitMessages: parsed.commitMessages,
        prTitle: parsed.title,
        changedFiles: parsed.changedFiles,
        repository: {
          owner: parsed.repoOwner,
          name: parsed.repoName,
          fullName: parsed.repositoryFullName
        },
        currentProjectContext,
        deterministicSuggestion
      })
    : {
        attempted: false,
        succeeded: false,
        fallbackUsed: true,
        fallbackReason: "missing_project_context",
        result: { ...deterministicSuggestion, refinementUsed: false }
      };

  const finalSuggestion = refinementAttempt.result;
  const skippedNoMeaningfulChange =
    !patchHasNewInformation(currentProjectContext, finalSuggestion.suggestedPatch) ||
    isNoisyGitHubChange(parsed, finalSuggestion);

  console.log("[github-analysis] refinement result", {
    aiRefinementAttempted: refinementAttempt.attempted,
    aiRefinementSucceeded: refinementAttempt.succeeded,
    fallbackUsed: refinementAttempt.fallbackUsed,
    fallbackReason: refinementAttempt.fallbackReason,
    skippedNoMeaningfulChange,
    finalSuggestionTitle: finalSuggestion.title,
    finalConfidence: finalSuggestion.confidence
  });

  if (skippedNoMeaningfulChange) {
    await prisma.gitHubEvent.update({
      where: { id: eventId },
      data: {
        status: GitHubEventStatus.skipped,
        errorMessage: "No meaningful context update detected",
        processedAt: new Date()
      }
    });
    console.log("No meaningful context update detected", { projectId, eventId });
    return {
      status: "skipped" as const,
      eventId,
      reason: "No meaningful context update detected"
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const suggestion = await tx.contextSuggestion.create({
      data: {
        projectId,
        title: finalSuggestion.title,
        source: SuggestionSource.github,
        suggestedPatch: finalSuggestion.suggestedPatch as Prisma.InputJsonObject,
        reasoningSummary: finalSuggestion.reasoningSummary,
        confidence: finalSuggestion.confidence,
        relatedGithubEventId: eventId
      }
    });

    const processedEvent = await tx.gitHubEvent.update({
      where: { id: eventId },
      data: {
        status: GitHubEventStatus.processed,
        processedAt: new Date(),
        errorMessage: null
      }
    });

    return { event: processedEvent, suggestion };
  });

  return {
    status: "processed" as const,
    eventId: result.event.id,
    suggestionId: result.suggestion.id,
    confidence: finalSuggestion.confidence,
    refinementUsed: finalSuggestion.refinementUsed
  };
};

const gitHubHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": env.GITHUB_APP_NAME
});

const installationToken = async (installationId: string): Promise<string> => {
  let appJwt: string;
  try {
    appJwt = signGitHubAppJwt();
    console.log("[github-app] app JWT created", { created: true });
  } catch (error) {
    console.log("[github-app] app JWT created", { created: false });
    throw error;
  }

  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: gitHubHeaders(appJwt)
  });

  if (!response.ok) {
    const body = await response.text();
    console.log("[github-app] installation token failed", {
      installationId,
      status: response.status,
      bodyPreview: body.slice(0, 200)
    });
    throw new GitHubAppSetupError("installation_token_failed", "repo_fetch_failed", "Failed to create GitHub App installation token");
  }

  const data = await response.json() as { token?: string };
  if (!data.token) {
    throw new GitHubAppSetupError("installation_token_response_invalid", "repo_fetch_failed", "GitHub App installation token response was invalid");
  }

  console.log("[github-app] installation token created", { installationId, created: true });
  return data.token;
};

const fetchInstallationRepositories = async (installationId: string): Promise<InstallationRepository[]> => {
  const token = await installationToken(installationId);
  const response = await fetch("https://api.github.com/installation/repositories", {
    headers: gitHubHeaders(token)
  });

  if (!response.ok) {
    const body = await response.text();
    console.log("[github-app] repositories API failed", {
      installationId,
      status: response.status,
      bodyPreview: body.slice(0, 300)
    });
    throw new GitHubAppSetupError("repositories_api_failed", "repo_fetch_failed", "Failed to fetch GitHub App installation repositories");
  }

  const data = await response.json() as JsonObject;
  if (!Array.isArray(data.repositories)) {
    console.log("[github-app] repositories response shape invalid", {
      installationId,
      responseKeys: Object.keys(data)
    });
    throw new GitHubAppSetupError("repositories_response_shape_invalid", "repo_fetch_failed", "GitHub installation repositories response shape was invalid");
  }

  return data.repositories as InstallationRepository[];
};

const setupRedirectUrl = (projectId: string, status: "success" | "error" | "pending", reason?: string): string => {
  const params = new URLSearchParams({ installation: status });
  if (reason) {
    params.set("reason", reason);
  }
  return `${env.FRONTEND_URL}/projects/${encodeURIComponent(projectId)}/github?${params.toString()}`;
};

const setupErrorDetails = (error: unknown): { internalReason: string; safeReason: string; message: string } => {
  if (error instanceof GitHubAppSetupError) {
    return {
      internalReason: error.internalReason,
      safeReason: error.safeReason,
      message: error.message
    };
  }

  return {
    internalReason: "unknown_setup_error",
    safeReason: "repo_fetch_failed",
    message: error instanceof Error ? error.message : "Unknown GitHub App setup error"
  };
};

const selectedRepositoryFullNames = (repositories: InstallationRepository[]): string[] => {
  return repositories.map((repository) => {
    if (repository.full_name) {
      return repository.full_name;
    }
    const owner = repository.owner?.login ?? "unknown";
    const name = repository.name ?? "unknown";
    return `${owner}/${name}`;
  });
};

const repositoriesFromInstallationWebhook = (payload: JsonObject): InstallationRepository[] => {
  const repositoryLists = [payload.repositories, payload.repositories_added]
    .filter((value): value is unknown[] => Array.isArray(value));
  return repositoryLists.flatMap((repositories) => repositories.map((repository) => asRecord(repository) as InstallationRepository));
};

const repositoryListFromPayload = (payload: JsonObject, key: string): InstallationRepository[] => {
  const value = payload[key];
  return Array.isArray(value) ? value.map((repository) => asRecord(repository) as InstallationRepository) : [];
};

const findPendingInstall = (installationId?: string): PendingGitHubAppSetup | undefined => {
  if (installationId) {
    const byInstallation = pendingGitHubAppSetups.get(installationId);
    if (byInstallation && byInstallation.expiresAt > Date.now()) {
      return byInstallation;
    }
  }

  return [...pendingGitHubAppSetups.values()]
    .filter((pending) => pending.status === "pending" && pending.expiresAt > Date.now())
    .sort((left, right) => right.createdAt - left.createdAt)[0];
};

const rememberPendingInstall = (pending: PendingGitHubAppSetup): void => {
  pendingGitHubAppSetups.set(pending.nonce, pending);
  if (pending.installationId) {
    pendingGitHubAppSetups.set(pending.installationId, pending);
  }
};

const completePendingInstall = (pending: PendingGitHubAppSetup, installationId: string): void => {
  pending.status = "completed";
  pending.installationId = installationId;
  rememberPendingInstall(pending);
};

const activeConnectionForInstallation = async (installationId: string) => {
  return prisma.gitHubConnection.findFirst({
    where: {
      installationId,
      connectionType: GitHubConnectionType.github_app,
      isActive: true
    },
    select: safeConnectionSelect
  });
};

const upsertGitHubAppConnections = async (
  userId: string,
  projectId: string,
  installationId: string,
  repositories: InstallationRepository[],
  options: { accountLogin?: string; accountType?: string; deactivateExisting?: boolean } = {}
) => {
  try {
    return await prisma.$transaction(async (tx) => {
    const deactivated = options.deactivateExisting === false
      ? { count: 0 }
      : await tx.gitHubConnection.updateMany({
          where: {
            projectId,
            connectionType: GitHubConnectionType.github_app,
            isActive: true
          },
          data: { isActive: false }
        });

    console.log("[github-app] previous active github_app connections deactivated", {
      projectId,
      count: deactivated.count
    });

    const connections = [];

    for (const repository of repositories) {
      const ownerLogin = repository.owner?.login ?? repository.full_name?.split("/")[0];
      const repoName = repository.name ?? repository.full_name?.split("/")[1];
      if (!ownerLogin || !repoName || !repository.id) {
        console.log("[github-app] repository metadata invalid", {
          projectId,
          installationId,
          repositoryKeys: Object.keys(asRecord(repository)),
          fullName: repository.full_name,
          name: repository.name,
          hasOwner: Boolean(repository.owner),
          hasId: Boolean(repository.id)
        });
        throw new GitHubAppSetupError("repository_metadata_invalid", "repo_fetch_failed", "GitHub repository metadata was missing owner, name, or id");
      }
      const fullName = repository.full_name ?? `${ownerLogin}/${repoName}`;
      console.log("[github-app] upserting github_app connection", {
        projectId,
        installationId,
        repositoryId: repository.id.toString(),
        repo: fullName,
        connectionType: GitHubConnectionType.github_app
      });
      const connection = await tx.gitHubConnection.upsert({
        where: {
          project_repo_connection_type_unique: {
            projectId,
            repoOwner: ownerLogin,
            repoName,
            connectionType: GitHubConnectionType.github_app
          }
        },
        create: {
          userId,
          projectId,
          repoOwner: ownerLogin,
          repoName,
          repoUrl: repository.html_url ?? `https://github.com/${fullName}`,
          defaultBranch: repository.default_branch ?? "main",
          installationId,
          repositoryId: repository.id.toString(),
          accountLogin: options.accountLogin ?? ownerLogin,
          accountType: options.accountType ?? repository.owner?.type,
          connectionType: GitHubConnectionType.github_app,
          isActive: true
        },
        update: {
          userId,
          repoUrl: repository.html_url ?? `https://github.com/${fullName}`,
          defaultBranch: repository.default_branch ?? "main",
          installationId,
          repositoryId: repository.id.toString(),
          accountLogin: options.accountLogin ?? ownerLogin,
          accountType: options.accountType ?? repository.owner?.type,
          connectionType: GitHubConnectionType.github_app,
          isActive: true
        },
        select: safeConnectionSelect
      });
      connections.push(connection);
    }

    const activeCount = await tx.gitHubConnection.count({
      where: {
        projectId,
        installationId,
        connectionType: GitHubConnectionType.github_app,
        isActive: true
      }
    });

    console.log("[github-app] repo full_names saved", {
      projectId,
      installationId,
      repositories: repositories.map((repository) => repository.full_name ?? `${repository.owner?.login ?? "unknown"}/${repository.name ?? "unknown"}`),
      createdCount: connections.length,
      activeCount
    });

      return connections;
    });
  } catch (error) {
    if (error instanceof GitHubAppSetupError) {
      throw error;
    }
    throw new GitHubAppSetupError("database_connection_creation_failed", "repo_fetch_failed", "Database connection creation failed");
  }
};

export const githubService = {
  async connectRepository(userId: string, projectId: string, input: ConnectGitHubInput) {
    await projectService.assertProjectOwner(userId, projectId);

    return prisma.gitHubConnection.upsert({
      where: {
        project_repo_connection_type_unique: {
          projectId,
          repoOwner: input.repoOwner,
          repoName: input.repoName,
          connectionType: GitHubConnectionType.manual
        }
      },
      create: {
        userId,
        projectId,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        repoUrl: input.repoUrl,
        defaultBranch: input.defaultBranch,
        connectionType: GitHubConnectionType.manual,
        webhookSecretHash: input.webhookSecret ? hashSecret(input.webhookSecret) : undefined
      },
      update: {
        repoUrl: input.repoUrl,
        defaultBranch: input.defaultBranch,
        connectionType: GitHubConnectionType.manual,
        webhookSecretHash: input.webhookSecret ? hashSecret(input.webhookSecret) : undefined,
        isActive: true
      },
      select: safeConnectionSelect
    });
  },

  async getConnection(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);

    const connections = await prisma.gitHubConnection.findMany({
      where: { projectId, userId, isActive: true },
      orderBy: [
        { connectionType: "asc" },
        { updatedAt: "desc" }
      ],
      select: safeConnectionSelect
    });

    const appConnections = connections.filter((item) => item.connectionType === GitHubConnectionType.github_app);
    const manualConnections = connections.filter((item) => item.connectionType === GitHubConnectionType.manual);
    const primaryConnectionType = appConnections.length > 0
      ? GitHubConnectionType.github_app
      : manualConnections.length > 0
        ? GitHubConnectionType.manual
        : null;

    console.log("[github-app] connection endpoint", {
      projectId,
      githubAppConnections: appConnections.length,
      manualConnections: manualConnections.length,
      primaryConnectionType,
      appRepos: appConnections.map((connection) => `${connection.repoOwner}/${connection.repoName}`),
      manualRepos: manualConnections.map((connection) => `${connection.repoOwner}/${connection.repoName}`)
    });

    return {
      githubAppConnections: appConnections,
      manualConnections,
      primaryConnectionType
    };
  },

  async getInstallUrl(userId: string, projectId: string) {
    await projectService.assertProjectOwner(userId, projectId);
    if (!env.GITHUB_APP_SLUG) {
      throw new ApiError(500, "GitHub App slug is not configured");
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const state = signedState({
      userId,
      projectId,
      timestamp: Date.now(),
      nonce
    });
    const pendingInstall: PendingGitHubAppSetup = {
      id: crypto.randomUUID(),
      userId,
      projectId,
      nonce,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    rememberPendingInstall(pendingInstall);

    const installUrl = `https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new?state=${encodeURIComponent(state)}`;
    console.log("[github-app] pending install created", {
      id: pendingInstall.id,
      projectId,
      userId,
      privateKeyConfig: gitHubPrivateKeyConfigSummary()
    });
    console.log("[github-app] install URL generated", {
      projectId,
      userId,
      containsState: installUrl.includes("state=")
    });

    return {
      installUrl
    };
  },

  async handleAppSetup(input: { installationId?: string; setupAction?: string; state?: string }) {
    console.log("[github-app] setup callback received", {
      installation_id: input.installationId,
      setup_action: input.setupAction,
      stateExists: Boolean(input.state)
    });

    let state: ReturnType<typeof verifySignedState>;
    try {
      state = verifySignedState(input.state);
      console.log("[github-app] state verified", {
        verified: true,
        projectId: state.projectId,
        userId: state.userId
      });
    } catch {
      console.log("[github-app] state verified", { verified: false });
      return {
        redirectUrl: `${env.FRONTEND_URL}/projects?github=error`
      };
    }

    try {
      await projectService.assertProjectOwner(state.userId, state.projectId);
    } catch {
      const redirectUrl = setupRedirectUrl(state.projectId, "error", "project");
      console.log("[github-app] redirect URL", { redirectUrl });
      return { redirectUrl };
    }

    if (!input.installationId) {
      const redirectUrl = setupRedirectUrl(state.projectId, "error", "missing_installation");
      console.log("[github-app] setup failed", { internalReason: "missing_installation_id", safeReason: "missing_installation" });
      console.log("[github-app] redirect URL", { redirectUrl });
      return {
        redirectUrl
      };
    }

    const pendingInstall = pendingGitHubAppSetups.get(state.nonce) ?? {
      id: crypto.randomUUID(),
      userId: state.userId,
      projectId: state.projectId,
      nonce: state.nonce,
      status: "pending" as const,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    pendingInstall.installationId = input.installationId;
    rememberPendingInstall(pendingInstall);
    console.log("[github-app] pending install updated with installationId", {
      id: pendingInstall.id,
      projectId: state.projectId,
      userId: state.userId,
      installationId: input.installationId
    });

    try {
      console.log("[github-app] repo fetch attempted", { attempted: true, installationId: input.installationId });
      let repositories = await fetchInstallationRepositories(input.installationId);
      if (repositories.length === 0) {
        const webhookRepositories = installationWebhookRepositories.get(input.installationId);
        if (webhookRepositories?.length) {
          console.log("[github-app] using installation webhook repositories fallback", {
            installationId: input.installationId,
            count: webhookRepositories.length,
            fullNames: selectedRepositoryFullNames(webhookRepositories)
          });
          repositories = webhookRepositories;
        }
      }

      console.log("[github-app] repositories fetched", {
        installationId: input.installationId,
        count: repositories.length,
        fullNames: selectedRepositoryFullNames(repositories)
      });
      console.log("[github-app] repo fetch success", { success: true, installationId: input.installationId });

      if (repositories.length === 0) {
        throw new GitHubAppSetupError("no_repositories_selected", "no_repositories_selected", "No repositories selected for GitHub App installation");
      }

      const connections = await upsertGitHubAppConnections(state.userId, state.projectId, input.installationId, repositories);
      console.log("[github-app] github_app connections created", {
        projectId: state.projectId,
        count: connections.length
      });
      completePendingInstall(pendingInstall, input.installationId);
    } catch (error) {
      const details = setupErrorDetails(error);
      const webhookRepositories = installationWebhookRepositories.get(input.installationId);
      if (details.safeReason === "repo_fetch_failed" && webhookRepositories?.length) {
        try {
          console.log("[github-app] retrying setup with installation webhook repositories fallback", {
            installationId: input.installationId,
            count: webhookRepositories.length,
            fullNames: selectedRepositoryFullNames(webhookRepositories)
          });
          const connections = await upsertGitHubAppConnections(state.userId, state.projectId, input.installationId, webhookRepositories);
          console.log("[github-app] github_app connections created", {
            projectId: state.projectId,
            count: connections.length
          });
          completePendingInstall(pendingInstall, input.installationId);
          const redirectUrl = setupRedirectUrl(state.projectId, "success");
          console.log("[github-app] redirect URL", { redirectUrl });
          return { redirectUrl };
        } catch (fallbackError) {
          const fallbackDetails = setupErrorDetails(fallbackError);
          console.log("[github-app] setup failed", fallbackDetails);
          const redirectUrl = setupRedirectUrl(state.projectId, "error", fallbackDetails.safeReason);
          console.log("[github-app] redirect URL", { redirectUrl });
          return { redirectUrl };
        }
      }

      console.log("[github-app] setup failed", details);
      console.log("[github-app] repo fetch success", { success: false, installationId: input.installationId });
      const redirectUrl = details.safeReason === "no_repositories_selected"
        ? setupRedirectUrl(state.projectId, "error", details.safeReason)
        : setupRedirectUrl(state.projectId, "pending");
      console.log("[github-app] redirect URL", { redirectUrl });
      return {
        redirectUrl
      };
    }

    const redirectUrl = setupRedirectUrl(state.projectId, "success");
    console.log("[github-app] redirect URL", { redirectUrl });
    return {
      redirectUrl
    };
  },

  async resetConnectionsForDev(userId: string, projectId: string) {
    if (env.NODE_ENV === "production") {
      throw new ApiError(404, "Not found");
    }

    await projectService.assertProjectOwner(userId, projectId);
    const activeConnections = await prisma.gitHubConnection.updateMany({
      where: { projectId, userId, isActive: true },
      data: { isActive: false }
    });

    let pendingSetupsCleared = 0;
    for (const [installationId, pending] of pendingGitHubAppSetups.entries()) {
      if (pending.projectId === projectId && pending.userId === userId) {
        pendingGitHubAppSetups.delete(installationId);
        if (pending.installationId) {
          installationWebhookRepositories.delete(pending.installationId);
        }
        pendingSetupsCleared += 1;
      }
    }

    return {
      deactivatedConnections: activeConnections.count,
      pendingSetupsCleared
    };
  },

  async clearConnectionsForDev(userId: string, projectId: string) {
    return this.resetConnectionsForDev(userId, projectId);
  },

  async debugInstallation(userId: string, projectId: string, installationId: string) {
    if (env.NODE_ENV === "production") {
      throw new ApiError(404, "Not found");
    }

    await projectService.assertProjectOwner(userId, projectId);

    let appJwtCreated = false;
    let installationTokenCreated = false;
    try {
      const appJwt = signGitHubAppJwt();
      appJwtCreated = true;
      const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
        method: "POST",
        headers: gitHubHeaders(appJwt)
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          appJwtCreated,
          installationTokenCreated,
          repositoriesCount: 0,
          repositories: [],
          error: `installation_token_failed:${response.status}`,
          bodyPreview: body.slice(0, 200)
        };
      }

      const data = await response.json() as { token?: string };
      installationTokenCreated = Boolean(data.token);
      if (!data.token) {
        return {
          appJwtCreated,
          installationTokenCreated,
          repositoriesCount: 0,
          repositories: [],
          error: "installation_token_response_invalid"
        };
      }

      const repositoriesResponse = await fetch("https://api.github.com/installation/repositories", {
        headers: gitHubHeaders(data.token)
      });
      if (!repositoriesResponse.ok) {
        const body = await repositoriesResponse.text();
        return {
          appJwtCreated,
          installationTokenCreated,
          repositoriesCount: 0,
          repositories: [],
          error: `repositories_api_failed:${repositoriesResponse.status}`,
          bodyPreview: body.slice(0, 200)
        };
      }

      const repositoriesData = await repositoriesResponse.json() as JsonObject;
      if (!Array.isArray(repositoriesData.repositories)) {
        return {
          appJwtCreated,
          installationTokenCreated,
          repositoriesCount: 0,
          repositories: [],
          error: "repositories_response_shape_invalid",
          responseKeys: Object.keys(repositoriesData)
        };
      }

      const repositories = repositoriesData.repositories as InstallationRepository[];
      return {
        appJwtCreated,
        installationTokenCreated,
        repositoriesCount: repositories.length,
        repositories: repositories.map((repository) => ({
          id: repository.id.toString(),
          fullName: repository.full_name ?? `${repository.owner?.login ?? "unknown"}/${repository.name ?? "unknown"}`,
          defaultBranch: repository.default_branch ?? "main"
        }))
      };
    } catch (error) {
      const details = setupErrorDetails(error);
      return {
        appJwtCreated,
        installationTokenCreated,
        repositoriesCount: 0,
        repositories: [],
        error: details.internalReason,
        message: details.message
      };
    }
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
      return await processGitHubSuggestion(connection.projectId, event.id, parsed, "GitHub analysis failed");
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

  async handleAppWebhook(input: {
    eventType?: string;
    deliveryId?: string;
    signature?: string;
    rawBody?: Buffer;
    payload: unknown;
  }) {
    verifySignatureWithSecret(
      input.rawBody,
      input.signature,
      env.GITHUB_APP_WEBHOOK_SECRET,
      "GitHub App webhook signature verification is not configured"
    );
    console.log("[github-app] webhook signature verified", {
      eventType: input.eventType,
      deliveryId: input.deliveryId
    });

    if (input.eventType === "installation" || input.eventType === "installation_repositories") {
      const payload = asRecord(input.payload);
      console.log("[github-app] app webhook metadata event", {
        eventType: input.eventType,
        deliveryId: input.deliveryId,
        payloadKeys: Object.keys(payload)
      });
      if (Object.keys(payload).length === 0) {
        console.log("[github-app] webhook payload is empty", {
          eventType: input.eventType,
          deliveryId: input.deliveryId,
          hint: "Check GitHub webhook Content-Type is application/json and Express body parsing/raw body capture."
        });
      }
      const installationId = numberValue(asRecord(payload.installation).id)?.toString();
      const action = stringValue(payload.action);
      const account = asRecord(payload.account);
      const accountLogin = stringValue(account.login);
      const accountType = stringValue(account.type);

      if (input.eventType === "installation") {
        const repositories = repositoryListFromPayload(payload, "repositories");
        console.log("[github-app] installation webhook received", {
          action,
          installationId,
          repositoriesCount: repositories.length
        });

        if (installationId && repositories.length > 0) {
          installationWebhookRepositories.set(installationId, repositories);
          const pending = findPendingInstall(installationId);
          console.log("[github-app] installation pending matched", {
            matched: Boolean(pending),
            installationId,
            projectId: pending?.projectId,
            userId: pending?.userId
          });

          if (pending) {
            const connections = await upsertGitHubAppConnections(pending.userId, pending.projectId, installationId, repositories, {
              accountLogin,
              accountType
            });
            completePendingInstall(pending, installationId);
            console.log("[github-app] pending install completed from webhook", {
              installationId,
              projectId: pending.projectId,
              userId: pending.userId,
              count: connections.length
            });
          } else {
            console.log("installation webhook received but no pending install mapping found", {
              installationId,
              pendingCount: new Set([...pendingGitHubAppSetups.values()].map((pendingInstall) => pendingInstall.id)).size
            });
          }
        }

        return { status: "processed", reason: "Installation repository metadata accepted; setup callback manages project mapping." };
      }

      const repositoriesAdded = repositoryListFromPayload(payload, "repositories_added");
      const repositoriesRemoved = repositoryListFromPayload(payload, "repositories_removed");
      console.log("[github-app] installation_repositories webhook received", {
        action,
        installationId,
        addedCount: repositoriesAdded.length,
        removedCount: repositoriesRemoved.length
      });

      if (installationId) {
        const existing = await activeConnectionForInstallation(installationId);
        const pending = findPendingInstall(installationId);
        console.log("[github-app] installation_repositories mapping lookup", {
          installationId,
          existingConnectionFound: Boolean(existing),
          pendingInstallFound: Boolean(pending),
          existingProjectId: existing?.projectId,
          pendingProjectId: pending?.projectId
        });

        const target = existing
          ? {
              userId: existing.userId,
              projectId: existing.projectId,
              accountLogin: existing.accountLogin ?? undefined,
              accountType: existing.accountType ?? undefined,
              deactivateExisting: false
            }
          : pending
            ? {
                userId: pending.userId,
                projectId: pending.projectId,
                accountLogin: undefined,
                accountType: undefined,
                deactivateExisting: true
              }
            : null;

        if (target && repositoriesAdded.length > 0) {
          const connections = await upsertGitHubAppConnections(target.userId, target.projectId, installationId, repositoriesAdded, {
            accountLogin: accountLogin ?? target.accountLogin,
            accountType: accountType ?? target.accountType,
            deactivateExisting: target.deactivateExisting
          });
          if (pending) {
            completePendingInstall(pending, installationId);
          }
          console.log("[github-app] installation repositories added", {
            installationId,
            projectId: target.projectId,
            pendingCompleted: Boolean(pending),
            count: connections.length
          });
        } else if (!target && repositoriesAdded.length > 0) {
          installationWebhookRepositories.set(installationId, repositoriesAdded);
          console.log("[github-app] installation_repositories received but no mapping target found", {
            installationId,
            addedCount: repositoriesAdded.length,
            pendingCount: new Set([...pendingGitHubAppSetups.values()].map((pendingInstall) => pendingInstall.id)).size
          });
        }

        if (repositoriesRemoved.length > 0) {
          const removed = await prisma.gitHubConnection.updateMany({
            where: {
              installationId,
              connectionType: GitHubConnectionType.github_app,
              OR: repositoriesRemoved.map((repository) => ({
                repositoryId: repository.id.toString()
              }))
            },
            data: { isActive: false }
          });
          console.log("[github-app] installation repositories removed", {
            installationId,
            count: removed.count
          });
        }
      }

      return { status: "processed", reason: "Installation repository metadata accepted." };
    }

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
      return { status: "skipped", reason: "Unsupported GitHub App event" };
    }

    const connection = parsed.installationId && parsed.repositoryId
      ? await prisma.gitHubConnection.findFirst({
          where: {
            installationId: parsed.installationId,
            repositoryId: parsed.repositoryId,
            connectionType: GitHubConnectionType.github_app,
            isActive: true
          }
        })
      : null;

    const fallbackConnection = connection ?? (parsed.installationId
      ? await prisma.gitHubConnection.findFirst({
          where: {
            installationId: parsed.installationId,
            repoOwner: parsed.repoOwner,
            repoName: parsed.repoName,
            connectionType: GitHubConnectionType.github_app,
            isActive: true
          }
        })
      : null);

    if (!fallbackConnection) {
      console.log("No active GitHub App connection found for installation/repo", {
        installationId: parsed.installationId,
        repositoryId: parsed.repositoryId,
        repository: parsed.repositoryFullName
      });
      return { status: "skipped", reason: "No active GitHub App connection found for installation/repo" };
    }

    const event = await prisma.gitHubEvent.create({
      data: {
        projectId: fallbackConnection.projectId,
        connectionId: fallbackConnection.id,
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
      return await processGitHubSuggestion(fallbackConnection.projectId, event.id, parsed, "GitHub App analysis failed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub App analysis failed";
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
        reason: "GitHub App analysis failed"
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
