import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL, api, ApiKey } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

export function McpPage() {
  const { projectId = "" } = useParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [rawKey, setRawKey] = useState("");
  const [name, setName] = useState("Cursor MCP");
  const [scopes, setScopes] = useState(["context:read", "context:write:suggestion"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const copy = (value: string) => void navigator.clipboard.writeText(value);

  async function load() {
    setLoading(true);
    try {
      const result = await api.apiKeys();
      setKeys(result.apiKeys);
    } catch (err) {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    try {
      const result = await api.createApiKey({ name, scopes });
      setRawKey(result.key);
      await load();
    } catch {
      setActionError("API key creation failed");
    }
  }

  async function revoke(id: string) {
    setActionError("");
    try {
      await api.revokeApiKey(id);
      await load();
    } catch {
      setActionError("API key revocation failed");
    }
  }

  function toggle(scope: string) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  useEffect(() => { void load(); }, []);

  const snippet = JSON.stringify({
    mcpServers: {
      "context-vault": {
        command: "node",
        args: ["PATH_TO/context-vault-mcp/build/index.js"],
        env: {
          CONTEXT_VAULT_API_URL: API_URL,
          CONTEXT_VAULT_API_KEY: "PASTE_API_KEY_HERE",
          CONTEXT_VAULT_PROJECT_ID: projectId
        }
      }
    }
  }, null, 2);
  const prompts = [
    "Use Context Vault MCP and run context_health_check.",
    "Use Context Vault and load the latest project context.",
    "Use Context Vault smart context for this task: fix GitHub sync.",
    "Create a pending Context Vault suggestion for what we changed."
  ];

  return (
    <section>
      <header className="pageHeader"><div><h1>MCP Setup</h1><p>Use this API key to connect Context Vault MCP from Cursor, Claude Desktop, Windsurf, or Claude Code.</p></div></header>
      {error && <ErrorBox message={error} />}
      {actionError && <ErrorBox message={actionError} />}
      <div className="panel">
        <h2>Demo readiness checklist</h2>
        <ul className="checklist">
          <li>Backend connected: open this dashboard and load project data.</li>
          <li>Project context exists: verify the Context page shows an official ProjectContext.</li>
          <li>API key created: create a key with context:read and context:write:suggestion.</li>
          <li>MCP config copied: paste the config below into your MCP client.</li>
          <li>Suggested test prompt: <code>Use Context Vault MCP and run context_health_check.</code></li>
        </ul>
        <button className="secondary" onClick={() => copy(prompts[0])}>Copy health check prompt</button>
      </div>
      <form className="panel form" onSubmit={create}>
        <h2>Create API key</h2>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <div className="checks">
          <label><input type="checkbox" checked={scopes.includes("context:read")} onChange={() => toggle("context:read")} /> context:read</label>
          <label><input type="checkbox" checked={scopes.includes("context:write:suggestion")} onChange={() => toggle("context:write:suggestion")} /> context:write:suggestion</label>
        </div>
        <button>Create key</button>
      </form>
      {rawKey && <div className="panel success"><h2>Copy this key now</h2><code>{rawKey}</code><button className="secondary" onClick={() => copy(rawKey)}>Copy API key</button></div>}
      <div className="panel">
        <div className="copyRow"><h2>MCP config</h2><button className="secondary" onClick={() => copy(snippet)}>Copy config</button></div>
        <pre>{snippet}</pre>
      </div>
      <div className="panel">
        <h2>Example prompts</h2>
        <ul className="promptList">{prompts.map((prompt) => <li key={prompt}><span>{prompt}</span><button className="secondary" onClick={() => copy(prompt)}>Copy</button></li>)}</ul>
      </div>
      <div className="panel">
        <h2>Existing keys</h2>
        {loading ? <Loading /> : keys.length === 0 ? <Empty>No API keys yet.</Empty> : <table><tbody>{keys.map((key) => (
          <tr key={key.id}><td>{key.name}</td><td>{key.keyPrefix}</td><td>{key.scopes.join(", ")}</td><td>{formatDate(key.lastUsedAt)}</td><td>{key.revokedAt ? `Revoked ${formatDate(key.revokedAt)}` : "Active"}</td><td><button className="secondary" disabled={Boolean(key.revokedAt)} onClick={() => void revoke(key.id)}>Revoke</button></td></tr>
        ))}</tbody></table>}
      </div>
    </section>
  );
}
