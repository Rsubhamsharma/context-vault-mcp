# Context Vault MCP Demo Flow

1. Start the backend.

```bash
npm run dev
```

2. Start the frontend dashboard.

```bash
cd frontend
npm run dev
```

3. Open the dashboard, login, create a project, and initialize or verify project context.

4. Go to the project MCP Setup page.

5. Create an API key with:

```text
context:read
context:write:suggestion
```

6. Copy the raw `cv_live_...` key once.

7. Build the MCP server.

```bash
cd context-vault-mcp
npm run build
```

8. Copy the MCP config from the dashboard into Cursor, Claude Desktop, Windsurf, Claude Code, or MCP Inspector. Use the API key and project ID from the dashboard.

9. Run MCP Inspector.

```bash
npm run inspect
```

10. Call `context_health_check`.

Expected:

```json
{
  "backendReachable": true,
  "authenticated": true,
  "projectFound": true
}
```

11. Call `context_load`.

Expected: latest official ProjectContext formatted for an AI coding assistant.

12. Call `context_smart`.

Example input:

```json
{
  "task": "improve GitHub review queue"
}
```

Expected: task-relevant context with token estimate and savings.

13. Call `context_create_suggestion`.

Example input:

```json
{
  "title": "Document MCP install improvements",
  "suggestedPatch": {
    "nextSteps": ["Review MCP setup documentation and dashboard config copy flow."],
    "architectureNotes": ["MCP package supports health checks and standard stdio client configs."]
  }
}
```

14. Return to the dashboard Suggestions page.

15. Confirm the pending MCP-created suggestion appears. It should not change official ProjectContext until applied manually.
