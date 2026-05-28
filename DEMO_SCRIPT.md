# Context Vault Demo Script

## Problem

AI coding sessions lose project memory when a user switches tools, starts a new chat, or moves from one assistant to another. GitHub stores code, but it does not store the AI-readable decisions, constraints, next steps, and working context that an assistant needs to continue.

## Solution

Context Vault is a persistent account-based context store for AI-assisted development. It stores official project memory as ProjectContext, tracks immutable ContextVersion snapshots, and routes all proposed updates through reviewable ContextSuggestion records.

## GitHub vs Context Vault

GitHub remains the source of truth for code. Context Vault is the source of truth for AI-readable project memory. GitHub webhooks can detect code changes, but they only create pending suggestions. They never mutate official ProjectContext automatically.

## MCP Cross-AI Continuity

The Context Vault MCP server lets Codex CLI, Cursor, Claude Desktop, Windsurf, and future tools load the same project memory using a scoped API key. Running `context_load` gives the receiving AI an optimized handoff instead of a stale chat summary.

## Smart GitHub Suggestion

When a GitHub push or pull request arrives, Context Vault analyzes safe metadata such as commit messages and PR titles. It creates a meaningful pending suggestion with features, decisions, constraints, issues, next steps, architecture notes, confidence, and reasoning.

## Review-First Safety

AI, MCP, GitHub, and cleanup suggestions do not change official memory until the user applies them. Duplicate apply is prevented, and no ContextVersion is created when a suggestion adds nothing new.

## Final Impact

Context Vault makes AI project memory portable, reviewable, versioned, and reusable across tools. A new AI assistant can start with the latest project context instead of asking the user to explain everything again.
