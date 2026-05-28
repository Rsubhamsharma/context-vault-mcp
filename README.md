# Context Vault Backend

Persistent, account-based, versioned project context storage for AI-assisted development.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL` plus a long `JWT_SECRET`.

3. Run Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. Optional seed:

```bash
npm run seed
```

5. Start development server:

```bash
npm run dev
```

The API defaults to `http://localhost:4000`.

## Demo Flow

1. Start backend: `npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Create or log in as a user.
4. Create a project.
5. Initialize ProjectContext with the sample demo context from the dashboard Context page.
6. Create an MCP API key from the MCP Setup page.
7. Connect Context Vault MCP in Codex CLI using the copied MCP config.
8. Run `context_health_check`.
9. Run `context_load` and show the optimized AI project handoff.
10. Connect GitHub manually from the GitHub page.
11. Trigger a smart webhook from Postman using a commit message such as `Implement MCP API key authentication`.
12. Review the generated GitHub suggestion in the dashboard.
13. Apply the suggestion.
14. Check readable version history for generated title, summary, changed counts, and preview.
15. Run `context_load` again to show that the AI handoff now includes the applied project memory.

## Automatic Context Capture in AI CLIs

MCP cannot silently capture every AI response by itself. The AI client must be instructed to call a Context Vault MCP tool after meaningful work.

Add this instruction to Codex, OpenCode, Cursor, or similar project instructions:

```text
After completing meaningful implementation work, automatically call Context Vault MCP tool context_auto_capture with the implementation summary. Do not apply the suggestion.
```

Use `context_auto_capture` for completed implementation, bug fixes, refactors, integration work, or demo progress. Do not use it for tiny/no-op changes. The tool creates a pending ContextSuggestion only; the user reviews and applies it in the dashboard.

## Main API Flow

Signup:

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123","name":"Dev"}'
```

Login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123"}'
```

Create project:

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"AI-readable memory store"}'
```

Initialize context:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/context/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Build Context Vault","techStack":["Node.js","TypeScript"],"features":["Versioned context"],"decisions":[],"constraints":[],"issues":[],"dependencies":[],"nextSteps":["Test APIs"],"architectureNotes":[],"aiInstructions":"Use stored context as truth.","changeSummary":"Initial context"}'
```

Patch official context:

```bash
curl -X PATCH http://localhost:4000/api/projects/PROJECT_ID/context \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nextSteps":["Add MCP integration"],"changeSummary":"Updated next steps"}'
```

Create suggestion:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Add architecture note","source":"ai","suggestedPatch":{"architectureNotes":["ProjectContext is the official source of truth"]}}'
```

Apply suggestion:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/suggestions/SUGGESTION_ID/apply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"changeSummary":"Applied architecture note"}'
```

Reject suggestion:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/suggestions/SUGGESTION_ID/reject \
  -H "Authorization: Bearer YOUR_TOKEN"
```

List versions:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/projects/PROJECT_ID/versions
```

Create an MCP API key:

```bash
curl -X POST http://localhost:4000/api/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cursor MCP","scopes":["context:read","context:write:suggestion"]}'
```

The raw `key` is returned only once. Store it in the MCP server as `CONTEXT_VAULT_API_KEY`.

List API keys:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/api-keys
```

Revoke an API key:

```bash
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/api-keys/API_KEY_ID
```

## GitHub Sync Foundation

GitHub sync creates pending `ContextSuggestion` records only. It never mutates official `ProjectContext` directly.

Add these environment variables:

```env
GITHUB_WEBHOOK_DEV_MODE=true
GITHUB_WEBHOOK_SECRET=optional_global_dev_secret
```

Connect a repository manually:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/github/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repoOwner":"owner","repoName":"repo","repoUrl":"https://github.com/owner/repo","defaultBranch":"main","webhookSecret":"optional-dev-secret"}'
```

Check the active connection:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/projects/PROJECT_ID/github/connection
```

Expose the local backend with ngrok:

```bash
ngrok http 4000
```

Create a GitHub webhook:

- Payload URL: `https://YOUR-NGROK-URL/api/github/webhook`
- Content type: `application/json`
- Events: `push` and `pull_request`
- Secret: use `GITHUB_WEBHOOK_SECRET` if configured; optional only when `GITHUB_WEBHOOK_DEV_MODE=true`

Verify stored GitHub events:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/projects/PROJECT_ID/github/events
```

Verify pending GitHub suggestions:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/projects/PROJECT_ID/suggestions
```

Confirm `GET /api/projects/PROJECT_ID/context` is unchanged until a pending suggestion is manually applied.

## Cumulative Context Merge

`ProjectContext` is the complete latest source of truth. Partial updates and applied suggestions merge into the existing context by default instead of replacing arrays.

Merge rules:

- `goal` and `aiInstructions` replace only when a non-empty value is provided.
- `techStack`, `features`, `decisions`, `constraints`, `issues`, `dependencies`, `nextSteps`, and `architectureNotes` merge by default.
- Array values are trimmed, empty strings are ignored, and duplicates are removed case-insensitively.
- Send `mergeMode: "replace"` only for intentional cleanup or restore workflows.

Repair existing local context from version history:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/context/rebuild-from-versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Replace corrupted demo context with a full official context:

```bash
curl -X PUT http://localhost:4000/api/projects/PROJECT_ID/context/replace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal":"Context Vault is a persistent, account-based, versioned context store for AI-assisted development.","techStack":["Node.js","TypeScript","Express","Prisma","PostgreSQL","React","Vite","MCP"],"features":["JWT authentication","Projects","Official ProjectContext","Immutable ContextVersion snapshots","Reviewable ContextSuggestion workflow","Scoped MCP API keys","Context Vault MCP server tools","GitHub repository connection","GitHub webhook ingestion","Smart GitHub Analysis","React dashboard"],"decisions":["ProjectContext is the complete official source of truth","Suggestions never mutate official context until explicitly applied","GitHub events create pending suggestions only","MCP clients authenticate with scoped API keys, not login JWTs","Context updates merge cumulatively by default"],"constraints":["Do not auto-apply AI or GitHub suggestions","Do not store raw API keys","Do not expose webhook secret hashes","Keep GitHub sync suggestion-only until reviewed","No AI provider integration yet","No GitHub App OAuth yet"],"issues":["Existing demo ProjectContext was incomplete and required manual repair"],"dependencies":["@prisma/client","express","zod","jsonwebtoken","bcrypt","@modelcontextprotocol/sdk","react","vite","react-router-dom"],"nextSteps":["Use MCP context_load to verify full repaired context","Demo GitHub webhook creating pending suggestions","Demo MCP-created suggestions appearing in dashboard"],"architectureNotes":["Backend owns auth, project ownership, context versioning, suggestions, API keys, and GitHub webhook processing","ContextVersion snapshots store full ProjectContext after each official change","MCP server is a standalone stdio API bridge to the backend","React dashboard provides project context, suggestions, versions, GitHub setup, and MCP setup"],"aiInstructions":"Use Context Vault as the source of truth. Load context before implementation advice. Create pending suggestions for memory updates; never apply them automatically.","changeSummary":"Repaired demo ProjectContext with full accumulated project memory."}'
```

Postman merge test:

1. Initialize context with:

```json
{
  "goal": "Test cumulative context",
  "techStack": [],
  "features": ["Backend auth"],
  "decisions": ["JWT auth"],
  "constraints": [],
  "issues": [],
  "dependencies": [],
  "nextSteps": [],
  "architectureNotes": [],
  "aiInstructions": "Use Context Vault as source of truth.",
  "changeSummary": "Initial context"
}
```

2. Patch context:

```json
{
  "features": ["MCP server"],
  "decisions": ["API keys for MCP"],
  "changeSummary": "Add MCP memory access"
}
```

Expected latest context:

```json
{
  "features": ["Backend auth", "MCP server"],
  "decisions": ["JWT auth", "API keys for MCP"]
}
```

3. Create and apply a suggestion:

```json
{
  "title": "Add GitHub sync",
  "source": "ai",
  "suggestedPatch": {
    "features": ["GitHub sync"]
  }
}
```

Expected latest context features include:

```json
["Backend auth", "MCP server", "GitHub sync"]
```

4. Call MCP `context_load`. It should return all accumulated features, not only the latest suggestion.

### Smart GitHub Analysis

Webhook processing now uses deterministic, rule-based Smart GitHub Analysis. It reads only safe metadata: event type, action, branch, commit SHA, PR number/title, author, commit messages, compare URL, and safe changed-file summaries when present. It does not store raw patches, fetch diffs, call an AI provider, or mutate official `ProjectContext`.

The analysis classifies changes into suggestion fields such as `features`, `issues`, `decisions`, `dependencies`, `constraints`, `architectureNotes`, and `nextSteps`. Each GitHub suggestion stores `reasoningSummary`, `confidence`, and a link to the related GitHub event.

Later this can be upgraded with an AI provider, but the current implementation is intentionally deterministic and reviewable.

Reprocess an event:

```bash
curl -X POST http://localhost:4000/api/projects/PROJECT_ID/github/events/EVENT_ID/reprocess \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force":false}'
```

Use `{"force":true}` to create a new suggestion when the event already has a related pending suggestion.

Postman push webhook example:

```json
{
  "ref": "refs/heads/main",
  "after": "abc123",
  "repository": {
    "name": "repo",
    "full_name": "owner/repo",
    "html_url": "https://github.com/owner/repo",
    "owner": { "login": "owner" }
  },
  "sender": { "login": "dev" },
  "commits": [
    { "message": "Implement MCP API key authentication" }
  ],
  "head_commit": {
    "id": "abc123",
    "author": { "name": "Dev" }
  },
  "compare": "https://github.com/owner/repo/compare/a...b"
}
```

Headers:

```text
x-github-event: push
x-github-delivery: postman-push-1
Content-Type: application/json
```

Expected suggestion: `features`, `decisions`, and `architectureNotes` mention MCP/API key authentication.

Postman fix example: change commit message to `Fix context version creation bug`.

Expected suggestion: `issues` mentions the fixed context version creation bug.

Postman PR webhook example:

```json
{
  "action": "opened",
  "number": 42,
  "repository": {
    "name": "repo",
    "full_name": "owner/repo",
    "html_url": "https://github.com/owner/repo",
    "owner": { "login": "owner" }
  },
  "sender": { "login": "dev" },
  "pull_request": {
    "title": "Add smart context optimizer",
    "html_url": "https://github.com/owner/repo/pull/42",
    "merged": false,
    "head": { "ref": "feature/smart-context" },
    "user": { "login": "dev" }
  }
}
```

Headers:

```text
x-github-event: pull_request
x-github-delivery: postman-pr-1
Content-Type: application/json
```

Expected suggestion: `features` and `architectureNotes` mention the smart context optimizer.
