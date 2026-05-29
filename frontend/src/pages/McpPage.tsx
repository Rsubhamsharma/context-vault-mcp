import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL, api, ApiKey } from "../api/client";
import { ErrorBox } from "../components/State";

const prompts = [
  "Use Context Vault MCP and run context_health_check.",
  "Use Context Vault MCP and call context_load with detailLevel detailed and raw false.",
  "Use Context Vault MCP and call context_smart for the task: Improve GitHub suggestions.",
  "Use Context Vault MCP and call context_auto_capture after completing meaningful work.",
  "Use Context Vault MCP and call github_connect_url."
];

const tools = ["Codex CLI", "Cursor", "Claude Desktop", "Windsurf", "Claude Code", "MCP Inspector"];

const troubleshooting = [
  "API key invalid: create a new scoped key on the API Keys page.",
  "Project ID missing: confirm CONTEXT_VAULT_PROJECT_ID matches this project.",
  "Backend not running: start the Context Vault API and check the backend URL.",
  "MCP server build missing: run npm run build in context-vault-mcp.",
  "Tool did not restart after config update: restart the AI tool.",
  "API key revoked: create and copy a new key.",
  "Wrong backend URL: check CONTEXT_VAULT_API_URL."
];

export function McpPage() {
  const { projectId = "" } = useParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState("");
  const copy = (value: string) => void navigator.clipboard.writeText(value);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.apiKeys();
        setKeys(result.apiKeys);
      } catch {
        setError("Failed to load API key status");
      }
    }
    void load();
  }, []);

  const activeKeys = keys.filter((key) => !key.revokedAt);
  const snippet = JSON.stringify({
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
  }, null, 2);

  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>MCP Setup</h1>
          <p>Connect Context Vault to Codex, Cursor, Claude Desktop, Windsurf, and other MCP-compatible AI tools.</p>
        </div>
      </header>
      {error && <ErrorBox message={error} />}
      <div className="panel">
        <h2>Connection Status Checklist</h2>
        <ul className="checklist">
          <li>Project context exists</li>
          <li>API key created {activeKeys.length === 0 && <Link to={`/projects/${projectId}/api-keys`}>Create one</Link>}</li>
          <li>MCP server installed/built</li>
          <li>MCP config copied</li>
          <li>Health check tested</li>
          <li>context_load tested</li>
        </ul>
      </div>
      <div className="panel">
        <div className="copyRow"><h2>MCP Config Snippet</h2><button className="secondary" onClick={() => copy(snippet)}>Copy config</button></div>
        <pre>{snippet}</pre>
      </div>
      <div className="panel">
        <h2>Example MCP Commands</h2>
        <ul className="promptList">{prompts.map((prompt) => <li key={prompt}><span>{prompt}</span><button className="secondary" onClick={() => copy(prompt)}>Copy</button></li>)}</ul>
      </div>
      <div className="panel">
        <h2>Supported Tools</h2>
        <div className="toolGrid">
          {tools.map((tool) => <div className="toolCard" key={tool}><strong>{tool}</strong><p>Add the MCP server config and restart the AI tool.</p></div>)}
        </div>
      </div>
      <div className="panel">
        <h2>Troubleshooting</h2>
        <ul>{troubleshooting.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
