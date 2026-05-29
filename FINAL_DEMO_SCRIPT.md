# Final Demo Script

## 20-Second Problem Intro

AI coding tools are powerful, but they forget project context when chats reset, context windows fill up, or teams switch tools. Important decisions, constraints, issues, and next steps get buried in chat history instead of becoming durable project memory.

## 30-Second Solution Explanation

Context Vault is persistent AI-readable memory for software projects. GitHub remains the source of truth for code, while Context Vault stores the context AI tools need to continue work: product goals, architecture notes, decisions, constraints, known issues, dependencies, next steps, and AI instructions. Every update is review-first through pending suggestions and versioned memory.

## 60-Second Live Demo Flow

1. Open a project in the dashboard and show the Context Vault Workflow panel.
2. Show initialized ProjectContext on the Context page.
3. Show the GitHub App connection for the selected repository.
4. Push a commit such as `Implement MCP API key authentication`.
5. Open the Review Queue and show the smart pending suggestion with source, confidence, reasoning, and grouped changes.
6. Apply the suggestion.
7. Open Version History and show the generated title, summary, source, changed sections, and timestamp.
8. Run `context_load` from the AI CLI and show the updated versioned project memory.

## 20-Second Architecture Explanation

The backend owns auth, project ownership, ProjectContext, suggestions, versions, API keys, GitHub events, and webhooks. The dashboard is the review and control layer. The MCP server is the AI-tool access layer, using scoped API keys so Codex, Cursor, Claude, and other tools can load the same project memory.

## 20-Second Closing Impact

Context Vault makes AI-assisted development continuous across tools and sessions. Teams keep their code in GitHub, keep project understanding in Context Vault, and let every AI client start from the same reviewed, versioned source of truth.
