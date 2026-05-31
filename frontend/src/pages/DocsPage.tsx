import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

type DocsSection = {
  id: string;
  title: string;
  group: string;
  toc?: string;
  pageHeadings?: string[];
  content: ReactNode;
};

const mcpConfig = `{
  "mcpServers": {
    "context-vault": {
      "command": "node",
      "args": ["path/to/context-vault-mcp/build/index.js"],
        "env": {
        "CONTEXT_VAULT_API_URL": "http://localhost:4000",
        "CONTEXT_VAULT_API_KEY": "cv_live_...",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}`;

const optionalCompactionConfig = `{
  "env": {
    "CONTEXT_VAULT_COMPACTION_AI_PROVIDER": "gemini",
    "CONTEXT_VAULT_COMPACTION_AI_MODEL": "gemini-2.0-flash",
    "GEMINI_API_KEY": "your_optional_gemini_key"
  }
}`;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return <button className="docsCopyButton" onClick={() => void copy()} type="button">{copied ? "Copied" : "Copy"}</button>;
}

function DocsCallout({ children, tone = "info", title }: { children: ReactNode; tone?: "info" | "warning" | "success"; title: string }) {
  return (
    <aside className={`docsCallout ${tone}`}>
      <strong>{title}</strong>
      <p>{children}</p>
    </aside>
  );
}

function DocsCodeBlock({ code }: { code: string }) {
  return (
    <div className="docsCodeBlock">
      <header>
        <span>json</span>
        <CopyButton value={code} />
      </header>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function DocsTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="docsDefinitionTable">
      {rows.map(([term, description]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocsStepList({ steps }: { steps: string[] }) {
  return (
    <ol className="docsStepList">
      {steps.map((step, index) => (
        <li key={step}>
          <span>{index + 1}</span>
          <p>{step}</p>
        </li>
      ))}
    </ol>
  );
}

function DocsTroubleshooting() {
  const items = [
    ["MCP health check fails", "Backend URL, API key, or project ID is wrong.", "Verify config values, confirm the backend is running, then restart the AI tool."],
    ["context_load auth error", "The key is missing, revoked, or lacks context:read.", "Create a new scoped API key and update your MCP config."],
    ["API key revoked", "The key was deleted from Context Vault.", "Create a new key and copy it into your MCP client config."],
    ["Wrong project ID", "CONTEXT_VAULT_PROJECT_ID points to another vault.", "Replace it with the current project ID."],
    ["Backend URL mismatch", "The MCP client cannot reach the API server.", "Check CONTEXT_VAULT_API_URL and local port."],
    ["GitHub App connected but no suggestions", "The app may not have access to the repo or no new event has arrived.", "Check repository access and push a new commit or PR."],
    ["ngrok URL changed", "The webhook target no longer matches the live tunnel.", "Update the GitHub App webhook URL."],
    ["AI tool not restarted", "MCP config changes were not reloaded.", "Fully restart the AI tool."]
  ];

  return (
    <div className="docsTroubleshooting">
      {items.map(([symptom, cause, fix]) => (
        <details key={symptom}>
          <summary>{symptom}</summary>
          <dl>
            <div><dt>Likely cause</dt><dd>{cause}</dd></div>
            <div><dt>Fix</dt><dd>{fix}</dd></div>
          </dl>
        </details>
      ))}
    </div>
  );
}

const sections: DocsSection[] = [
  {
    id: "overview",
    title: "Overview",
    group: "Getting Started",
    toc: "What Context Vault is",
    pageHeadings: ["What Context Vault is", "Why it exists", "GitHub vs Context Vault", "When to use it"],
    content: (
      <>
        <h2>What Context Vault is</h2>
        <p>Context Vault is a persistent cross-AI project memory layer. It stores the structured project memory AI tools need: project goal, product promise, architecture notes, completed features, decisions, constraints, issues, dependencies, next steps, and AI instructions.</p>
        <h3>Why it exists</h3>
        <p>AI coding tools lose context across chats, tools, and sessions. Context Vault gives every connected tool the same source of project understanding, so users do not have to re-explain decisions, constraints, or architecture every time they switch tools.</p>
        <div className="docsCompareTable">
          <div>
            <h3>GitHub stores</h3>
            <ul><li>Files</li><li>Commits</li><li>Pull requests</li><li>Code history</li></ul>
          </div>
          <div>
            <h3>Context Vault stores</h3>
            <ul><li>Project goal</li><li>Decisions</li><li>Constraints</li><li>Architecture notes</li><li>Known issues</li><li>Next steps</li><li>AI handoff memory</li></ul>
          </div>
        </div>
        <h3>When to use it</h3>
        <ul>
          <li>Switching between Codex, Cursor, Claude, Windsurf, Claude Code, and MCP Inspector.</li>
          <li>Preserving implementation decisions across long-running AI-assisted projects.</li>
          <li>Preventing repeated explanations when a new tool or model joins the work.</li>
          <li>Creating a better handoff than a stale chat summary.</li>
        </ul>
      </>
    )
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    group: "Getting Started",
    toc: "Core concepts",
    pageHeadings: ["Core concepts", "Core objects", "Core flow"],
    content: (
      <>
        <h2>Core concepts</h2>
        <DocsTable rows={[
          ["ProjectContext", "The latest official cumulative memory for a project. AI tools should treat it as the source of truth for project understanding."],
          ["ContextSuggestion", "A proposed change to ProjectContext. Suggestions can come from GitHub, MCP, manual capture, or auto capture. They do not change official memory until applied."],
          ["ContextVersion", "An immutable snapshot of ProjectContext created after a meaningful official update. Versions let users inspect how memory changed over time."],
          ["MCP Server", "The integration layer that lets AI tools call context_load, context_smart, context_auto_capture, and other Context Vault tools."],
          ["Context Load Compression", "The raw=false handoff can use standard, aggressive, or ultra compression. Aggressive is the default for compact cross-AI handoffs."],
          ["API Key", "A scoped credential for MCP clients. Keys can read context and create suggestions, but must not directly mutate ProjectContext."],
          ["GitHub App", "The official GitHub integration. Users select repositories, and push or PR events create reviewable suggestions."]
        ]} />
        <h3>Core flow</h3>
        <p className="docsFlow">GitHub / MCP / Manual / Auto Capture &gt; pending ContextSuggestion &gt; user review &gt; apply &gt; ProjectContext update &gt; ContextVersion snapshot &gt; AI tools load latest context through MCP</p>
      </>
    )
  },
  {
    id: "user-journey",
    title: "User Journey",
    group: "Getting Started",
    toc: "Setup workflow",
    pageHeadings: ["User journey", "Typical setup path"],
    content: (
      <>
        <h2>User journey</h2>
        <DocsStepList steps={[
          "Create a project",
          "Initialize context",
          "Create API key",
          "Connect MCP client",
          "Connect GitHub App",
          "Push code or finish AI work",
          "Review suggestion",
          "Apply suggestion",
          "New version is created",
          "Another AI tool loads latest context"
        ]} />
      </>
    )
  },
  {
    id: "mcp-setup",
    title: "MCP Setup",
    group: "Setup",
    toc: "MCP configuration",
    pageHeadings: ["MCP setup", "Prerequisites", "Configuration", "Command examples"],
    content: (
      <>
        <h2>MCP setup</h2>
        <p>MCP is the primary way AI tools load Context Vault memory. Connect Context Vault to Codex, Cursor, Claude Desktop, Windsurf, Claude Code, MCP Inspector, and other MCP-compatible tools.</p>
        <h3>Prerequisites</h3>
        <ul><li>Backend running and reachable from the MCP client.</li><li>Context Vault MCP server built.</li><li>Project created and project ID copied.</li><li>API key created with context:read and context:write:suggestion.</li></ul>
        <h3>Configuration</h3>
        <DocsCodeBlock code={mcpConfig} />
        <DocsCallout title="Optional AI compaction" tone="info">Set CONTEXT_VAULT_COMPACTION_AI_PROVIDER=gemini and GEMINI_API_KEY only if you want AI-assisted semantic compaction. If it is missing or fails, Context Vault falls back to deterministic compression.</DocsCallout>
        <DocsCodeBlock code={optionalCompactionConfig} />
        <DocsStepList steps={[
          "Create an API key.",
          "Copy MCP config.",
          "Add config to your AI tool.",
          "Restart the AI tool.",
          "Run context_health_check.",
          "Run context_load with raw false. Aggressive compression is the default.",
          "Use context_smart for task-specific context.",
          "Use context_auto_capture after meaningful work."
        ]} />
        <h3>Command examples</h3>
        <DocsTable rows={[
          ["context_health_check", "Verify backend, API key, and project access."],
          ["context_load", "Load latest project memory. raw=false defaults to compression aggressive."],
          ["context_load compression=standard", "Return a fuller optimized handoff when you want more detail."],
          ["context_load compression=aggressive", "Return the compact semantic handoff recommended for normal MCP use."],
          ["context_load compression=ultra", "Return the smallest useful handoff for tight context windows."],
          ["context_load raw=true", "Return full official ProjectContext unchanged, without optimized formatting."],
          ["context_smart", "Load context filtered to a specific task."],
          ["context_auto_capture", "Create a pending suggestion after meaningful implementation work."],
          ["github_connect_url", "Return the GitHub App installation URL."]
        ]} />
        <h3>Compression behavior</h3>
        <ul>
          <li>standard keeps the safer expanded optimized handoff.</li>
          <li>aggressive merges repeated source-of-truth, review-first, API key, GitHub, MCP, and versioning rules into compact sections.</li>
          <li>ultra keeps only the essentials for small context windows.</li>
          <li>raw=true is for inspection and debugging; it does not use semantic compression.</li>
        </ul>
      </>
    )
  },
  {
    id: "api-keys",
    title: "API Keys",
    group: "Setup",
    pageHeadings: ["API keys", "Scopes", "Security rules"],
    content: (
      <>
        <h2>API keys</h2>
        <p>API keys authenticate MCP clients. The raw key is shown once after creation, the backend stores only a hashed value, and later screens show only the key prefix. Revoked keys stop MCP access and should be replaced with new keys.</p>
        <DocsTable rows={[
          ["context:read", "Allows MCP clients to load project memory."],
          ["context:write:suggestion", "Allows MCP clients to create pending suggestions only."]
        ]} />
        <DocsCallout title="Never commit API keys" tone="warning">Revoke exposed keys immediately and create a replacement key.</DocsCallout>
      </>
    )
  },
  {
    id: "github-app",
    title: "GitHub App",
    group: "Setup",
    toc: "GitHub vs Context Vault",
    pageHeadings: ["GitHub App", "Event flow", "Safety guarantee"],
    content: (
      <>
        <h2>GitHub App</h2>
        <p>Use the GitHub App to connect selected repositories to a Context Vault project. The official GitHub install page opens, the user selects repositories, and setup maps the repository to the project.</p>
        <p>Push and pull request events create pending suggestions. If AI refinement is configured, Context Vault uses event metadata and current ProjectContext to produce smarter memory updates. Manual webhook fallback exists for development and custom cases only.</p>
        <p className="docsFlow">GitHub push / PR &gt; GitHubEvent &gt; smart ContextSuggestion &gt; review / apply &gt; ContextVersion &gt; context_load includes updated memory</p>
        <DocsCallout title="Review-first integration" tone="info">GitHub events never update ProjectContext directly.</DocsCallout>
      </>
    )
  },
  {
    id: "suggestions",
    title: "Suggestions",
    group: "Memory Workflow",
    pageHeadings: ["Suggestions", "Sources", "Status flow", "Apply behavior"],
    content: (
      <>
        <h2>Suggestions</h2>
        <p>Suggestions are reviewable proposed memory updates from GitHub App, MCP, Manual Capture, or Auto Capture. They are the safety layer between signals and official memory.</p>
        <DocsTable rows={[
          ["Pending > Applied", "Apply merges the suggestion into ProjectContext and creates a ContextVersion if meaningful changes exist."],
          ["Pending > Rejected", "Reject discards the proposal without changing ProjectContext."],
          ["Rejected > Reopened > Pending > Applied", "Reopen returns a rejected suggestion to review when it was rejected by mistake."],
          ["Duplicate or no-op apply", "Duplicate and no-op versions are blocked."],
          ["Deleting history", "Deleting applied or rejected suggestions from history does not roll back ProjectContext or ContextVersion."]
        ]} />
      </>
    )
  },
  {
    id: "versions",
    title: "Versions",
    group: "Memory Workflow",
    pageHeadings: ["Versions", "What versions contain", "Why they matter"],
    content: (
      <>
        <h2>Versions</h2>
        <p>Versions are immutable snapshots, not just diffs. Each meaningful official memory update creates a version containing a title, source, summary, changed sections, and a full ProjectContext snapshot.</p>
        <p>Versions help users inspect how project memory changed over time and help new AI tools understand project evolution. Restore behavior should follow the product's existing version-restore model when available.</p>
      </>
    )
  },
  {
    id: "manual-capture",
    title: "Manual Capture",
    group: "Memory Workflow",
    pageHeadings: ["Manual capture", "Capture modes", "Example"],
    content: (
      <>
        <h2>Manual capture</h2>
        <p>Manual Capture is for messy user input that is not represented well by code changes. Users can paste notes, git summaries, release notes, or session summaries, and Context Vault turns them into pending suggestions.</p>
        <DocsTable rows={[
          ["General Note", "Free-form product or engineering notes."],
          ["Git Summary", "Pasted commit or PR summaries."],
          ["Release Note", "Release-level changes that should become memory."],
          ["Session Summary", "AI or developer session notes."]
        ]} />
        <h3>Example</h3>
        <p><strong>Input:</strong> fixed duplicate apply bug and added github app connection</p>
        <p><strong>Output:</strong> a pending suggestion with structured features, decisions, constraints, issues, and architecture notes.</p>
      </>
    )
  },
  {
    id: "auto-capture",
    title: "Auto Capture",
    group: "Memory Workflow",
    pageHeadings: ["Auto capture", "Required fields", "Safety behavior"],
    content: (
      <>
        <h2>Auto capture</h2>
        <p>AI coding agents can call context_auto_capture after meaningful implementation work. Typical inputs include task title, implemented summary, changed areas, and mode such as implementation_summary.</p>
        <DocsCallout title="Pending suggestions only" tone="info">Auto Capture never applies memory automatically. It creates pending suggestions for review.</DocsCallout>
      </>
    )
  },
  {
    id: "safety-model",
    title: "Safety Model",
    group: "Safety & Help",
    toc: "Review-first safety",
    pageHeadings: ["Safety model", "Safety guarantees"],
    content: (
      <>
        <h2>Safety model</h2>
        <ul>
          <li>ProjectContext never changes directly from GitHub webhooks.</li>
          <li>MCP clients create suggestions only.</li>
          <li>API keys are scoped.</li>
          <li>Raw keys are shown once.</li>
          <li>User review and apply is required.</li>
          <li>Duplicate apply is blocked.</li>
          <li>Duplicate and no-op versions are blocked.</li>
          <li>Deleting applied suggestions does not roll back versions or context.</li>
          <li>Manual webhook fallback is low-priority and intended for development or custom cases.</li>
        </ul>
      </>
    )
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    group: "Safety & Help",
    toc: "Troubleshooting",
    pageHeadings: ["Troubleshooting", "Common issues"],
    content: (
      <>
        <h2>Troubleshooting</h2>
        <DocsTroubleshooting />
      </>
    )
  }
];

function DocsSidebar({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }) {
  const groups = Array.from(new Set(sections.map((section) => section.group)));
  const activeGroup = sections.find((section) => section.id === activeId)?.group;
  return (
    <aside className="docsSidebar contextSectionNav">
      <label className="docsMobileSelect">
        Section
        <select value={activeId} onChange={(event) => onNavigate(event.target.value)}>
          {sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
        </select>
      </label>
      <nav aria-label="Docs navigation">
        {groups.map((group) => (
          <div key={group}>
            <h2 className={group === activeGroup ? "isActiveGroup" : undefined}>{group}</h2>
            {sections.filter((section) => section.group === group).map((section) => (
              <button className={activeId === section.id ? "isActive" : ""} key={section.id} onClick={() => onNavigate(section.id)} type="button">
                {section.title}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function DocsToc({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }) {
  const activeSection = useMemo(() => sections.find((section) => section.id === activeId) ?? sections[0], [activeId]);
  const tocItems = activeSection.pageHeadings ?? [activeSection.toc ?? activeSection.title];
  return (
    <aside className="docsToc contextSectionNav">
      <h2>On this page</h2>
      <nav aria-label="On this page">
        {tocItems.map((item, index) => (
          <button className={index === 0 ? "isActive" : ""} key={item} onClick={() => onNavigate(activeSection.id)} type="button">
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  function navigate(id: string) {
    if (activeIdRef.current !== id) {
      activeIdRef.current = id;
      setActiveId(id);
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && sections.some((section) => section.id === hash)) setActiveId(hash);
  }, []);

  useEffect(() => {
    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    const visibleSections = new Map<string, number>();
    let frameId: number | null = null;

    const updateActiveSection = () => {
      frameId = null;
      const nextVisible = Array.from(visibleSections.entries())
        .sort((a, b) => a[1] - b[1])[0]?.[0];

      if (nextVisible && activeIdRef.current !== nextVisible) {
        activeIdRef.current = nextVisible;
        setActiveId(nextVisible);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (!id) return;
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.boundingClientRect.top);
          } else {
            visibleSections.delete(id);
          }
        });

        if (frameId === null) {
          frameId = window.requestAnimationFrame(updateActiveSection);
        }
      },
      {
        root: null,
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.1, 0.25]
      }
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <section className="docsPage">
      <header className="docsPageHeader">
        <h1>Docs</h1>
        <p>Learn how Context Vault stores AI-readable project memory and connects it to your AI tools.</p>
        <div><span>MCP-first</span><span>Review-first</span><span>Versioned memory</span></div>
      </header>
      <div className="docsLayoutShell">
        <DocsSidebar activeId={activeId} onNavigate={navigate} />
        <main className="docsArticle">
          {sections.map((section) => (
            <section className="docsArticleSection" id={section.id} key={section.id}>
              {section.content}
            </section>
          ))}
        </main>
        <DocsToc activeId={activeId} onNavigate={navigate} />
      </div>
    </section>
  );
}
