import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiKey } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ErrorBox } from "../components/State";
import { formatDate } from "../utils";

const defaultScopes = ["context:read", "context:write:suggestion"];

function ApiKeysPageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="apiKeysHeader">
      <div>
        <h1>API Keys</h1>
        <p>Create scoped keys for MCP clients and AI-tool integrations.</p>
        <div className="apiKeysMeta" aria-label="API key guarantees">
          <span>Keys are shown once</span>
          <span>Revocable</span>
          <span>Scoped access</span>
        </div>
      </div>
      <button className="actionButton" onClick={onCreate} type="button">Create API key</button>
    </header>
  );
}

function SecurityNote() {
  return (
    <section className="apiSecurityNote">
      <p>API keys authenticate MCP clients. They can load project memory and create pending suggestions, but they cannot directly mutate official ProjectContext.</p>
      <div>
        <span>Shown once</span>
        <span>Scoped permissions</span>
        <span>Revocable</span>
      </div>
    </section>
  );
}

function ApiKeyStatus({ revoked }: { revoked: boolean }) {
  return <span className={`apiKeyStatus ${revoked ? "isRevoked" : "isActive"}`}>{revoked ? "Revoked" : "Active"}</span>;
}

function ApiKeyScopes({ scopes }: { scopes: string[] }) {
  return (
    <div className="apiKeyScopes">
      {scopes.map((scope) => <code key={scope}>{scope}</code>)}
    </div>
  );
}

function ApiKeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (id: string) => void }) {
  const revoked = Boolean(apiKey.revokedAt);

  return (
    <tr className={revoked ? "isRevoked" : undefined}>
      <td>
        <strong>{apiKey.name}</strong>
        <span>{apiKey.keyPrefix}</span>
      </td>
      <td><ApiKeyScopes scopes={apiKey.scopes} /></td>
      <td>{formatDate(apiKey.lastUsedAt)}</td>
      <td>{formatDate(apiKey.createdAt)}</td>
      <td><ApiKeyStatus revoked={revoked} /></td>
      <td>
        <button className="apiKeyRowAction" disabled={revoked} onClick={() => onRevoke(apiKey.id)} type="button">Revoke</button>
      </td>
    </tr>
  );
}

function ApiKeysTable({ keys, onCreate, onRevoke }: { keys: ApiKey[]; onCreate: () => void; onRevoke: (id: string) => void }) {
  if (keys.length === 0) {
    return <ApiKeysEmptyState onCreate={onCreate} />;
  }

  return (
    <section className="apiKeysTableSection" aria-labelledby="api-keys-list-title">
      <div className="apiKeysSectionHeader">
        <h2 id="api-keys-list-title">Keys</h2>
        <span>{keys.length} total</span>
      </div>
      <div className="apiKeysTableWrap">
        <table className="apiKeysTable">
          <thead>
            <tr>
              <th>Key</th>
              <th>Scopes</th>
              <th>Last used</th>
              <th>Created</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => <ApiKeyRow apiKey={key} key={key.id} onRevoke={onRevoke} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CreateApiKeyDialog({
  open,
  name,
  scopes,
  submitting,
  onClose,
  onNameChange,
  onToggleScope,
  onSubmit
}: {
  open: boolean;
  name: string;
  scopes: string[];
  submitting: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onToggleScope: (scope: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="apiDialogOverlay" role="presentation" onMouseDown={onClose}>
      <section className="apiDialog" role="dialog" aria-modal="true" aria-labelledby="create-api-key-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="create-api-key-title">Create API key</h2>
            <p>Use a scoped key for MCP clients and AI-tool integrations.</p>
          </div>
          <button className="dialogCloseButton" onClick={onClose} type="button" aria-label="Close create API key dialog">×</button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            Name
            <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Claude Desktop" required />
          </label>
          <fieldset>
            <legend>Scopes</legend>
            {defaultScopes.map((scope) => (
              <label key={scope}>
                <input checked={scopes.includes(scope)} onChange={() => onToggleScope(scope)} type="checkbox" />
                <span>{scope}</span>
              </label>
            ))}
          </fieldset>
          <footer>
            <button className="ghostButton" onClick={onClose} type="button">Cancel</button>
            <button className="actionButton" disabled={submitting || !name.trim() || scopes.length === 0} type="submit">
              {submitting ? "Creating..." : "Create key"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ApiKeyRevealDialog({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!rawKey) return null;

  async function copyKey() {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
  }

  return (
    <div className="apiDialogOverlay" role="presentation">
      <section className="apiDialog apiRevealDialog" role="dialog" aria-modal="true" aria-labelledby="api-key-reveal-title">
        <header>
          <div>
            <h2 id="api-key-reveal-title">Copy your API key</h2>
            <p>This key is shown once. Copy it now, you will not be able to view it again.</p>
          </div>
        </header>
        <div className="apiRawKeyField">
          <code>{rawKey}</code>
          <button className="ghostButton" onClick={() => void copyKey()} type="button">{copied ? "Copied" : "Copy"}</button>
        </div>
        <footer>
          <button className="actionButton" onClick={onClose} type="button">I copied this key</button>
        </footer>
      </section>
    </div>
  );
}

function ScopesExplanation() {
  return (
    <section className="apiScopesExplanation">
      <h2>Scopes</h2>
      <dl>
        <div>
          <dt>context:read</dt>
          <dd>Allows MCP clients to load project memory through context_load, context_smart, and search tools.</dd>
        </div>
        <div>
          <dt>context:write:suggestion</dt>
          <dd>Allows MCP clients to create pending suggestions only. It does not allow direct ProjectContext mutation.</dd>
        </div>
      </dl>
    </section>
  );
}

function NextStepPanel() {
  return (
    <section className="apiNextStepPanel">
      <div>
        <h2>Next step</h2>
        <p>After creating a key, copy your MCP config, test context_health_check, then load memory with context_load using aggressive compression.</p>
      </div>
      <Link className="ghostButton" to="../mcp">Open MCP Setup</Link>
    </section>
  );
}

function ApiKeysEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="apiKeysEmptyState">
      <h2>No API keys yet</h2>
      <p>Create an API key to connect Context Vault to MCP-compatible AI tools.</p>
      <div>
        <button className="actionButton" onClick={onCreate} type="button">Create API key</button>
        <Link className="ghostButton" to="../mcp">View MCP Setup</Link>
      </div>
    </section>
  );
}

function ApiKeysSkeleton() {
  return (
    <div className="apiKeysSkeleton" aria-label="Loading API keys">
      <span />
      <span />
      <span />
    </div>
  );
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [rawKey, setRawKey] = useState("");
  const [name, setName] = useState("MCP Client");
  const [scopes, setScopes] = useState(defaultScopes);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeId, setRevokeId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.apiKeys();
      setKeys(result.apiKeys.filter((key) => !key.revokedAt));
    } catch {
      setError("Could not load API keys. Check backend status and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.createApiKey({ name, scopes });
      setRawKey(result.key);
      setName("MCP Client");
      setScopes(defaultScopes);
      setCreateOpen(false);
      await load();
    } catch {
      setError("Could not create API key. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string) {
    setError("");
    try {
      await api.revokeApiKey(id);
      await load();
    } catch {
      setError("Could not revoke API key. Try again.");
    }
  }

  function toggle(scope: string) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="apiKeysPage">
      <ApiKeysPageHeader onCreate={() => setCreateOpen(true)} />
      {error && <ErrorBox message={error} />}
      <SecurityNote />
      {loading ? <ApiKeysSkeleton /> : <ApiKeysTable keys={keys} onCreate={() => setCreateOpen(true)} onRevoke={setRevokeId} />}
      <div className="apiKeysSupportGrid">
        <ScopesExplanation />
        <NextStepPanel />
      </div>
      <CreateApiKeyDialog
        open={createOpen}
        name={name}
        scopes={scopes}
        submitting={submitting}
        onClose={() => {
          if (!submitting) setCreateOpen(false);
        }}
        onNameChange={setName}
        onToggleScope={toggle}
        onSubmit={(event) => void create(event)}
      />
      <ApiKeyRevealDialog rawKey={rawKey} onClose={() => setRawKey("")} />
      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke API key?"
        description="This will immediately prevent MCP clients using this key from accessing Context Vault. This cannot be undone."
        confirmLabel="Revoke key"
        intent="danger"
        onCancel={() => setRevokeId("")}
        onConfirm={() => {
          const id = revokeId;
          setRevokeId("");
          void revoke(id);
        }}
      />
    </section>
  );
}
