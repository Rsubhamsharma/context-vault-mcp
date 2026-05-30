import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL, api, ApiKey, ProjectContext } from "../api/client";
import { ErrorBox } from "../components/State";

const setupItems = [
  "Project context exists",
  "API key created",
  "MCP config copied",
  "Health check tested",
  "context_load tested"
];

const setupSteps = [
  {
    title: "Create an API key",
    text: "Create a scoped API key with context:read and context:write:suggestion.",
    action: "Open API Keys",
    to: "../api-keys"
  },
  {
    title: "Copy MCP config",
    text: "Add this server configuration to your AI tool."
  },
  {
    title: "Restart your AI tool",
    text: "Most MCP clients require a restart after config changes."
  },
  {
    title: "Run health check",
    text: "Use Context Vault MCP and run context_health_check.",
    copy: "Use Context Vault MCP and run context_health_check."
  },
  {
    title: "Load project context",
    text: "Use Context Vault MCP and call context_load with detailLevel detailed and raw false.",
    copy: "Use Context Vault MCP and call context_load with detailLevel detailed and raw false."
  }
];

const toolNotes = [
  { name: "Codex CLI", config: "Add the server under your MCP servers configuration.", restart: "Restart Codex after editing MCP config." },
  { name: "Cursor", config: "Add the server in Cursor MCP settings.", restart: "Reload Cursor or restart the editor." },
  { name: "Claude Desktop", config: "Add the server to the Claude Desktop MCP config file.", restart: "Restart Claude Desktop." },
  { name: "Windsurf", config: "Add the server in Windsurf MCP settings.", restart: "Restart Windsurf after saving." },
  { name: "Claude Code", config: "Add the server to the Claude Code MCP configuration.", restart: "Restart the session." },
  { name: "MCP Inspector", config: "Use the same command, args, and env values in Inspector.", restart: "Reconnect the Inspector session." }
];

const promptRows = [
  { label: "context_health_check", purpose: "Verify connection", prompt: "Use Context Vault MCP and run context_health_check." },
  { label: "context_load", purpose: "Load full optimized project memory", prompt: "Use Context Vault MCP and call context_load with detailLevel detailed and raw false." },
  { label: "context_smart", purpose: "Load task-specific context", prompt: "Use Context Vault MCP and call context_smart for the task: Improve GitHub suggestions." },
  { label: "context_auto_capture", purpose: "Capture work after implementation", prompt: "Use Context Vault MCP and call context_auto_capture after meaningful implementation work." },
  { label: "github_connect_url", purpose: "Get GitHub App install URL", prompt: "Use Context Vault MCP and call github_connect_url." }
];

const toolReference = [
  ["context_health_check", "Verify backend, API key, and project connection."],
  ["context_load", "Load optimized latest project memory."],
  ["context_smart", "Load task-specific context."],
  ["context_search", "Search project memory."],
  ["context_versions", "Inspect version history."],
  ["context_create_suggestion", "Create a structured pending suggestion."],
  ["context_capture", "Turn messy natural updates into pending suggestions."],
  ["context_import_git", "Import pasted git summaries as suggestions."],
  ["context_auto_capture", "Allow AI agents to create suggestions after meaningful work."],
  ["github_connect_url", "Return GitHub App install URL."]
];

const troubleshooting = [
  ["Health check fails", "Backend URL, API key, or project ID is wrong.", "Verify config values and restart the AI tool."],
  ["API key invalid", "The key is missing, mistyped, or revoked.", "Create a new scoped key and update your MCP config."],
  ["Project ID missing", "CONTEXT_VAULT_PROJECT_ID is empty or points to another project.", "Copy the project ID from this page."],
  ["Backend URL wrong", "The MCP client cannot reach the API server.", "Check CONTEXT_VAULT_API_URL and confirm the backend is running."],
  ["MCP server build missing", "The configured build path does not exist.", "Run npm run build in context-vault-mcp."],
  ["AI tool not restarted", "The client has not reloaded the MCP server config.", "Restart the AI tool after saving config."],
  ["API key revoked", "The key was deleted or revoked.", "Create a new key and update config."],
  ["Wrong project loaded", "The project ID belongs to a different vault.", "Replace CONTEXT_VAULT_PROJECT_ID with the current project ID."]
];

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return <button className="mcpCopyButton" onClick={() => void copy()} type="button">{copied ? "Copied" : label}</button>;
}

function McpSetupHeader({ projectId }: { projectId: string }) {
  return (
    <header className="mcpSetupHeader">
      <div>
        <h1>MCP Setup</h1>
        <p>Connect Context Vault to AI tools so they can load the latest project memory.</p>
        <div className="mcpSetupMeta" aria-label="MCP setup metadata">
          <span>Project ID <code>{projectId || "missing"}</code></span>
          <span>API key required</span>
          <span>MCP server config</span>
        </div>
      </div>
      <div>
        <Link className="actionButton" to="../api-keys">Create API Key</Link>
        <Link className="ghostButton" to="../docs">View Docs</Link>
      </div>
    </header>
  );
}

function McpSetupChecklist({ hasContext, hasApiKey }: { hasContext: boolean; hasApiKey: boolean }) {
  const statusFor = (item: string) => {
    if (item === "Project context exists") return hasContext;
    if (item === "API key created") return hasApiKey;
    return false;
  };

  return (
    <section className="mcpChecklist" aria-label="MCP setup checklist">
      {setupItems.map((item) => {
        const done = statusFor(item);
        return (
          <span className={done ? "isDone" : undefined} key={item}>
            <i aria-hidden="true" />
            {item}
            <em>{done ? "Complete" : "Manual"}</em>
          </span>
        );
      })}
    </section>
  );
}

function McpSetupSteps() {
  return (
    <section className="mcpSetupSteps" aria-labelledby="mcp-steps-title">
      <h2 id="mcp-steps-title">Setup guide</h2>
      <ol>
        {setupSteps.map((step, index) => (
          <li key={step.title}>
            <span>{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {step.to && <Link to={step.to}>{step.action}</Link>}
              {step.copy && <CopyButton value={step.copy} label="Copy prompt" />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function McpConfigBlock({ snippet, hasApiKey }: { snippet: string; hasApiKey: boolean }) {
  return (
    <section className="mcpConfigBlock" aria-labelledby="mcp-config-title">
      <header>
        <div>
          <h2 id="mcp-config-title">MCP config</h2>
          <p>Add this server configuration to your AI tool.</p>
        </div>
        <CopyButton value={snippet} label="Copy config" />
      </header>
      {!hasApiKey && (
        <div className="mcpKeyWarning">
          <span>No API key found.</span>
          <p>Create an API key before connecting an MCP client.</p>
          <Link to="../api-keys">Create API Key</Link>
        </div>
      )}
      <pre><code>{snippet}</code></pre>
    </section>
  );
}

function AiToolSetupTabs() {
  const [activeTool, setActiveTool] = useState(toolNotes[0].name);
  const active = toolNotes.find((tool) => tool.name === activeTool) ?? toolNotes[0];

  return (
    <section className="mcpToolSetup" aria-labelledby="mcp-tools-title">
      <h2 id="mcp-tools-title">AI tool setup notes</h2>
      <div className="mcpToolTabs" role="tablist" aria-label="AI tools">
        {toolNotes.map((tool) => (
          <button className={tool.name === activeTool ? "isActive" : ""} key={tool.name} onClick={() => setActiveTool(tool.name)} type="button">
            {tool.name}
          </button>
        ))}
      </div>
      <article>
        <h3>{active.name}</h3>
        <dl>
          <div><dt>Config</dt><dd>{active.config}</dd></div>
          <div><dt>Restart</dt><dd>{active.restart}</dd></div>
          <div><dt>Test</dt><dd>Run context_health_check.</dd></div>
        </dl>
      </article>
    </section>
  );
}

function ExamplePromptList() {
  return (
    <section className="mcpPromptList" aria-labelledby="mcp-prompts-title">
      <h2 id="mcp-prompts-title">Example MCP prompts</h2>
      <div>
        {promptRows.map((row) => (
          <article key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.purpose}</span>
              <p>{row.prompt}</p>
            </div>
            <CopyButton value={row.prompt} />
          </article>
        ))}
      </div>
    </section>
  );
}

function McpToolsReference() {
  return (
    <section className="mcpToolsReference" aria-labelledby="mcp-reference-title">
      <h2 id="mcp-reference-title">Available MCP tools</h2>
      <dl>
        {toolReference.map(([tool, purpose]) => (
          <div key={tool}>
            <dt>{tool}</dt>
            <dd>{purpose}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function McpTroubleshooting() {
  return (
    <section className="mcpTroubleshooting" aria-labelledby="mcp-troubleshooting-title">
      <h2 id="mcp-troubleshooting-title">Troubleshooting</h2>
      <div>
        {troubleshooting.map(([symptom, cause, fix]) => (
          <details key={symptom}>
            <summary>{symptom}</summary>
            <dl>
              <div><dt>Cause</dt><dd>{cause}</dd></div>
              <div><dt>Fix</dt><dd>{fix}</dd></div>
            </dl>
          </details>
        ))}
      </div>
    </section>
  );
}

function McpSecurityNote() {
  return (
    <section className="mcpSecurityNote">
      <p>MCP clients authenticate using scoped API keys. Keys can load project memory and create pending suggestions, but they cannot directly mutate official ProjectContext.</p>
    </section>
  );
}

export function McpPage() {
  const { projectId = "" } = useParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      try {
        const [keyResult, contextResult] = await Promise.all([
          api.apiKeys(),
          api.context(projectId)
        ]);
        if (cancelled) return;
        setKeys(keyResult.apiKeys.filter((key) => !key.revokedAt));
        setContext(contextResult.context);
      } catch {
        if (!cancelled) setError("Could not load MCP setup status. Check backend status and try again.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const activeKeys = keys.filter((key) => !key.revokedAt);
  const snippet = useMemo(() => JSON.stringify({
    mcpServers: {
      "context-vault": {
        command: "node",
        args: ["path/to/context-vault-mcp/build/index.js"],
        env: {
          CONTEXT_VAULT_API_URL: API_URL,
          CONTEXT_VAULT_API_KEY: "cv_live_your_key_here",
          CONTEXT_VAULT_PROJECT_ID: projectId
        }
      }
    }
  }, null, 2), [projectId]);

  return (
    <section className="mcpSetupPage">
      <McpSetupHeader projectId={projectId} />
      {error && <ErrorBox message={error} />}
      <McpSetupChecklist hasContext={Boolean(context)} hasApiKey={activeKeys.length > 0} />
      <div className="mcpSetupGrid">
        <McpSetupSteps />
        <McpConfigBlock snippet={snippet} hasApiKey={activeKeys.length > 0} />
      </div>
      <AiToolSetupTabs />
      <ExamplePromptList />
      <McpToolsReference />
      <McpTroubleshooting />
      <McpSecurityNote />
    </section>
  );
}
