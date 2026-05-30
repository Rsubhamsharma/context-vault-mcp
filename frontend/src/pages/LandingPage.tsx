import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authStore } from "../api/client";
import "./LandingPage.css";

type LandingNavLink = {
  href: string;
  label: string;
  route?: boolean;
};

const navLinks: LandingNavLink[] = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#mcp", label: "MCP" },
  { href: "#github", label: "GitHub" },
  { href: "#safety", label: "Safety" }
];

const tools = ["Codex", "Cursor", "Claude", "Windsurf", "Claude Code", "MCP Inspector", "GitHub", "Vercel", "Linear"];
const memoryItems = ["ProjectContext", "ContextSuggestion", "ContextVersion", "context_load", "context_smart", "context_auto_capture", "GitHub App", "API keys", "Review-first"];

const workflowSteps = [
  ["Connect GitHub App", "Select repositories through GitHub's official install flow.", "installation.repositories"],
  ["Capture updates", "Pushes, PRs, manual notes, and AI-agent summaries become context signals.", "signals.queue"],
  ["Generate smart suggestion", "Context Vault turns signals into a reviewable ContextSuggestion.", "suggestion.patch"],
  ["Review and apply", "Nothing changes official memory until you approve it.", "review.gate"],
  ["Version memory", "Every meaningful update creates a ContextVersion snapshot.", "version.snapshot"],
  ["Continue anywhere", "Any MCP-compatible AI tool loads the latest handoff.", "mcp.context_load"]
];

const featureItems = [
  ["MCP-powered context loading", "Codex, Cursor, Claude, Windsurf, and any MCP-compatible client can request the same project handoff.", "nodes"],
  ["Versioned project memory", "ProjectContext changes produce immutable ContextVersion snapshots you can inspect later.", "timeline"],
  ["Smart GitHub suggestions", "Pushes and pull requests become structured pending updates instead of silent memory edits.", "github"],
  ["Manual and auto capture", "Manual notes and AI implementation summaries are shaped into reviewable context patches.", "capture"],
  ["Review-first safety", "Official memory mutates only after a human applies a ContextSuggestion.", "shield"],
  ["Scoped API keys", "MCP access is authenticated with revocable project-scoped keys.", "key"]
];

const codeLines = [
  "{",
  '  "mcpServers": {',
  '    "context-vault": {',
  '      "command": "node",',
  '      "args": ["context-vault-mcp/build/index.js"],',
  '      "env": {',
  '        "CONTEXT_VAULT_API_KEY": "cv_live_",',
  '        "CONTEXT_VAULT_PROJECT_ID": "project_id"',
  "      }",
  "    }",
  "  }",
  "}"
];

const commandChips = ["context_health_check", "context_load", "context_smart", "context_auto_capture", "github_connect_url"];

const safetyPoints = [
  "GitHub events create pending suggestions only",
  "MCP clients use scoped API keys",
  "API keys can be revoked",
  "Duplicate and no-op versions are blocked",
  "Official ProjectContext changes only after user approval",
  "AI refinement falls back safely"
];

const audiences = [
  ["Solo developers", "Keep long-running projects coherent across chats and tools."],
  ["Startup founders", "Preserve product direction, architecture choices, and next steps."],
  ["AI power users", "Move between Codex, Cursor, Claude, Windsurf, and Claude Code without rebuilding context."],
  ["Small teams", "Share one AI-readable memory layer for active project work."]
];

const footerColumns = [
  ["Product", "Dashboard", "Suggestions", "Versions", "GitHub App", "MCP Setup"],
  ["Resources", "Docs", "API Keys", "Troubleshooting", "Demo Flow"],
  ["Company", "About", "Privacy", "Terms"]
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function LogoMark() {
  return (
    <span className="cv-logoMark" aria-hidden="true">
      <span />
      <i />
    </span>
  );
}

function RevealOnScroll({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`cv-reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(authStore.getToken());
  const visibleNavLinks = signedIn ? [...navLinks, { href: "/docs", label: "Docs", route: true }] : navLinks;

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 860) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="cv-navShell">
      <div className="cv-nav">
        <Link to="/" className="cv-brand" aria-label="Context Vault home">
          <LogoMark />
          <span>Context Vault</span>
        </Link>
        <nav className="cv-desktopNav" aria-label="Landing navigation">
          {visibleNavLinks.map((item) => item.route ? <Link key={item.label} to={item.href}>{item.label}</Link> : <a key={item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="cv-navActions">
          {signedIn ? (
            <Link to="/projects" className="cv-primaryButton">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="cv-linkButton">Sign in</Link>
              <Link to="/signup" className="cv-primaryButton">Get Started</Link>
            </>
          )}
        </div>
        <button className="cv-menuButton" type="button" aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
          <span />
          <span />
        </button>
      </div>
      {open && (
        <nav className="cv-mobileNav" aria-label="Mobile navigation">
          {visibleNavLinks.map((item) => item.route ? <Link key={item.label} to={item.href} onClick={() => setOpen(false)}>{item.label}</Link> : <a key={item.label} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
          {signedIn ? (
            <Link to="/projects" className="cv-primaryButton" onClick={() => setOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
              <Link to="/signup" className="cv-primaryButton" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function AnimatedMemorySphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animation = 0;
    let frame = 0;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const nodeCount = isMobile ? 34 : 58;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6);
    const nodes = Array.from({ length: nodeCount }, (_, index) => {
      const phi = Math.acos(-1 + (2 * index) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;
      return { phi, theta, label: index % 11 === 0 };
    });

    const resize = () => {
      const size = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(size.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(size.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      frame += 0.006;
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);
      const radius = Math.min(width, height) * 0.34;

      nodes.forEach((node, index) => {
        const theta = node.theta + frame;
        const x = radius * Math.sin(node.phi) * Math.cos(theta);
        const y = radius * Math.cos(node.phi);
        const z = radius * Math.sin(node.phi) * Math.sin(theta);
        const scale = (z + radius) / (radius * 2);
        const alpha = 0.24 + scale * 0.66;
        context.fillStyle = node.label ? `rgba(139, 166, 255, ${alpha})` : `rgba(159, 226, 255, ${alpha * 0.75})`;
        context.beginPath();
        context.arc(x, y, node.label ? 1.9 : 1.1, 0, Math.PI * 2);
        context.fill();

        if (!isMobile && index % 9 === 0) {
          context.strokeStyle = `rgba(139, 166, 255, ${alpha * 0.14})`;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x * 0.76, y * 0.76);
          context.stroke();
        }
      });
      context.restore();
      animation = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="cv-memorySphere" aria-hidden="true" />;
}

function AnimatedContextWave() {
  return (
    <div className="cv-contextWave" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function AnimatedSuggestionFlow({ active = 0 }: { active?: number }) {
  const nodes = ["GitHub", "Suggestion", "Review", "Version", "MCP"];

  return (
    <div className="cv-suggestionFlow" aria-hidden="true">
      <svg viewBox="0 0 720 160" role="img">
        <defs>
          <linearGradient id="flowLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#7bdcff" stopOpacity=".28" />
            <stop offset="52%" stopColor="#9aaeff" stopOpacity=".92" />
            <stop offset="100%" stopColor="#7fe1ad" stopOpacity=".42" />
          </linearGradient>
        </defs>
        <path className="cv-flowPath" d="M70 84 C170 18 230 144 330 82 S500 30 650 82" />
        <path className="cv-flowDash" d="M70 84 C170 18 230 144 330 82 S500 30 650 82" />
        {nodes.map((node, index) => (
          <g key={node} className={index <= active ? "is-active" : ""}>
            <circle cx={70 + index * 145} cy={index % 2 ? 62 : 96} r="18" />
            <text x={70 + index * 145} y={(index % 2 ? 62 : 96) + 44}>{node}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function WorkflowProgressVisual({ active }: { active: number }) {
  const activeStep = workflowSteps[active];

  return (
    <div className="cv-workflowMap" aria-hidden="true">
      <div className="cv-workflowMapHeader">
        <span>Context pipeline</span>
        <strong>{activeStep[2]}</strong>
      </div>
      <div className="cv-workflowTrack">
        {workflowSteps.map(([title], index) => (
          <div className={index <= active ? "is-active" : ""} key={title}>
            <i />
            <span>{title}</span>
          </div>
        ))}
        <b style={{ transform: `translateY(${active * 46}px)` }} />
      </div>
      <div className="cv-workflowState">
        <code>{`context_smart --step ${active + 1}`}</code>
        <p>{activeStep[1]}</p>
      </div>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="cv-productStage" aria-label="Context Vault product preview">
      <AnimatedMemorySphere />
      <div className="cv-commandChip cv-commandOne">context_load</div>
      <div className="cv-commandChip cv-commandTwo">context_auto_capture</div>
      <section className="cv-glassPanel cv-contextPanel">
        <div className="cv-panelChrome">
          <span>ProjectContext</span>
          <strong>official memory</strong>
        </div>
        <h3>Context Vault MCP</h3>
        <div className="cv-memoryRows">
          <p><span>Goal</span> Persistent cross-AI project memory layer</p>
          <p><span>Decision</span> Review-first suggestions before mutation</p>
          <p><span>Constraint</span> Scoped API keys for MCP clients</p>
          <p><span>Next</span> Continue handoff in any compatible tool</p>
        </div>
      </section>
      <section className="cv-glassPanel cv-suggestionPanel">
        <div className="cv-panelChrome">
          <span>ContextSuggestion</span>
          <strong>pending</strong>
        </div>
        <h3>GitHub App repository connection added</h3>
        <p>Patch preview waits for review.</p>
        <div className="cv-patchLines"><span /><span /><span /></div>
      </section>
      <section className="cv-glassPanel cv-versionPanel">
        <span>ContextVersion</span>
        <p><i /> v18, suggestion applied</p>
        <p><i /> v17, MCP setup captured</p>
      </section>
      <div className="cv-connectedBadge cv-badgeMcp">MCP connected</div>
      <div className="cv-connectedBadge cv-badgeGithub">GitHub App connected</div>
    </div>
  );
}

function HeroSection() {
  const phrases = ["Codex.", "Cursor.", "Claude.", "Windsurf.", "Claude Code."];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setPhraseIndex((index) => (index + 1) % phrases.length), 2200);
    return () => window.clearInterval(interval);
  }, [phrases.length, reduced]);

  return (
    <section className="cv-hero" id="product">
      <AnimatedContextWave />
      <RevealOnScroll className="cv-heroCopy">
        <p className="cv-heroKicker">MCP-first project memory</p>
        <h1>
          <span>Portable project memory</span>
          <span>for every AI coding tool.</span>
        </h1>
        <p className="cv-continueLine">Continue in <span key={phrases[phraseIndex]}>{phrases[phraseIndex]}</span></p>
        <p className="cv-heroBody">Context Vault stores the decisions, constraints, architecture, issues, next steps, and version history your AI tools need to continue from the same source of truth.</p>
        <p className="cv-trustLine">GitHub stores your code. Context Vault stores your project understanding.</p>
        <div className="cv-heroActions">
          <Link to="/signup" className="cv-primaryButton">Create your vault</Link>
          <Link to="/mcp" className="cv-secondaryButton">View MCP setup</Link>
        </div>
      </RevealOnScroll>
      <RevealOnScroll className="cv-heroVisual" delay={120}>
        <ProductMockup />
      </RevealOnScroll>
    </section>
  );
}

function ToolMarquee() {
  return (
    <section className="cv-marqueeSection" aria-label="Context Vault integrations">
      <RevealOnScroll>
        <p>Works with the AI tools you already use.</p>
        <div className="cv-marquee" data-direction="forward">
          <div>{[...tools, ...tools].map((tool, index) => <span key={`${tool}-${index}`}>{tool}</span>)}</div>
        </div>
        <div className="cv-marquee" data-direction="reverse">
          <div>{[...memoryItems, ...memoryItems].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

function ProblemSection() {
  const rows = [
    ["New chats start blind", "Goals, architecture, constraints, and prior decisions have to be rebuilt before work can continue."],
    ["GitHub shows changes, not intent", "Commits describe file movement, but not the project understanding an AI tool needs later."],
    ["Manual handoffs rot quickly", "Docs and chat summaries drift as agents, repositories, and product decisions keep moving."]
  ];

  return (
    <section className="cv-section cv-problemSection">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>AI tools lose context. Your project pays the price.</h2>
        <p>Every new chat, agent, or AI tool starts with incomplete memory. Context Vault gives project understanding a durable place to live.</p>
      </RevealOnScroll>
      <div className="cv-editorialSplit">
        <RevealOnScroll className="cv-problemCopy" delay={80}>
          <p>Instead of repeating goals, architecture, decisions, and constraints, the next tool loads the latest ProjectContext through MCP and starts from the same source of truth.</p>
        </RevealOnScroll>
        <div className="cv-painRows">
          {rows.map(([title, text], index) => (
            <RevealOnScroll className="cv-painRow" delay={index * 70} key={title}>
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="cv-section cv-comparisonSection">
      <RevealOnScroll className="cv-sectionHeader cv-wideHeader">
        <h2>GitHub is your code history. Context Vault is your AI memory.</h2>
      </RevealOnScroll>
      <RevealOnScroll className="cv-comparisonPanel">
        <div className="cv-compareColumn">
          <h3>GitHub stores</h3>
          {["Files", "Commits", "Pull requests", "Code history"].map((item) => <p key={item}>{item}</p>)}
        </div>
        <div className="cv-compareBridge">
          <span>Code change</span>
          <i />
          <span>Context suggestion</span>
        </div>
        <div className="cv-compareColumn cv-memoryColumn">
          <h3>Context Vault stores</h3>
          {["Project goal", "Architecture decisions", "Constraints", "Known issues", "Next steps", "AI handoff context", "Versioned project memory"].map((item) => <p key={item}>{item}</p>)}
        </div>
      </RevealOnScroll>
    </section>
  );
}

function HowItWorksSection() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setActive((index) => (index + 1) % workflowSteps.length), 2000);
    return () => window.clearInterval(interval);
  }, [reduced]);

  return (
    <section className="cv-section cv-workflowSection" id="workflow">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>From code change to AI-ready memory.</h2>
      </RevealOnScroll>
      <div className="cv-workflowGrid">
        <RevealOnScroll className="cv-workflowSteps">
          {workflowSteps.map(([title, text], index) => (
            <button className={active === index ? "is-active" : ""} type="button" key={title} onClick={() => setActive(index)}>
              <span>{index + 1}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </button>
          ))}
        </RevealOnScroll>
        <RevealOnScroll className="cv-workflowVisual" delay={120}>
          <div className="cv-workflowProgress"><span style={{ transform: `scaleX(${(active + 1) / workflowSteps.length})` }} /></div>
          <WorkflowProgressVisual active={active} />
        </RevealOnScroll>
      </div>
    </section>
  );
}

function AnimatedFeatureVisual({ type }: { type: string }) {
  if (type === "timeline") return <VersionTimelineMini />;
  if (type === "capture") return <CaptureTransformVisual />;
  if (type === "shield") return <SafetyShieldVisual compact />;
  if (type === "key") {
    return (
      <div className="cv-featureVisual cv-keyVisual" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
    );
  }
  if (type === "github") {
    return (
      <div className="cv-featureVisual cv-githubMiniVisual" aria-hidden="true">
        <span>push</span>
        <i />
        <span>suggestion</span>
      </div>
    );
  }
  return (
    <div className="cv-featureVisual cv-mcpNodesVisual" aria-hidden="true">
      <span />
      <span />
      <span />
      <i />
    </div>
  );
}

function VersionTimelineMini() {
  return (
    <div className="cv-featureVisual cv-versionTimelineMini" aria-hidden="true">
      <span>v18</span>
      <span>v17</span>
      <span>v16</span>
      <i />
    </div>
  );
}

function CaptureTransformVisual() {
  return (
    <div className="cv-featureVisual cv-captureTransformVisual" aria-hidden="true">
      <div>
        <span />
        <span />
        <span />
      </div>
      <i />
      <b>ContextSuggestion</b>
    </div>
  );
}

function SafetyShieldVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "cv-featureVisual cv-shieldMiniVisual" : "cv-shieldVisual"} aria-hidden="true">
      <span />
      <i />
      {!compact && <b>review gate</b>}
    </div>
  );
}

function FeatureGrid() {
  return (
    <section className="cv-section cv-featureSection">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>Built for AI-assisted development workflows.</h2>
      </RevealOnScroll>
      <div className="cv-featureGrid">
        {featureItems.map(([title, text, visual], index) => (
          <RevealOnScroll className="cv-featureItem" delay={index * 55} key={title}>
            <AnimatedFeatureVisual type={visual} />
            <h3>{title}</h3>
            <p>{text}</p>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

function CodeReveal() {
  return (
    <div className="cv-codePanel" aria-label="MCP configuration code sample">
      <div className="cv-codeTop"><span /><span /><span /><strong>mcp.config.json</strong></div>
      <pre>
        <code>
          {codeLines.map((line, index) => (
            <span key={`${line}-${index}`} style={{ "--line-index": index } as React.CSSProperties}>{line}</span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function McpSection() {
  return (
    <section className="cv-section cv-mcpSection" id="mcp">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>Designed for MCP-first AI workflows.</h2>
        <p>Context Vault exposes project memory through MCP, so AI tools can load context, search memory, create suggestions, and auto-capture implementation summaries.</p>
        <div className="cv-commandChips">
          {commandChips.map((chip, index) => <code style={{ "--chip-index": index } as React.CSSProperties} key={chip}>{chip}</code>)}
        </div>
      </RevealOnScroll>
      <RevealOnScroll className="cv-stickyCode" delay={90}>
        <CodeReveal />
      </RevealOnScroll>
    </section>
  );
}

function GitHubFlowSection() {
  return (
    <section className="cv-section cv-githubSection" id="github">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>GitHub changes become reviewable memory.</h2>
        <p>Connect the GitHub App, select repositories, and Context Vault turns push and pull request activity into structured suggestions.</p>
      </RevealOnScroll>
      <div className="cv-githubGrid">
        <RevealOnScroll className="cv-githubFlow">
          <AnimatedSuggestionFlow active={4} />
          <div className="cv-flowLabels">
            {["GitHub push / PR", "AI-refined suggestion", "User review", "ContextVersion snapshot"].map((item) => <span key={item}>{item}</span>)}
          </div>
        </RevealOnScroll>
        <RevealOnScroll className="cv-suggestionPreview" delay={120}>
          <div className="cv-suggestionMeta">
            <span>Source: GitHub</span>
            <strong>Confidence: High</strong>
          </div>
          <h3>GitHub App Repository Connection Added</h3>
          <p>Patch preview</p>
          <ul>
            <li>Feature: GitHub App repository connection</li>
            <li>Decision: GitHub events create pending suggestions only</li>
            <li>Architecture: installations and repositories map to project memory</li>
          </ul>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function SafetySection() {
  return (
    <section className="cv-section cv-safetySection" id="safety">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>Memory changes stay under your control.</h2>
      </RevealOnScroll>
      <div className="cv-safetyGrid">
        <RevealOnScroll>
          <SafetyShieldVisual />
        </RevealOnScroll>
        <div className="cv-safetyList">
          {safetyPoints.map((point, index) => (
            <RevealOnScroll delay={index * 55} key={point}>
              <p><span aria-hidden="true" />{point}</p>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="cv-section cv-dashboardSection">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>A dashboard for memory operations.</h2>
        <p>Review suggestions, inspect memory snapshots, confirm GitHub state, and keep MCP access scoped to the project.</p>
      </RevealOnScroll>
      <RevealOnScroll className="cv-dashboardMock">
        <aside>
          <div><LogoMark /> Context Vault</div>
          {["Dashboard", "Project Context", "Suggestions", "Versions", "GitHub App", "API Keys", "MCP Setup", "Docs"].map((item) => <span className={item === "Suggestions" ? "is-active" : ""} key={item}>{item}</span>)}
        </aside>
        <main>
          <div className="cv-dashboardTop">
            <div>
              <span>Project context status</span>
              <h3>Official ProjectContext is healthy</h3>
              <p>Latest cumulative memory loaded through MCP four minutes ago.</p>
            </div>
            <strong>GitHub App connected</strong>
          </div>
          <div className="cv-dashboardCards">
            <article>
              <span>Suggestions review queue</span>
              <h4>PR #42, scoped API key revocation</h4>
              <p>Decision, constraint, and architecture notes detected.</p>
            </article>
            <article>
              <span>Version timeline</span>
              <p><i /> v18, suggestion applied</p>
              <p><i /> v17, GitHub mapping captured</p>
              <p><i /> v16, duplicate version blocked</p>
            </article>
            <article>
              <span>MCP API key status</span>
              <h4>cv_live_ scoped to this project</h4>
              <p>Revocable access for MCP clients.</p>
            </article>
          </div>
        </main>
      </RevealOnScroll>
    </section>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) {
      if (element) element.textContent = `${value}${suffix}`;
      return;
    }

    let frame = 0;
    const total = 42;
    const animation = window.setInterval(() => {
      frame += 1;
      const next = Math.round((value * frame) / total);
      element.textContent = `${next}${suffix}`;
      if (frame >= total) window.clearInterval(animation);
    }, 24);

    return () => window.clearInterval(animation);
  }, [reduced, suffix, value]);

  return <span ref={ref}>{value}{suffix}</span>;
}

function MetricsSection() {
  const metrics = [
    [1, "", "source of truth"],
    [0, "", "auto-applied memory changes"],
    [5, "+", "AI tool workflows"],
    [1, "", "versioned context history"]
  ] as const;

  return (
    <section className="cv-section cv-metricsSection">
      {metrics.map(([value, suffix, label], index) => (
        <RevealOnScroll className="cv-metric" delay={index * 60} key={label}>
          <strong><AnimatedCounter value={value} suffix={suffix} /></strong>
          <span>{label}</span>
        </RevealOnScroll>
      ))}
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="cv-section cv-audienceSection">
      <RevealOnScroll className="cv-sectionHeader">
        <h2>Built for people who build with AI.</h2>
      </RevealOnScroll>
      <div className="cv-audienceRows">
        {audiences.map(([title, text], index) => (
          <RevealOnScroll delay={index * 55} key={title}>
            <article>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let raf = 0;
    const move = (event: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
        element.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
        raf = 0;
      });
    };
    element.addEventListener("pointermove", move);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      element.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <section className="cv-finalCta" ref={ref}>
      <AnimatedContextWave />
      <RevealOnScroll>
        <h2>Give every AI tool the same project memory.</h2>
        <p>Create a vault, connect GitHub, review smart suggestions, and continue from any MCP-compatible AI tool.</p>
        <div className="cv-finalActions">
          <Link to="/signup" className="cv-primaryButton">Get Started</Link>
          <Link to="/docs" className="cv-secondaryButton">Read Docs</Link>
        </div>
      </RevealOnScroll>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="cv-footer">
      <div className="cv-footerBrand">
        <div><LogoMark /> <span>Context Vault</span></div>
        <p>AI-readable project memory for MCP-compatible development tools.</p>
      </div>
      <div className="cv-footerColumns">
        {footerColumns.map(([title, ...items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.map((item) => <a href="#product" key={item}>{item}</a>)}
          </div>
        ))}
      </div>
      <p className="cv-copyright">2026 Context Vault</p>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".cv-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const sections = useMemo(() => [
    <HeroSection key="hero" />,
    <ToolMarquee key="marquee" />,
    <ProblemSection key="problem" />,
    <ComparisonSection key="comparison" />,
    <HowItWorksSection key="workflow" />,
    <FeatureGrid key="features" />,
    <McpSection key="mcp" />,
    <GitHubFlowSection key="github" />,
    <SafetySection key="safety" />,
    <DashboardPreview key="dashboard" />,
    <MetricsSection key="metrics" />,
    <AudienceSection key="audience" />,
    <FinalCTA key="cta" />
  ], []);

  return (
    <div className="cv-landingPage">
      <LandingNavbar />
      <main>{sections}</main>
      <LandingFooter />
    </div>
  );
}
