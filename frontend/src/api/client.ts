export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  defaultBranch?: string | null;
  createdAt: string;
  context?: { currentVersionNumber: number; updatedAt: string } | null;
};

export type ProjectContext = {
  goal: string;
  techStack: unknown;
  features: unknown;
  decisions: unknown;
  constraints: unknown;
  issues: unknown;
  dependencies: unknown;
  nextSteps: unknown;
  architectureNotes: unknown;
  aiInstructions: string;
  currentVersionNumber: number;
  updatedAt: string;
};

export type OptimizedContextResult = {
  optimizedContext?: {
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
  optimizationSummary: string;
  tokenEstimate: number;
  originalTokenEstimate: number;
  estimatedSavingsPercent: number;
};

export type Suggestion = {
  id: string;
  title: string;
  source: string;
  status: string;
  suggestedPatch: Record<string, unknown>;
  confidence?: string | null;
  reasoningSummary?: string | null;
  createdAt: string;
};

export type Version = {
  id: string;
  versionNumber: number;
  snapshot: unknown;
  versionTitle?: string | null;
  changeSummary: string;
  changedSections?: Record<string, number | boolean>;
  changePreview?: Record<string, string[]>;
  source: string;
  createdAt: string;
  preview?: {
    goal?: string;
    features?: string[];
    decisions?: string[];
    nextSteps?: string[];
    counts?: {
      featuresCount: number;
      decisionsCount: number;
      constraintsCount: number;
      issuesCount: number;
      nextStepsCount: number;
    };
  };
};

export type GitHubConnection = {
  id: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  defaultBranch: string;
  installationId?: string | null;
  repositoryId?: string | null;
  accountLogin?: string | null;
  accountType?: string | null;
  connectionType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GitHubConnectionResult = {
  githubAppConnections: GitHubConnection[];
  manualConnections: GitHubConnection[];
  primaryConnectionType: "github_app" | "manual" | null;
};

export type GitHubEvent = {
  id: string;
  eventType: string;
  branch?: string | null;
  commitSha?: string | null;
  prNumber?: number | null;
  title?: string | null;
  status: string;
  createdAt: string;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

const tokenKey = "contextVaultToken";

export const authStore = {
  getToken: () => localStorage.getItem(tokenKey),
  setToken: (token: string) => localStorage.setItem(tokenKey, token),
  clear: () => localStorage.removeItem(tokenKey)
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authStore.getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Request failed");
  }
  return data as T;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: unknown }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  signup: (body: { email: string; password: string; name?: string }) =>
    request<{ token: string; user: unknown }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  projects: () => request<{ projects: Project[] }>("/api/projects"),
  createProject: (body: { name: string; description?: string; repoUrl?: string; defaultBranch?: string }) =>
    request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  context: (projectId: string) => request<{ context: ProjectContext }>(`/api/projects/${projectId}/context?rebuild=true`),
  optimizedContext: (projectId: string) =>
    request<OptimizedContextResult>(`/api/projects/${projectId}/context/optimized?mode=full-clean`),
  versions: (projectId: string) => request<{ versions: Version[] }>(`/api/projects/${projectId}/versions`),
  suggestions: (projectId: string) => request<{ suggestions: Suggestion[] }>(`/api/projects/${projectId}/suggestions`),
  captureContext: (projectId: string, body: { rawText: string; mode: string }) =>
    request<{ suggestion: Suggestion }>(`/api/projects/${projectId}/context/capture`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  applySuggestion: (projectId: string, suggestionId: string) =>
    request(`/api/projects/${projectId}/suggestions/${suggestionId}/apply`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  rejectSuggestion: (projectId: string, suggestionId: string) =>
    request(`/api/projects/${projectId}/suggestions/${suggestionId}/reject`, { method: "POST" }),
  githubConnection: (projectId: string) =>
    request<GitHubConnectionResult>(`/api/projects/${projectId}/github/connection`),
  githubInstallUrl: (projectId: string) =>
    request<{ installUrl: string }>(`/api/projects/${projectId}/github/app/install-url`),
  connectGithub: (projectId: string, body: Record<string, string>) =>
    request<{ connection: GitHubConnection }>(`/api/projects/${projectId}/github/connect`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  githubEvents: (projectId: string) =>
    request<{ events: GitHubEvent[] }>(`/api/projects/${projectId}/github/events`),
  apiKeys: () => request<{ apiKeys: ApiKey[] }>("/api/api-keys"),
  createApiKey: (body: { name: string; scopes: string[] }) =>
    request<ApiKey & { key: string }>("/api/api-keys", { method: "POST", body: JSON.stringify(body) }),
  revokeApiKey: (apiKeyId: string) => request(`/api/api-keys/${apiKeyId}`, { method: "DELETE" })
};
