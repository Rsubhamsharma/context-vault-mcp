import { Link } from "react-router-dom";

const navLinks = [
  { href: "#product", label: "Product", external: true },
  { href: "#workflow", label: "Workflow", external: true },
  { href: "/mcp", label: "MCP" },
  { href: "/github", label: "GitHub" },
  { href: "/docs", label: "Docs" }
];

const trustBadges = ["Review-first", "GitHub App", "MCP API keys", "Versioned memory"];

const painRows = [
  ["New chats start blind", "Goals, architecture, constraints, and prior decisions have to be rebuilt from memory."],
  ["Commits show code, not intent", "Git history explains what changed, but not what future AI tools need to understand."],
  ["Manual handoffs rot quickly", "Summaries drift out of date as implementation details move across tools and chats."]
];

const workflowSteps = [
  ["Connect GitHub App", "Select the repositories that should send code-change signals."],
  ["Push code or finish AI work", "GitHub events, manual notes, and agent summaries become capture inputs."],
  ["Smart suggestion is created", "ContextSuggestion drafts structured updates without mutating official memory."],
  ["User reviews and applies", "You approve what becomes part of the cumulative ProjectContext."],
  ["Versioned memory updates", "Each accepted change creates an immutable ContextVersion snapshot."],
  ["Any AI tool loads context", "MCP-compatible clients continue with the same project understanding."]
];

const commandChips = [
  "context_health_check",
  "context_load",
  "context_smart",
  "context_auto_capture",
  "github_connect_url"
];

const safetyPoints = [
  "GitHub events create pending suggestions only",
  "MCP clients use scoped API keys",
  "API keys can be revoked",
  "Duplicate/no-op versions are blocked",
  "Official ProjectContext changes only after user approval",
  "AI refinement falls back safely"
];

const audiences = [
  ["Solo developers", "Keep long-running projects coherent across multiple AI coding sessions."],
  ["Startup founders", "Preserve product decisions, architecture direction, and implementation history."],
  ["AI power users", "Move between Codex, Cursor, Claude, Windsurf, and Claude Code without resetting context."],
  ["Small teams", "Maintain a shared source of truth for AI-readable project memory."]
];

const footerColumns = [
  ["Product", "Dashboard", "Suggestions", "Versions", "GitHub App", "MCP Setup"],
  ["Resources", "Docs", "API Keys", "Troubleshooting", "Demo Flow"],
  ["Company", "About", "Privacy", "Terms"]
];

const mcpConfig = `{
  "mcpServers": {
    "context-vault": {
      "command": "node",
      "env": {
        "CONTEXT_VAULT_API_KEY": "cv_live_",
        "CONTEXT_VAULT_PROJECT_ID": "project_id"
      }
    }
  }
}`;

function LogoMark() {
  return (
    <span className="landingLogoMark" aria-hidden="true">
      <span />
    </span>
  );
}

function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "green" | "blue" }) {
  return <span className={`statusPill statusPill-${tone}`}><i aria-hidden="true"></i>{children}</span>;
}

function LandingNavbar() {
  return (
    <header className="landingNavShell">
      <div className="landingNav">
        <Link to="/" className="landingBrand" aria-label="Context Vault home">
          <LogoMark />
          <span>Context Vault</span>
        </Link>
        <nav className="landingDesktopNav" aria-label="Landing navigation">
          {navLinks.map((item) => item.external
            ? <a key={item.href} href={item.href}>{item.label}</a>
            : <Link key={item.href} to={item.href}>{item.label}</Link>)}
        </nav>
        <div className="landingNavActions">
          <Link to="/login" className="landingTextLink">Sign in</Link>
          <Link to="/signup" className="landingButton landingButtonPrimary">Get Started</Link>
        </div>
        <details className="landingMobileMenu">
          <summary aria-label="Open navigation"><span></span><span></span><span></span></summary>
          <div className="landingMobileMenuPanel">
            {navLinks.map((item) => item.external
              ? <a key={item.href} href={item.href}>{item.label}</a>
              : <Link key={item.href} to={item.href}>{item.label}</Link>)}
            <Link to="/login">Sign in</Link>
            <Link to="/signup" className="landingButton landingButtonPrimary">Get Started</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

function ProductMockup() {
  return (
    <div className="productMockup" aria-label="Layered Context Vault product mockup">
      <div className="mockupAura" aria-hidden="true"></div>
      <section className="mockupLayer mockupLayer-main">
        <div className="mockupChrome">
          <span>Project Memory</span>
          <strong>v14</strong>
          <StatusPill tone="green">MCP connected</StatusPill>
        </div>
        <div className="mockupBody">
          <article className="memoryPanel">
            <div className="panelLabel">ProjectContext</div>
            <h3>Official cumulative memory</h3>
            <div className="memoryRows">
              <span><b>Goal</b> Cross-AI project handoff layer</span>
              <span><b>Decision</b> Review-first suggestions</span>
              <span><b>Constraint</b> Scoped MCP keys only</span>
            </div>
          </article>
          <article className="suggestionLayer">
            <div className="panelLabel">Pending Suggestion</div>
            <h3>GitHub App Repository Connection Added</h3>
            <p>Suggested updates remain pending until approved.</p>
            <div className="suggestionBars"><span></span><span></span><span></span></div>
          </article>
        </div>
      </section>
      <section className="mockupLayer mockupLayer-timeline">
        <div className="panelLabel">ContextVersion timeline</div>
        <span><i></i> v14, GitHub suggestion approved</span>
        <span><i></i> v13, MCP docs captured</span>
        <span><i></i> v12, no-op version blocked</span>
      </section>
      <section className="mockupLayer mockupLayer-code">
        <code>context_load</code>
        <StatusPill tone="blue">GitHub App connected</StatusPill>
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="landingHero reveal" id="product">
      <div className="landingHeroCopy">
        <p className="eyebrowPill">MCP-first project memory</p>
        <h1>Portable project memory for every AI coding tool.</h1>
        <p className="landingHeroBody">
          Context Vault stores the decisions, constraints, architecture, issues, next steps, and version history your AI tools need to continue from the same source of truth.
        </p>
        <p className="landingTrustLine">GitHub stores your code. Context Vault stores your project understanding.</p>
        <div className="landingHeroActions">
          <Link to="/signup" className="landingButton landingButtonPrimary">Create your vault</Link>
          <Link to="/mcp" className="landingButton landingButtonSecondary">View MCP setup</Link>
        </div>
        <div className="heroBadges" aria-label="Context Vault trust badges">
          {trustBadges.map((badge) => <StatusPill key={badge}>{badge}</StatusPill>)}
        </div>
      </div>
      <ProductMockup />
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="landingSection problemSection reveal">
      <div className="sectionIntro">
        <h2>AI tools lose context. Your project pays the price.</h2>
        <p>AI coding tools are strong inside one session. The failure appears when project understanding has to survive across a new chat, a different model, a repository event, or another tool entirely.</p>
      </div>
      <div className="painList">
        {painRows.map(([title, text]) => (
          <article className="painRow" key={title}>
            <span aria-hidden="true"></span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection() {
  const github = ["Files", "Commits", "Pull requests", "Code history"];
  const vault = ["Product goal", "Decisions", "Constraints", "Architecture notes", "Known issues", "Next steps", "AI handoff context"];

  return (
    <section className="landingSection comparisonSection reveal">
      <div className="sectionIntro sectionIntro-wide">
        <h2>GitHub is your code history. Context Vault is your AI memory.</h2>
      </div>
      <div className="splitComparison">
        <div className="comparisonSide comparisonSide-code">
          <span className="comparisonLabel">GitHub stores</span>
          {github.map((item) => <p key={item}>{item}</p>)}
        </div>
        <div className="comparisonCenter">
          <LogoMark />
          <span>intent layer</span>
        </div>
        <div className="comparisonSide comparisonSide-memory">
          <span className="comparisonLabel">Context Vault stores</span>
          {vault.map((item) => <p key={item}>{item}</p>)}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="landingSection workflowSection reveal" id="workflow">
      <div className="sectionIntro">
        <h2>From code change to AI-ready memory.</h2>
      </div>
      <div className="connectedTimeline">
        {workflowSteps.map(([title, text], index) => (
          <article className="timelineStep" style={{ "--step-index": index } as React.CSSProperties} key={title}>
            <span className="timelineNode">{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="landingSection proofSection reveal" id="docs">
      <div className="sectionIntro">
        <h2>A real dashboard for memory operations.</h2>
        <p>Review suggestions, inspect memory snapshots, confirm GitHub state, and keep MCP access scoped to the project.</p>
      </div>
      <div className="dashboardShell">
        <aside>
          <div className="dashboardBrand"><LogoMark /> Context Vault</div>
          {["Dashboard", "Project Context", "Suggestions", "Versions", "GitHub", "API Keys", "MCP Setup", "Docs"].map((item) => (
            <span key={item} className={item === "Suggestions" ? "active" : ""}>{item}</span>
          ))}
        </aside>
        <main>
          <div className="dashboardHeroRow">
            <div>
              <span className="panelLabel">Project memory status</span>
              <h3>Official ProjectContext is healthy</h3>
              <p>Latest cumulative memory loaded through MCP 4 minutes ago.</p>
            </div>
            <StatusPill tone="green">GitHub App connected</StatusPill>
          </div>
          <div className="dashboardGrid">
            <article className="reviewQueue">
              <span className="panelLabel">Pending suggestions</span>
              <div className="queueCard">
                <strong>PR #42, scoped API key revocation</strong>
                <p>Decision, constraint, and architecture notes detected.</p>
              </div>
              <div className="queueCard secondaryQueue">
                <strong>AI auto-capture, MCP docs pass</strong>
                <p>Next steps and setup guidance proposed.</p>
              </div>
            </article>
            <article className="versionMini">
              <span className="panelLabel">ContextVersion timeline</span>
              <p><i></i> v18, suggestion applied</p>
              <p><i></i> v17, GitHub mapping captured</p>
              <p><i></i> v16, duplicate version blocked</p>
            </article>
            <article className="statusStrip">
              <StatusPill tone="blue">MCP API key scoped</StatusPill>
              <StatusPill tone="green">Repository selected</StatusPill>
            </article>
          </div>
        </main>
      </div>
    </section>
  );
}

function McpSection() {
  return (
    <section className="landingSection mcpSection reveal" id="mcp">
      <div className="sectionIntro">
        <h2>Designed for MCP-first AI workflows.</h2>
        <p>Context Vault exposes your project memory through MCP, so AI tools can load context, search memory, create suggestions, and auto-capture implementation summaries.</p>
        <div className="commandChips">{commandChips.map((chip) => <code key={chip}>{chip}</code>)}</div>
      </div>
      <div className="codePanel">
        <div className="codePanelBar"><span></span><span></span><span></span><strong>mcp.json</strong></div>
        <pre><code>{mcpConfig}</code></pre>
      </div>
    </section>
  );
}

function GitHubSuggestionSection() {
  return (
    <section className="landingSection githubSection reveal" id="github">
      <div className="sectionIntro">
        <h2>GitHub changes become reviewable memory.</h2>
      </div>
      <div className="githubStory">
        <div className="githubFlowLine">
          {["Push / PR", "AI-refined suggestion", "Review", "Version snapshot"].map((item) => <span key={item}>{item}</span>)}
        </div>
        <article className="githubSuggestion">
          <div className="suggestionTop">
            <span>Source: GitHub</span>
            <StatusPill tone="green">Confidence: High</StatusPill>
          </div>
          <h3>GitHub App Repository Connection Added</h3>
          <p>Suggested changes:</p>
          <ul>
            <li>Feature: GitHub App repository connection</li>
            <li>Decision: GitHub events create pending suggestions only</li>
            <li>Architecture: installation/repository mapping to project memory</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function SafetySection() {
  return (
    <section className="landingSection safetySection reveal">
      <div className="sectionIntro">
        <h2>Memory changes stay under your control.</h2>
      </div>
      <div className="safetyList">
        {safetyPoints.map((point) => <p key={point}><span aria-hidden="true"></span>{point}</p>)}
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="landingSection audienceSection reveal">
      <div className="sectionIntro">
        <h2>Built for people who build with AI.</h2>
      </div>
      <div className="audienceRows">
        {audiences.map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="finalCtaSection reveal">
      <div>
        <h2>Give every AI tool the same project memory.</h2>
        <p>Create a vault, connect GitHub, review smart suggestions, and continue from any MCP-compatible AI tool.</p>
      </div>
      <div className="finalCtaActions">
        <Link to="/signup" className="landingButton landingButtonPrimary">Get Started</Link>
        <Link to="/docs" className="landingButton landingButtonSecondary">Read Docs</Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landingFooter">
      <div className="landingFooterBrand">
        <div><LogoMark /> <span>Context Vault</span></div>
        <p>AI-readable project memory for MCP-compatible development tools.</p>
      </div>
      <div className="landingFooterColumns">
        {footerColumns.map(([title, ...items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.map((item) => <a href="#product" key={item}>{item}</a>)}
          </div>
        ))}
      </div>
      <p className="landingCopyright">2026 Context Vault</p>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="landingPage">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <ComparisonSection />
        <WorkflowSection />
        <DashboardPreview />
        <McpSection />
        <GitHubSuggestionSection />
        <SafetySection />
        <AudienceSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
