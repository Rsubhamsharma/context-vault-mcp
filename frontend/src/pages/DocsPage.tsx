const sections = [
  {
    id: "overview",
    title: "Overview",
    body: ["Context Vault is a persistent project memory layer for AI-assisted development. GitHub stores code. Context Vault stores project understanding."]
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    body: [
      "ProjectContext: latest official memory.",
      "ContextSuggestion: proposed memory update.",
      "ContextVersion: immutable memory snapshot.",
      "MCP: AI-tool access layer.",
      "API Key: scoped token for MCP clients.",
      "GitHub App: automatic code-change signal source."
    ]
  },
  {
    id: "user-journey",
    title: "User Journey",
    body: ["Create project -> Initialize context -> Create API key -> Connect MCP client -> Connect GitHub App -> Push code or finish AI task -> Review smart suggestion -> Apply suggestion -> New version is created -> Another AI tool loads latest context."]
  },
  {
    id: "mcp-setup",
    title: "MCP Setup",
    body: ["Build the MCP server, create an API key, copy the config, add it to your AI tool, restart the tool, run context_health_check, then run context_load."]
  },
  {
    id: "api-keys",
    title: "API Keys",
    body: ["Raw keys are shown once. Use scoped keys, revoke keys you no longer need, never commit keys to GitHub, and remember MCP keys cannot directly mutate ProjectContext."]
  },
  {
    id: "github-app",
    title: "GitHub App",
    body: ["Connect the GitHub App, select repositories, and let push/PR events create pending suggestions. GitHub suggestions are pending only. Manual webhook fallback is for development."]
  },
  {
    id: "suggestions",
    title: "Suggestions",
    body: ["GitHub, manual capture, MCP, and auto-capture can create suggestions. Suggestions must be reviewed. Apply updates official ProjectContext. Reject discards the proposal. Duplicate apply is blocked."]
  },
  {
    id: "versions",
    title: "Versions",
    body: ["Every meaningful official change creates a ContextVersion. Versions are snapshots of full ProjectContext and help inspect project memory history."]
  },
  {
    id: "manual-capture",
    title: "Manual Capture",
    body: ["Paste messy updates or session summaries and Context Vault converts them into reviewable suggestions."]
  },
  {
    id: "auto-capture",
    title: "Auto Capture",
    body: ["AI coding tools can be instructed to call context_auto_capture after meaningful work so the dashboard receives a pending suggestion."]
  },
  {
    id: "safety-model",
    title: "Safety Model",
    body: ["ProjectContext never changes from a GitHub webhook directly. MCP clients create suggestions only. API keys are scoped. User review/apply is required. Duplicate/no-op version creation is blocked."]
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: ["MCP health check fails: verify backend URL and API key.", "context_load auth error: create a new active key.", "GitHub App connected but no suggestions: check webhook delivery and selected repo mapping.", "Wrong project ID or backend URL mismatch can prevent MCP access.", "If ngrok changed, update GitHub App webhook URL."]
  }
];

export function DocsPage() {
  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>Context Vault Docs</h1>
          <p>Learn how Context Vault stores AI-readable project memory and connects it to your AI tools.</p>
        </div>
      </header>
      <div className="docsLayout">
        <aside className="docsNav">
          {sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
        </aside>
        <div>
          {sections.map((section) => (
            <article className="panel" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.body.map((line) => <p key={line}>{line}</p>)}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
