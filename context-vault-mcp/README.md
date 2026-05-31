# Context Vault MCP Server

Standalone MCP server for Context Vault. It authenticates to the Context Vault backend with a scoped MCP API key and exposes project memory tools to AI clients.

## Tools

- `context_health_check`: verify backend reachability, authentication, and project access.
- `context_load`: load latest official ProjectContext. `raw=false` defaults to `compression="aggressive"` for a compact semantic handoff.
- `context_load_version`: load a clearly labeled historical ContextVersion snapshot.
- `context_smart`: return deterministic task-relevant context.
- `context_search`: search latest ProjectContext.
- `context_versions`: list immutable context versions.
- `context_create_suggestion`: create a pending suggestion only.

`context_create_suggestion` never applies suggestions and never mutates official ProjectContext.

## Quick Start

```bash
cd context-vault-mcp
npm install
npm run build
```

Create `.env`:

```env
CONTEXT_VAULT_API_URL=http://localhost:4000
CONTEXT_VAULT_API_KEY=cv_live_xxxxx
CONTEXT_VAULT_PROJECT_ID=project_id
```

Use a Context Vault MCP API key from the dashboard. Do not use a login JWT in AI tool configs.

Optional AI-assisted semantic compaction:

```env
CONTEXT_VAULT_COMPACTION_AI_PROVIDER=gemini
CONTEXT_VAULT_COMPACTION_AI_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your_optional_gemini_key
```

If AI compaction is not configured or fails validation, the server falls back to deterministic semantic compression.

## context_load Compression

`context_load` accepts:

- `raw`: set `true` to return full stored ProjectContext without optimized formatting.
- `detailLevel`: `compact`, `standard`, or `detailed` for the standard handoff path.
- `compression`: `standard`, `aggressive`, or `ultra`.

Compression levels:

- `standard`: fuller optimized handoff with more original section detail.
- `aggressive`: default for `raw=false`; merges repeated source-of-truth, review-first, API key, GitHub, MCP, and versioning ideas into compact sections.
- `ultra`: minimal useful handoff for small context windows.

Example prompt:

```text
Use Context Vault and call context_load with raw false and compression aggressive.
```

## Using With MCP Inspector

```bash
npm run dev:inspect
```

Or after building:

```bash
npm run inspect
```

Call `context_health_check` first. It should report:

```json
{
  "backendReachable": true,
  "authenticated": true,
  "projectFound": true
}
```

## Using With Cursor

Add this MCP server config, using absolute paths. Each vault uses its own `CONTEXT_VAULT_PROJECT_ID`; for multiple vaults, add one server entry per project and keep each server key unique, such as `context-vault-review-first` or `context-vault-my-saas`.

```json
{
  "mcpServers": {
    "context-vault-project-slug": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/context-vault-mcp/build/index.js"],
      "env": {
        "CONTEXT_VAULT_API_URL": "http://localhost:4000",
        "CONTEXT_VAULT_API_KEY": "cv_live_xxxxx",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}
```

## Using With Claude Desktop

Put the same project-specific server block in Claude Desktop's MCP config file:

```json
{
  "mcpServers": {
    "context-vault-project-slug": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/context-vault-mcp/build/index.js"],
      "env": {
        "CONTEXT_VAULT_API_URL": "http://localhost:4000",
        "CONTEXT_VAULT_API_KEY": "cv_live_xxxxx",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}
```

Restart Claude Desktop after editing its config.

## Using With Windsurf

If your Windsurf build supports MCP server configuration, use the same project-specific stdio server config:

```json
{
  "mcpServers": {
    "context-vault-project-slug": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/context-vault-mcp/build/index.js"],
      "env": {
        "CONTEXT_VAULT_API_URL": "http://localhost:4000",
        "CONTEXT_VAULT_API_KEY": "cv_live_xxxxx",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}
```

## Using With Claude Code

Use Claude Code's MCP server registration flow with:

```text
command: node
args: ABSOLUTE_PATH_TO/context-vault-mcp/build/index.js
env:
  CONTEXT_VAULT_API_URL=http://localhost:4000
  CONTEXT_VAULT_API_KEY=cv_live_xxxxx
  CONTEXT_VAULT_PROJECT_ID=project_id
```

The exact command syntax depends on your Claude Code version. The server itself is a standard stdio MCP server.

## Example Prompts

```text
Use Context Vault and run context_health_check.
```

```text
Use Context Vault and load the latest project context.
```

```text
Use Context Vault smart context for this task: improve GitHub review queue.
```

```text
Search Context Vault for decisions about MCP authentication.
```

```text
Load historical Context Vault version 1.
```

```text
Create a pending Context Vault suggestion for the MCP install improvements.
```

## Troubleshooting

`Context Vault backend is not reachable. Check CONTEXT_VAULT_API_URL and make sure the backend is running.`

Start the backend and confirm `CONTEXT_VAULT_API_URL` points to it.

`Context Vault API key is invalid, revoked, or missing required scope.`

Create a new MCP API key in the dashboard. Use scopes `context:read` and `context:write:suggestion` for the full demo.

`Project not found or this API key does not have access to it.`

Check `CONTEXT_VAULT_PROJECT_ID` and confirm the project belongs to the same account that created the API key.

`Missing CONTEXT_VAULT_PROJECT_ID. Pass projectId or set it in MCP env.`

Set `CONTEXT_VAULT_PROJECT_ID` in the MCP config or pass `projectId` to the tool.
