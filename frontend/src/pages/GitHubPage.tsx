import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { API_URL, api, GitHubConnection, GitHubEvent } from "../api/client";
import { ErrorBox } from "../components/State";
import { formatDate } from "../utils";

function CompactStatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "accent" }) {
  return <span className={`compactStatusBadge ${tone}`}>{children}</span>;
}

function QueryMessage({ tone, children }: { tone: "success" | "pending" | "error"; children: React.ReactNode }) {
  return <div className={`githubMessage ${tone}`}>{children}</div>;
}

function SettingsPageHeader({
  connected,
  onConnect
}: {
  connected: boolean;
  onConnect: () => void;
}) {
  return (
    <header className="githubSettingsHeader">
      <div>
        <h1>GitHub</h1>
        <p>Connect repositories so GitHub changes become reviewable memory suggestions.</p>
        <div className="githubHeaderStatus">
          <span className={`statusDot ${connected ? "success" : "warning"}`} aria-hidden="true" />
          <span>{connected ? "GitHub App connected" : "GitHub App not connected"}</span>
        </div>
      </div>
      <div className="githubHeaderActions">
        <button className="actionButton" onClick={onConnect}>{connected ? "Reconnect GitHub App" : "Connect GitHub App"}</button>
        <Link className="ghostButton" to="../docs">View Docs</Link>
      </div>
    </header>
  );
}

function IntegrationSummary({
  connected,
  account,
  repoCount,
  lastEvent,
  onConnect
}: {
  connected: boolean;
  account: string;
  repoCount: number;
  lastEvent?: GitHubEvent;
  onConnect: () => void;
}) {
  const summaryRows = [
    ["Status", connected ? "Connected" : "Not connected"],
    ["Provider", "GitHub App"],
    ["Account", connected ? account : "-"],
    ["Repositories", connected ? `${repoCount} selected` : "None selected"],
    ["Last event", lastEvent ? formatDate(lastEvent.createdAt) : "No events yet"]
  ];

  return (
    <section className="settingsSection connectionSummarySection">
      <div className="settingsSectionHeader">
        <div>
          <h2>Connection</h2>
          <p>{connected ? "GitHub events create pending suggestions only. Project memory changes after review." : "Install the GitHub App and select repositories to start creating suggestions."}</p>
        </div>
        <button className="ghostButton" onClick={onConnect}>{connected ? "Manage connection" : "Connect GitHub App"}</button>
      </div>
      <dl className="settingsDefinitionGrid">
        {summaryRows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {label === "Status" ? (
                <span className="summaryStatus">
                  <span className={`statusDot ${connected ? "success" : "warning"}`} aria-hidden="true" />
                  {value}
                </span>
              ) : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function InlineFlow() {
  return (
    <section className="settingsSection inlineFlowSection">
      <div>
        <h2>How GitHub updates memory</h2>
        <p>GitHub events create pending ContextSuggestion records. Applying a suggestion updates ProjectContext and creates a ContextVersion.</p>
      </div>
      <div className="inlineFlow" aria-label="GitHub memory update flow">
        <span>Push / PR</span>
        <span>Suggestion</span>
        <span>Review</span>
        <span>Version</span>
      </div>
    </section>
  );
}

function RepositoryRow({ item, lastEvent }: { item: GitHubConnection; lastEvent?: GitHubEvent }) {
  const repoLabel = `${item.repoOwner}/${item.repoName}`;

  return (
    <article className="settingsTableRow repositoryRow">
      <div className="repoCell">
        <strong>{repoLabel}</strong>
        <a href={item.repoUrl} target="_blank" rel="noreferrer">{item.repoUrl}</a>
      </div>
      <div data-label="Type">GitHub App</div>
      <div data-label="Status">
        <CompactStatusBadge tone={item.isActive ? "success" : "warning"}>{item.isActive ? "Active" : "Inactive"}</CompactStatusBadge>
      </div>
      <div data-label="Last event">{lastEvent ? formatDate(lastEvent.createdAt) : "No events yet"}</div>
      <div className="rowActions">
        <a className="textButton" href={item.repoUrl} target="_blank" rel="noreferrer">Open</a>
        <details className="rowDetails">
          <summary>Details</summary>
          <div>
            <span>Installation ID</span>
            <code>{item.installationId ?? "-"}</code>
            <span>Connected</span>
            <code>{formatDate(item.createdAt)}</code>
          </div>
        </details>
      </div>
    </article>
  );
}

function RepositoryConnectionList({ connections, lastEvent }: { connections: GitHubConnection[]; lastEvent?: GitHubEvent }) {
  return (
    <section className="settingsSection">
      <div className="settingsSectionHeader">
        <div>
          <h2>Repositories</h2>
          <p>Repositories selected during GitHub App installation.</p>
        </div>
      </div>
      {connections.length === 0 ? (
        <div className="settingsEmptyState">
          <h3>No repositories connected</h3>
          <p>Connect the GitHub App and select a repository to start generating suggestions.</p>
        </div>
      ) : (
        <div className="settingsTable repositoryTable">
          <div className="settingsTableHead">
            <span>Repository</span>
            <span>Type</span>
            <span>Status</span>
            <span>Last event</span>
            <span>Actions</span>
          </div>
          {connections.map((item) => <RepositoryRow key={item.id} item={item} lastEvent={lastEvent} />)}
        </div>
      )}
    </section>
  );
}

function normalizeEventType(type: string) {
  return type.replace(/_/g, " ");
}

function shortIdentifier(item: GitHubEvent) {
  if (item.prNumber) return `PR #${item.prNumber}`;
  if (item.commitSha) return item.commitSha.slice(0, 7);
  return "Event received";
}

function GitHubEventItem({ item }: { item: GitHubEvent }) {
  return (
    <article className="settingsTableRow eventRow">
      <div data-label="Event">{normalizeEventType(item.eventType)}</div>
      <div data-label="Branch">{item.branch || "main"}</div>
      <div data-label="Reference" className="referenceCell">{item.title || shortIdentifier(item)}</div>
      <div data-label="Status">
        <CompactStatusBadge tone={item.status === "processed" ? "success" : item.status === "ignored" ? "warning" : "default"}>{item.status}</CompactStatusBadge>
      </div>
      <div data-label="Time">{formatDate(item.createdAt)}</div>
    </article>
  );
}

function GitHubEventFeed({ events }: { events: GitHubEvent[] }) {
  return (
    <section className="settingsSection">
      <div className="settingsSectionHeader">
        <div>
          <h2>Recent events</h2>
          <p>Latest push and pull request events received from GitHub.</p>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="settingsEmptyState">
          <h3>No GitHub events received yet</h3>
          <p>Push to a connected repository to test the integration.</p>
        </div>
      ) : (
        <div className="settingsTable eventTable">
          <div className="settingsTableHead">
            <span>Event</span>
            <span>Branch</span>
            <span>Reference</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          {events.map((item) => <GitHubEventItem key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}

function DeveloperFallbackAccordion({
  manualConnections,
  form,
  setForm,
  connect,
  copy,
  webhookUrl
}: {
  manualConnections: GitHubConnection[];
  form: { repoOwner: string; repoName: string; repoUrl: string; defaultBranch: string; webhookSecret: string };
  setForm: (form: { repoOwner: string; repoName: string; repoUrl: string; defaultBranch: string; webhookSecret: string }) => void;
  connect: (event: FormEvent) => void;
  copy: (value: string) => void;
  webhookUrl: string;
}) {
  return (
    <details className="developerFallback">
      <summary>
        <span>Developer fallback: manual webhook setup</span>
        <small>For local development or custom setups only</small>
      </summary>
      <div className="developerFallbackBody">
        <p className="fallbackNote">Use the GitHub App for normal production setup. Manual webhooks are useful when testing a local tunnel or a custom repository source.</p>
        {manualConnections.length > 0 && (
          <div className="manualConnectionList">
            {manualConnections.map((item) => (
              <div key={item.id}>
                <strong>{item.repoOwner}/{item.repoName}</strong>
                <span>{item.repoUrl}</span>
                <CompactStatusBadge tone={item.isActive ? "success" : "warning"}>{item.isActive ? "Active" : "Inactive"}</CompactStatusBadge>
              </div>
            ))}
          </div>
        )}
        <form className="fallbackForm" onSubmit={connect}>
          <div className="grid2">
            <label>Owner<input value={form.repoOwner} onChange={(event) => setForm({ ...form, repoOwner: event.target.value })} required /></label>
            <label>Repo name<input value={form.repoName} onChange={(event) => setForm({ ...form, repoName: event.target.value })} required /></label>
            <label>Repo URL<input value={form.repoUrl} onChange={(event) => setForm({ ...form, repoUrl: event.target.value })} required /></label>
            <label>Default branch<input value={form.defaultBranch} onChange={(event) => setForm({ ...form, defaultBranch: event.target.value })} required /></label>
            <label>Webhook secret<input value={form.webhookSecret} onChange={(event) => setForm({ ...form, webhookSecret: event.target.value })} /></label>
          </div>
          <button className="actionButton">Save connection</button>
        </form>
        <div className="webhookConfig">
          <div className="settingsSectionHeader">
            <div>
              <h2>Webhook configuration</h2>
              <p>Paste these values into GitHub repository webhook settings.</p>
            </div>
            <button className="ghostButton" onClick={() => copy(webhookUrl)}>Copy URL</button>
          </div>
          <div className="kv">
            <span>Payload URL</span><code>{webhookUrl}</code>
            <span>Content type</span><code>application/json</code>
            <span>Events</span><code>push, pull_request</code>
            <span>Secret</span><code>Use the secret you entered above</code>
          </div>
        </div>
      </div>
    </details>
  );
}

function GitHubSkeleton() {
  return (
    <div className="githubSettingsSkeleton" aria-label="Loading GitHub connection">
      <span />
      <span />
      <span />
    </div>
  );
}

export function GitHubPage() {
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [githubAppConnections, setGithubAppConnections] = useState<GitHubConnection[]>([]);
  const [manualConnections, setManualConnections] = useState<GitHubConnection[]>([]);
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [form, setForm] = useState({ repoOwner: "", repoName: "", repoUrl: "", defaultBranch: "main", webhookSecret: "" });
  const webhookUrl = `${API_URL}/api/github/webhook`;
  const copy = (value: string) => void navigator.clipboard.writeText(value);
  const hasGitHubAppConnection = githubAppConnections.length > 0;
  const lastEvent = useMemo(() => events[0], [events]);
  const primaryAccount = githubAppConnections[0]?.accountLogin || githubAppConnections[0]?.repoOwner || "-";

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    setGithubAppConnections([]);
    setManualConnections([]);
    try {
      const [eventsResult, connectionResult] = await Promise.allSettled([api.githubEvents(projectId), api.githubConnection(projectId)]);
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (connectionResult.status === "fulfilled") {
        setGithubAppConnections(connectionResult.value.githubAppConnections.filter((item) => item.isActive));
        setManualConnections(connectionResult.value.manualConnections.filter((item) => item.isActive));
      }
      if (eventsResult.status === "rejected" || connectionResult.status === "rejected") {
        setError("Could not load GitHub connection. Check backend status and try again.");
      }
    } catch {
      setError("Could not load GitHub connection. Check backend status and try again.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function refreshConnectionsOnly() {
    const connectionResult = await api.githubConnection(projectId);
    const appConnections = connectionResult.githubAppConnections.filter((item) => item.isActive);
    setGithubAppConnections(appConnections);
    setManualConnections(connectionResult.manualConnections.filter((item) => item.isActive));
    return appConnections.length;
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value));
      await api.connectGithub(projectId, body);
      await load();
    } catch {
      setActionError("GitHub connection failed. Check the repository details and webhook secret.");
    }
  }

  async function connectGitHubApp() {
    setActionError("");
    setSuccessMessage("");
    try {
      const result = await api.githubInstallUrl(projectId);
      window.location.href = result.installUrl;
    } catch {
      setActionError("GitHub App install URL failed. Check backend status and try again.");
    }
  }

  function installationErrorMessage(reason: string | null) {
    if (reason === "repo_fetch_failed") {
      return "GitHub App installed, but repositories could not be fetched. Check GitHub App credentials, installation permissions, and backend logs.";
    }
    if (reason === "no_repositories_selected") {
      return "No repositories were selected. Reconnect GitHub App and select at least one repository.";
    }
    return `GitHub App connection failed${reason ? `: ${reason.replace(/_/g, " ")}` : "."}`;
  }

  useEffect(() => {
    const installation = searchParams.get("installation");
    if (installation === "success") {
      setSuccessMessage("GitHub App connected successfully.");
      setActionError("");
      setPendingMessage("");
      const next = new URLSearchParams(searchParams);
      next.delete("installation");
      next.delete("reason");
      setSearchParams(next, { replace: true });
    } else if (installation === "error") {
      const reason = searchParams.get("reason");
      setActionError(installationErrorMessage(reason));
      setSuccessMessage("");
      setPendingMessage("");
    } else if (installation === "pending") {
      setPendingMessage("Waiting for GitHub App connection.");
      setActionError("");
      setSuccessMessage("");
    }
    void load();
  }, [projectId]);

  useEffect(() => {
    if (searchParams.get("installation") !== "pending") {
      return;
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      void refreshConnectionsOnly().then((appCount) => {
        if (appCount > 0) {
          setPendingMessage("");
          setSuccessMessage("GitHub App connected successfully.");
          const next = new URLSearchParams(searchParams);
          next.delete("installation");
          next.delete("reason");
          setSearchParams(next, { replace: true });
          window.clearInterval(intervalId);
        } else if (attempts >= 15) {
          setPendingMessage("");
          setActionError("GitHub App was installed, but Context Vault could not map the selected repository. Check backend logs.");
          window.clearInterval(intervalId);
        }
      }).catch(() => {
        if (attempts >= 15) {
          setPendingMessage("");
          setActionError("GitHub App was installed, but Context Vault could not map the selected repository. Check backend logs.");
          window.clearInterval(intervalId);
        }
      });
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [projectId, searchParams]);

  return (
    <section className="githubConnectionPage">
      <SettingsPageHeader connected={hasGitHubAppConnection} onConnect={() => void connectGitHubApp()} />

      {error && <ErrorBox message={error} />}
      {actionError && <QueryMessage tone="error">{actionError}</QueryMessage>}
      {successMessage && <QueryMessage tone="success">{successMessage}</QueryMessage>}
      {pendingMessage && <QueryMessage tone="pending">{pendingMessage}</QueryMessage>}

      {loading ? <GitHubSkeleton /> : (
        <>
          <IntegrationSummary
            connected={hasGitHubAppConnection}
            account={primaryAccount}
            repoCount={githubAppConnections.length}
            lastEvent={lastEvent}
            onConnect={() => void connectGitHubApp()}
          />
          <RepositoryConnectionList connections={githubAppConnections} lastEvent={lastEvent} />
          <InlineFlow />
          <GitHubEventFeed events={events} />
          <DeveloperFallbackAccordion
            manualConnections={manualConnections}
            form={form}
            setForm={setForm}
            connect={connect}
            copy={copy}
            webhookUrl={webhookUrl}
          />
        </>
      )}
    </section>
  );
}
