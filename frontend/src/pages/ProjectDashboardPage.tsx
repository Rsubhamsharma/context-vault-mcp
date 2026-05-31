import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiKey, ApiRequestError, api, GitHubConnection, Project, ProjectContext, Suggestion, Version } from "../api/client";
import { ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

function isContextNotInitializedError(error: unknown) {
  return error instanceof ApiRequestError &&
    error.status === 404 &&
    error.message.toLowerCase().includes("project context is not initialized");
}

function DashboardStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="overview-pill">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function SetupPrompt() {
  return (
    <section className="contextKbEmptyState">
      <h2>Start this vault's memory</h2>
      <p>Create the first ProjectContext by applying a manual, GitHub, or MCP suggestion.</p>
      <div>
        <Link className="actionButton" to="../context">Project Context</Link>
        <Link className="ghostButton" to="../suggestions">New Suggestion</Link>
        <Link className="ghostButton" to="../github">GitHub</Link>
        <Link className="ghostButton" to="../mcp">MCP Setup</Link>
      </div>
    </section>
  );
}

function RecentActivity({ suggestions, versions }: { suggestions: Suggestion[]; versions: Version[] }) {
  const items = [
    ...suggestions.map((item) => ({
      id: `suggestion-${item.id}`,
      title: item.title,
      meta: `Suggestion / ${item.status} / ${formatDate(item.createdAt)}`,
      createdAt: item.createdAt
    })),
    ...versions.map((item) => ({
      id: `version-${item.id}`,
      title: item.versionTitle ?? `Version ${item.versionNumber}`,
      meta: `Version v${item.versionNumber} / ${formatDate(item.createdAt)}`,
      createdAt: item.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="vaults-section surfacePanel">
      <div className="section-title-row">
        <div>
          <h2>Recent activity</h2>
          <p>Latest suggestions and memory updates for this vault.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="contextKbEmptyLine">Activity appears here after suggestions are created or context is updated.</p>
      ) : (
        <div className="vault-list projectActivityList" aria-label="Recent project activity">
          {items.map((item) => (
            <article className="vault-item projectActivityItem" key={item.id}>
              <div className="vault-item-main">
                <span className="vault-item-name">{item.title}</span>
                <span className="vault-item-desc">{item.meta}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProjectDashboardPage() {
  const { projectId = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [githubConnections, setGithubConnections] = useState<GitHubConnection[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [projectsResult, versionsResult, suggestionsResult, githubResult, apiKeysResult] = await Promise.all([
          api.projects(),
          api.versions(projectId),
          api.suggestions(projectId),
          api.githubConnection(projectId),
          api.apiKeys()
        ]);
        if (cancelled) return;

        setProject(projectsResult.projects.find((item) => item.id === projectId) ?? null);
        setVersions(versionsResult.versions);
        setSuggestions(suggestionsResult.suggestions);
        setGithubConnections([...githubResult.githubAppConnections, ...githubResult.manualConnections].filter((item) => item.isActive));
        setApiKeys(apiKeysResult.apiKeys.filter((item) => !item.revokedAt));

        try {
          const contextResult = await api.context(projectId);
          if (!cancelled) setContext(contextResult.context);
        } catch (err) {
          if (!cancelled && isContextNotInitializedError(err)) {
            setContext(null);
          } else {
            throw err;
          }
        }
      } catch {
        if (!cancelled) setError("Could not load dashboard. Check backend status and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const pendingSuggestions = useMemo(() => suggestions.filter((item) => item.status === "pending").length, [suggestions]);
  const hasMemory = Boolean(context && versions.length > 0);
  const githubConnected = githubConnections.length > 0;
  const mcpReady = apiKeys.length > 0;

  return (
    <section className="projects-console">
      <header className="console-header pageHeader">
        <div className="console-header-text">
          <h1>Dashboard</h1>
          <p>Overview of this vault's memory, activity, and setup status.</p>
          {project && <p className="muted">{project.name}</p>}
        </div>
        <div className="console-actions">
          <Link className="ghostButton" to="../context">Project Context</Link>
          <Link className="ghostButton" to="../suggestions">Suggestions</Link>
        </div>
      </header>

      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : (
        <>
          <div className="workspace-overview metricStrip">
            <DashboardStat label="Current version" value={versions[0] ? `v${versions[0].versionNumber}` : "No versions yet"} />
            <DashboardStat label="Memory status" value={hasMemory ? "Memory ready" : "Needs setup"} />
            <DashboardStat label="Pending suggestions" value={String(pendingSuggestions)} />
            <DashboardStat label="GitHub status" value={githubConnected ? "Connected" : "Not connected"} />
            <DashboardStat label="MCP status" value={mcpReady ? "Ready" : "Needs key"} />
            <DashboardStat label="Last memory update" value={context?.updatedAt ? formatDate(context.updatedAt) : "Never"} />
          </div>

          {!hasMemory && <SetupPrompt />}
          <RecentActivity suggestions={suggestions} versions={versions} />
        </>
      )}
    </section>
  );
}
