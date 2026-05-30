# Context Vault Final Demo Script

## 20-Second Opening Pitch

AI coding tools are powerful, but they lose project context across chats, sessions, and platforms.

Every time a developer switches tools or starts a new conversation, they repeat the same background: architecture, product decisions, constraints, known issues, and next steps.

GitHub stores code. Context Vault stores AI-readable project memory.

## 30-Second Product Explanation

Context Vault is a persistent project memory layer for AI-assisted development.

It stores project understanding separately from any single AI tool, chat thread, or coding agent. GitHub remains the source of truth for code. Context Vault becomes the source of truth for structured AI context.

Any MCP-compatible AI tool can connect with an API key and load the latest optimized project memory before it starts working. That means switching tools no longer means starting from zero.

## 90-Second Live Demo Flow

### A. Open Landing Page

Show the product promise immediately:

- GitHub stores code.
- Context Vault stores memory.
- AI tools can share the same project understanding.

Script:

"This is Context Vault. The core idea is simple: GitHub stores the code, but it does not store the evolving project understanding that AI tools need to work well."

### B. Login

Log in and show the authenticated dashboard.

Script:

"Once I log in, I get a private dashboard. Logged-out users cannot access private project features."

### C. Open Project

Open a project or vault from the dashboard.

Script:

"Each project has its own vault. This keeps memory scoped to the project instead of leaking context across unrelated work."

### D. Open Project Context

Show the official memory sections:

- Goal
- Architecture
- Features
- Decisions
- Constraints
- Next steps

Script:

"This is the official ProjectContext. It is structured for AI agents, not just humans. It captures where the project is going, how it is built, what decisions have been made, what constraints matter, and what should happen next."

### E. Open MCP Setup

Show:

- API key based setup
- MCP config
- Example `context_load` command

Script:

"Context Vault works across AI tools through MCP. I create a scoped API key, add this MCP config to my AI client, and that client can load project memory with tools like `context_load` or `context_smart`."

### F. Open GitHub Page

Show:

- GitHub App connected
- Selected repository
- Recent events

Script:

"Context Vault also connects to GitHub. It can watch the repository and understand pushes and pull requests."

### G. Push Commit Or Show Existing GitHub Event

Explain:

"When a GitHub event arrives, Context Vault does not directly mutate official memory. It creates a pending suggestion."

Show either a fresh event or an existing recent event.

### H. Open Suggestions Page

Show:

- GitHub suggestion
- Reasoning
- Suggested memory patch
- Apply, reject, reopen, and delete behavior

Script:

"This is the review queue. Suggestions can come from GitHub, manual capture, imported git summaries, or AI agent auto-capture. Every suggestion shows reasoning and the exact memory patch before anything becomes official."

### I. Apply Suggestion

Apply one suggestion.

Script:

"Only after review do I apply the suggestion. This is the safety boundary: automation can propose memory changes, but the user controls the official project memory."

### J. Open Versions Page

Show:

- New version snapshot
- Changed sections
- Version history

Script:

"Applying a suggestion creates a versioned snapshot. The team can see what changed and when. Duplicate applies and no-op versions are blocked, so the history stays meaningful."

### K. Run `context_load` In AI CLI

Run or show `context_load`.

Script:

"Now another AI tool can load the latest optimized context through MCP. It starts with the same project memory, even if it has never seen this repo or chat before."

## 30-Second Architecture Explanation

Context Vault has a few clear layers:

- Backend source of truth for authenticated projects and vault data
- `ProjectContext` as the official AI-readable memory
- `ContextSuggestion` as the review queue for proposed updates
- `ContextVersion` as immutable history snapshots
- API keys for scoped MCP client access
- MCP server exposing tools such as `context_load`, `context_smart`, `context_capture`, `context_import_git`, `context_auto_capture`, `context_health_check`, and `github_connect_url`
- GitHub App and webhooks for push and PR driven suggestions
- Frontend review dashboard for setup, review, application, and history

Script:

"The backend owns the source of truth. GitHub and MCP clients can feed suggestions into the system, but the frontend review workflow controls what becomes official memory."

## Safety Model Explanation

Context Vault is review-first by design:

- GitHub events cannot directly update official memory.
- MCP clients use scoped API keys.
- API keys cannot apply suggestions.
- User review and apply is required before `ProjectContext` changes.
- Duplicate apply and no-op version creation are blocked.
- Logged-out users cannot access private project data.

Script:

"The important part is that automation helps collect and summarize context, but it does not silently rewrite the project memory. The user stays in control."

## Closing Pitch

Context Vault gives every AI tool the same project memory, so switching tools no longer means starting from zero.

## Backup Demo Path

### If GitHub Webhook Fails

Use this path:

1. Show an existing GitHub event or existing GitHub suggestion.
2. Use Manual Capture to create a suggestion.
3. Use `context_auto_capture` from an AI agent if available.
4. Apply the suggestion from the review queue.
5. Show the new version.
6. Run or show `context_load`.

Fallback script:

"Even without a live webhook, the workflow is the same. Context enters as a suggestion, the user reviews it, applying it updates official memory, and every MCP client can load the result."

### If MCP CLI Fails

Use this path:

1. Show the MCP Setup page.
2. Show the copied MCP config.
3. Show the API key based setup.
4. Show latest `context_load` output from a previous successful test.

Fallback script:

"The live CLI is just one MCP client. The setup page shows exactly how any compatible AI tool connects, and this previous output shows the optimized context returned by `context_load`."

## Final Checklist Before Demo

- [ ] Backend running
- [ ] Frontend running
- [ ] MCP server built
- [ ] Valid API key
- [ ] GitHub App connected
- [ ] At least one pending suggestion available
- [ ] At least one applied version visible
- [ ] `context_load` tested
- [ ] Login credentials ready
- [ ] Backup screenshots ready

## Quick Presenter Notes

- Keep the opening centered on the pain: AI tools forget project context.
- Repeat the core contrast: GitHub stores code, Context Vault stores memory.
- Emphasize review-first safety before applying a suggestion.
- End by showing cross-AI continuity through MCP.
