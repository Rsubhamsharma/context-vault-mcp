# Context Vault Agent Instructions

When working on this project with an AI coding tool:

1. Before starting meaningful work:
   - Call `context_load` or `context_smart`.

2. During work:
   - Follow existing architecture and constraints.

3. After completing meaningful work:
   - Automatically call `context_auto_capture`.
   - Use the implementation summary as input.
   - Do not apply the suggestion.
   - The user will review/apply in dashboard.

4. Never:
   - Directly mutate official ProjectContext from MCP.
   - Auto-apply suggestions.
   - Create duplicate suggestions for the same completed work if one already exists.

Example:

```json
context_auto_capture {
  "taskTitle": "Manual Context Capture",
  "implementedSummary": "Implemented Manual Context Capture backend endpoint, context_capture and context_import_git MCP tools, and dashboard capture form. Capture creates pending ContextSuggestion records only and does not mutate ProjectContext.",
  "changedAreas": ["backend", "mcp", "frontend"],
  "mode": "implementation_summary"
}
```
