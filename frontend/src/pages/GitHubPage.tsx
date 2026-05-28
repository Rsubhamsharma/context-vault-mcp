import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL, api, GitHubConnection, GitHubEvent } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

export function GitHubPage() {
  const { projectId = "" } = useParams();
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({ repoOwner: "", repoName: "", repoUrl: "", defaultBranch: "main", webhookSecret: "" });
  const webhookUrl = `${API_URL}/api/github/webhook`;
  const copy = (value: string) => void navigator.clipboard.writeText(value);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [eventsResult, connectionResult] = await Promise.allSettled([api.githubEvents(projectId), api.githubConnection(projectId)]);
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (connectionResult.status === "fulfilled") setConnection(connectionResult.value.connection);
    } catch (err) {
      setError("Failed to load GitHub setup");
    } finally {
      setLoading(false);
    }
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value));
      const result = await api.connectGithub(projectId, body);
      setConnection(result.connection);
      await load();
    } catch {
      setActionError("GitHub connection failed");
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  return (
    <section>
      <header className="pageHeader"><div><h1>GitHub Connection</h1><p>Connect a repository so GitHub changes create reviewable context suggestions.</p></div></header>
      {error && <ErrorBox message={error} />}
      {actionError && <ErrorBox message={actionError} />}
      {loading ? <Loading /> : (
        <>
          <div className="panel">
            <h2>Repository</h2>
            {connection ? (
              <div className="kv">
                <span>Repo</span><strong>{connection.repoOwner}/{connection.repoName}</strong>
                <span>URL</span><a href={connection.repoUrl}>{connection.repoUrl}</a>
                <span>Default branch</span><strong>{connection.defaultBranch}</strong>
              </div>
            ) : <Empty>No repository connected.</Empty>}
          </div>
          <form className="panel form" onSubmit={connect}>
            <h2>Connect manually</h2>
            <div className="grid2">
              <label>Owner<input value={form.repoOwner} onChange={(e) => setForm({ ...form, repoOwner: e.target.value })} required /></label>
              <label>Repo name<input value={form.repoName} onChange={(e) => setForm({ ...form, repoName: e.target.value })} required /></label>
              <label>Repo URL<input value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} required /></label>
              <label>Default branch<input value={form.defaultBranch} onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })} required /></label>
              <label>Webhook secret<input value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} /></label>
            </div>
            <button>Save connection</button>
          </form>
          <div className="panel">
            <div className="copyRow"><h2>Webhook setup</h2><button className="secondary" onClick={() => copy(webhookUrl)}>Copy URL</button></div>
            <div className="kv">
              <span>Payload URL</span><code>{webhookUrl}</code>
              <span>Content type</span><code>application/json</code>
              <span>Events</span><code>push, pull_request</code>
              <span>Secret</span><code>Use the secret you entered</code>
            </div>
          </div>
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
