# Context Vault

Context Vault is a persistent project memory system for AI-assisted development.

GitHub stores your code. Context Vault stores the project context an AI assistant needs to continue work accurately: goals, architecture notes, decisions, constraints, known issues, dependencies, next steps, and AI instructions.

The product has two main parts:

- **Dashboard**: manage projects, review context, apply suggestions, inspect versions, connect GitHub, and create MCP API keys.
- **MCP server**: lets AI tools such as Codex, Cursor, Claude Desktop, Claude Code, Windsurf, and MCP Inspector read the same project memory.

Context Vault is review-first. AI tools, GitHub events, and MCP tools can create pending suggestions, but official project memory changes only when you apply a suggestion in the dashboard.

## Pitch

**Problem:** AI tools lose project context across chats and platforms.

**Solution:** Context Vault stores versioned AI-readable project memory and exposes it through MCP.

**Why not GitHub:** GitHub stores code. Context Vault stores decisions, constraints, architecture, issues, next steps, and AI handoff context.

**Core flow:** GitHub, Manual, or MCP update -> pending suggestion -> review/apply -> versioned memory -> MCP handoff.

## What It Solves

AI coding sessions often lose important project knowledge when chats reset, tools change, or context windows fill up. Context Vault gives every supported AI client a shared, account-based source of truth for the project.

Use it to:

- Keep long-term project memory outside chat history.
- Load the latest project context in any MCP-capable AI client.
- Capture meaningful implementation work as reviewable suggestions.
- Track immutable context versions over time.
- Connect GitHub so commits and pull requests can create reviewable memory suggestions.
- Avoid accidental auto-mutation of official project context.

## Product Concepts

**ProjectContext**

The latest official memory for a project. It includes the project goal, tech stack, features, decisions, constraints, issues, dependencies, next steps, architecture notes, and AI instructions.

**ContextSuggestion**

A proposed update to project memory. Suggestions can come from the dashboard, MCP tools, GitHub events, or AI agents. Suggestions are pending until reviewed.

**ContextVersion**

An immutable snapshot created when official project context changes. Versions make it easy to inspect how project memory evolved.

**MCP API Key**

A scoped key used by AI clients to access Context Vault through the MCP server. Do not use your login JWT in MCP client configs.

## Local Setup

### 1. Install dependencies

```bash
npm install
cd frontend && npm install
cd ../context-vault-mcp && npm install
cd ..
```

### 2. Configure the backend

Create `.env` from `.env.example` and set the required values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/context_vault
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=http://localhost:4000
```

Optional GitHub App values:

```env
GITHUB_APP_NAME=context-vault
GITHUB_APP_SLUG=your-github-app-slug
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY_PATH=C:\path\to\github-app-private-key.pem
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
```

You can also use `GITHUB_APP_PRIVATE_KEY` with escaped `\n` newlines, but `GITHUB_APP_PRIVATE_KEY_PATH` is easier for local development.

### 3. Prepare the database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start the app

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open the dashboard at:

```text
http://localhost:5173
```

## First Use

1. Create an account or log in.
2. Create a project.
3. Add or initialize the project context from the dashboard.
4. Open the MCP setup page.
5. Create an MCP API key.
6. Build the MCP server.
7. Add the MCP server config to your AI client.
8. Run `context_health_check` from the AI client.
9. Run `context_load` or `context_smart` before project work. `context_load raw=false` defaults to aggressive semantic compression for a compact handoff.

## MCP Setup

Build the MCP server:

```bash
cd context-vault-mcp
npm run build
```

The server runs as a standard stdio MCP server:

```text
node ABSOLUTE_PATH_TO/context-vault-mcp/build/index.js
```

Use these environment variables in your MCP client config:

```env
CONTEXT_VAULT_API_URL=http://localhost:4000
CONTEXT_VAULT_API_KEY=cv_live_xxxxx
CONTEXT_VAULT_PROJECT_ID=project_id
```

Create `CONTEXT_VAULT_API_KEY` in the dashboard on the MCP setup page. The raw key is shown only once.

Optional AI-assisted semantic compaction:

```env
CONTEXT_VAULT_COMPACTION_AI_PROVIDER=gemini
CONTEXT_VAULT_COMPACTION_AI_MODEL=gemini-2.0-flash
GEMINI_API_KEY=your_optional_gemini_key
```

AI compaction is not required. If it is not configured, times out, or returns invalid JSON, the MCP server falls back to deterministic semantic compression.

Recommended scopes:

```text
context:read
context:write:suggestion
```

## MCP Client Config

Use absolute paths. Replace the API key and project ID with values from the dashboard.

```json
{
  "mcpServers": {
    "context-vault": {
      "command": "node",
      "args": ["C:\\Users\\you\\path\\to\\contextvault_mcp\\context-vault-mcp\\build\\index.js"],
      "env": {
        "CONTEXT_VAULT_API_URL": "http://localhost:4000",
        "CONTEXT_VAULT_API_KEY": "cv_live_xxxxx",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}
```

This same block works for MCP-capable clients that accept standard stdio server config, including Cursor, Claude Desktop, Windsurf, and similar tools.

For Claude Code or other CLI clients, use the equivalent registration flow:

```text
command: node
args: C:\Users\you\path\to\contextvault_mcp\context-vault-mcp\build\index.js
env:
  CONTEXT_VAULT_API_URL=http://localhost:4000
  CONTEXT_VAULT_API_KEY=cv_live_xxxxx
  CONTEXT_VAULT_PROJECT_ID=project_id
```

## MCP Tools

Available tools include:

- `context_health_check`: verify backend reachability, API key auth, and project access.
- `context_load`: load the latest official project context. `raw=false` defaults to `compression="aggressive"`; use `standard` for fuller output, `ultra` for very small context windows, or `raw=true` for the full uncompressed ProjectContext.
- `context_smart`: load task-relevant project context.
- `context_search`: search within the latest project context.
- `context_versions`: list context versions.
- `context_load_version`: load a historical context snapshot.
- `context_create_suggestion`: create a pending suggestion.
- `context_capture`: convert notes into a pending suggestion.
- `context_import_git`: convert git summaries into a pending suggestion.
- `context_auto_capture`: create a pending suggestion after meaningful completed work.
- `github_connect_url`: get the GitHub App install URL for a project.

Suggestion tools never apply changes directly. Review and apply suggestions in the dashboard.

## Recommended AI Client Instructions

Add this to your project instructions for Codex, Cursor, Claude, or similar agents:

```text
Use Context Vault as the source of truth for project memory. Before implementation advice, call context_load or context_smart. After meaningful implementation, bug fix, refactor, integration, or verification work, create a pending Context Vault suggestion using context_auto_capture. Do not apply suggestions automatically.
```

## Example Prompts

```text
Use Context Vault and run context_health_check.
```

```text
Load the latest Context Vault project context before changing code.
```

```text
Use Context Vault and call context_load with raw false and compression aggressive.
```

```text
Use Context Vault and call context_load with raw false and compression ultra for a small context window.
```

```text
Use context_smart for this task: fix GitHub App repository mapping.
```

```text
Search Context Vault for decisions about MCP authentication.
```

```text
Create a pending Context Vault suggestion summarizing the work completed in this session.
```

## GitHub Integration

Context Vault can connect to GitHub through a GitHub App. Pushes and pull requests can create pending suggestions based on safe metadata such as branch, commit messages, pull request title, repository, and changed-file summaries.

GitHub suggestions are reviewable. They do not mutate official project context until applied in the dashboard.

For local GitHub App testing, expose the backend with a tunnel such as ngrok:

```bash
ngrok http 4000
```

Use the public URL as your GitHub App webhook target and configure the app callback/setup URL to point at the backend route used by the running app.

## Troubleshooting

**MCP health check says the backend is not reachable**

Make sure the backend is running and `CONTEXT_VAULT_API_URL` points to it.

**MCP API key is invalid**

Create a new MCP API key in the dashboard. Use the raw key immediately; it is shown only once.

**Project not found**

Check `CONTEXT_VAULT_PROJECT_ID`. The project must belong to the same account that created the MCP API key.

**GitHub App installed but no repository appears**

Check backend logs for GitHub App setup errors. For local development, prefer `GITHUB_APP_PRIVATE_KEY_PATH` pointing to the GitHub App `.pem` file.

**Private key problems**

Use one of these forms:

```env
GITHUB_APP_PRIVATE_KEY_PATH=C:\path\to\github-app-private-key.pem
```

or:

```env
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
```

Do not paste an unescaped multiline private key directly into `.env`.

## Development Commands

Backend:

```bash
npm run dev
npm run build
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
```

MCP server:

```bash
cd context-vault-mcp
npm run build
```

## Safety Model

Context Vault separates memory proposals from official memory.

- MCP API keys are scoped.
- Raw API keys are shown once.
- Suggestions are pending by default.
- GitHub and AI-generated suggestions do not auto-apply.
- Official context changes create immutable versions.
- AI clients should load Context Vault memory before relying on stale chat history.
