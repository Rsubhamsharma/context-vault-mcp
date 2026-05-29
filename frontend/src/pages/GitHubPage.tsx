import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API_URL, api, GitHubConnection, GitHubEvent } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

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
    } catch (err) {
      setError("Failed to load GitHub setup");
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
      setActionError("GitHub connection failed");
    }
  }

  async function connectGitHubApp() {
    setActionError("");
    setSuccessMessage("");
    try {
      const result = await api.githubInstallUrl(projectId);
      window.location.href = result.installUrl;
    } catch {
      setActionError("GitHub App install URL failed");
    }
  }

  function installationErrorMessage(reason: string | null) {
    if (reason === "repo_fetch_failed") {
      return "GitHub App installed, but repositories could not be fetched. Check GitHub App private key, app id, installation permissions, and backend logs.";
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
      setPendingMessage("Waiting for GitHub App connection...");
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
    <section>
      <header className="pageHeader"><div><h1>GitHub Connection</h1><p>Connect a repository so GitHub changes create reviewable context suggestions.</p></div></header>
      {error && <ErrorBox message={error} />}
      {actionError && <ErrorBox message={actionError} />}
      {successMessage && <div className="panel success">{successMessage}</div>}
      {pendingMessage && <div className="panel success">{pendingMessage}</div>}
      {loading ? <Loading /> : (
        <>
          <div className="panel">
            <div className="copyRow"><h2>GitHub App</h2><button onClick={() => void connectGitHubApp()}>{hasGitHubAppConnection ? "Reconnect GitHub App" : "Connect GitHub App"}</button></div>
            {hasGitHubAppConnection && <p className="badge">GitHub App connected</p>}
            <p className="note">Install the Context Vault GitHub App to select repositories. GitHub will send push and pull request events automatically.</p>
          </div>
          <div className="panel">
            <h2>Connected repositories</h2>
            {hasGitHubAppConnection ? (
              <table><tbody>{githubAppConnections.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.repoOwner}/{item.repoName}</strong><p className="muted">{item.connectionType === "github_app" ? "GitHub App" : "Manual"}</p></td>
                  <td><a href={item.repoUrl}>{item.repoUrl}</a></td>
                  <td>{item.installationId ?? "-"}</td>
                  <td>{item.isActive ? "Active" : "Inactive"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}</tbody></table>
            ) : <Empty>GitHub App not connected.</Empty>}
          </div>
          <details className="panel">
            <summary>Manual webhook setup / dev fallback</summary>
            {manualConnections.length > 0 && (
              <table><tbody>{manualConnections.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.repoOwner}/{item.repoName}</strong><p className="muted">Manual</p></td>
                  <td><a href={item.repoUrl}>{item.repoUrl}</a></td>
                  <td>{item.isActive ? "Active" : "Inactive"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}</tbody></table>
            )}
            <form className="form" onSubmit={connect}>
              <div className="grid2">
                <label>Owner<input value={form.repoOwner} onChange={(e) => setForm({ ...form, repoOwner: e.target.value })} required /></label>
                <label>Repo name<input value={form.repoName} onChange={(e) => setForm({ ...form, repoName: e.target.value })} required /></label>
                <label>Repo URL<input value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} required /></label>
                <label>Default branch<input value={form.defaultBranch} onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })} required /></label>
                <label>Webhook secret<input value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} /></label>
              </div>
              <button>Save connection</button>
            </form>
            <div>
              <div className="copyRow"><h2>Webhook setup</h2><button className="secondary" onClick={() => copy(webhookUrl)}>Copy URL</button></div>
              <div className="kv">
                <span>Payload URL</span><code>{webhookUrl}</code>
                <span>Content type</span><code>application/json</code>
                <span>Events</span><code>push, pull_request</code>
                <span>Secret</span><code>Use the secret you entered</code>
              </div>
            </div>
          </details>
          <div className="panel">
            <h2>Recent events</h2>
            {events.length === 0 ? <Empty>No GitHub events yet.</Empty> : <table><tbody>{events.map((item) => (
              <tr key={item.id}><td>{item.eventType}</td><td>{item.branch || "-"}</td><td>{item.commitSha || item.prNumber || "-"}</td><td>{item.title || "-"}</td><td><span className="badge">{item.status}</span></td><td>{formatDate(item.createdAt)}</td></tr>
            ))}</tbody></table>}
          </div>
        </>
      )}
    </section>
  );
}
