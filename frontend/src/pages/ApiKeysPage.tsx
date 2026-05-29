import { FormEvent, useEffect, useState } from "react";
import { api, ApiKey } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

const defaultScopes = ["context:read", "context:write:suggestion"];

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [rawKey, setRawKey] = useState("");
  const [name, setName] = useState("MCP Client");
  const [scopes, setScopes] = useState(defaultScopes);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const copy = (value: string) => void navigator.clipboard.writeText(value);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.apiKeys();
      setKeys(result.apiKeys);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api.createApiKey({ name, scopes });
      setRawKey(result.key);
      setName("MCP Client");
      setScopes(defaultScopes);
      await load();
    } catch {
      setError("API key creation failed");
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this API key? Existing MCP clients using it will stop working.")) {
      return;
    }
    setError("");
    try {
      await api.revokeApiKey(id);
      await load();
    } catch {
      setError("API key revocation failed");
    }
  }

  function toggle(scope: string) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  useEffect(() => { void load(); }, []);

  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>API Keys</h1>
          <p>Create scoped API keys for MCP clients and AI-tool integrations.</p>
        </div>
      </header>
      {error && <ErrorBox message={error} />}
      <form className="panel form" onSubmit={create}>
        <div className="copyRow"><h2>Create API Key</h2><button>Create API Key</button></div>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className="checks">
          <label><input type="checkbox" checked={scopes.includes("context:read")} onChange={() => toggle("context:read")} /> context:read</label>
          <label><input type="checkbox" checked={scopes.includes("context:write:suggestion")} onChange={() => toggle("context:write:suggestion")} /> context:write:suggestion</label>
        </div>
        <div className="note">
          <strong>Scopes</strong>
          <p><code>context:read</code> allows MCP clients to load project context.</p>
          <p><code>context:write:suggestion</code> allows MCP clients to create pending suggestions only.</p>
          <p>Keys must never directly mutate ProjectContext.</p>
        </div>
      </form>
      {rawKey && (
        <div className="panel success">
          <h2>Copy this key now</h2>
          <p><strong>Copy this key now. You will not be able to view it again.</strong></p>
          <code>{rawKey}</code>
          <div className="actions">
            <button className="secondary" onClick={() => copy(rawKey)}>Copy</button>
            <button onClick={() => setRawKey("")}>I copied this key</button>
          </div>
        </div>
      )}
      <div className="panel">
        <h2>Existing API Keys</h2>
        {loading ? <Loading /> : keys.length === 0 ? (
          <Empty>No API keys yet. Create one to connect Context Vault to an AI tool through MCP.</Empty>
        ) : (
          <table><tbody>{keys.map((key) => (
            <tr key={key.id} className={key.revokedAt ? "mutedRow" : undefined}>
              <td><strong>{key.name}</strong><p className="muted">{key.keyPrefix}</p></td>
              <td>{key.scopes.join(", ")}</td>
              <td>{formatDate(key.createdAt)}</td>
              <td>{formatDate(key.lastUsedAt)}</td>
              <td><span className="badge">{key.revokedAt ? "revoked" : "active"}</span></td>
              <td><button className="secondary" disabled={Boolean(key.revokedAt)} onClick={() => void revoke(key.id)}>Revoke</button></td>
            </tr>
          ))}</tbody></table>
        )}
      </div>
    </section>
  );
}
