import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, OptimizedContextResult, ProjectContext } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { asList, formatDate } from "../utils";

function Section({ title, value }: { title: string; value: unknown }) {
  const items = asList(value);
  return <div className="sectionBlock"><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">None recorded</p>}</div>;
}

export function ContextPage() {
  const { projectId = "" } = useParams();
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [optimized, setOptimized] = useState<OptimizedContextResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const copy = (value: string) => void navigator.clipboard.writeText(value);
  const sampleContext = JSON.stringify({
    goal: "Build Context Vault as portable AI-readable project memory for AI-assisted development.",
    techStack: ["Node.js", "TypeScript", "Express", "Prisma", "PostgreSQL", "React", "Vite", "MCP"],
    features: ["JWT authentication", "ProjectContext source of truth", "ContextSuggestion review queue", "ContextVersion full snapshots", "MCP API key auth", "GitHub webhook suggestions"],
    decisions: ["GitHub stores code while Context Vault stores AI-readable memory.", "Suggestions must be reviewed before official context changes."],
    constraints: ["Never auto-apply AI/GitHub/MCP suggestions.", "MCP API keys must not directly mutate official ProjectContext."],
    issues: ["Smart GitHub suggestions need continued tuning for demo scenarios."],
    dependencies: ["@prisma/client", "express", "zod", "@modelcontextprotocol/sdk", "react", "vite"],
    nextSteps: ["Create MCP API key.", "Run context_health_check.", "Trigger smart GitHub webhook from Postman.", "Apply a reviewed suggestion and inspect version history."],
    architectureNotes: ["Backend owns persistent memory and versioning.", "MCP is the AI-tool access layer.", "Dashboard is the review/control layer."],
    aiInstructions: "Load Context Vault context before implementation advice. Create pending suggestions for memory updates."
  }, null, 2);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [contextResult, optimizedResult] = await Promise.all([
        api.context(projectId),
        api.optimizedContext(projectId)
      ]);
      setContext(contextResult.context);
      setOptimized(optimizedResult);
    } catch (err) {
      setError("Failed to load context");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  return (
    <section>
      <header className="pageHeader">
        <div><h1>Official Project Context</h1><p>The current source of truth loaded by MCP clients.</p></div>
        <button onClick={() => void load()}>Refresh</button>
      </header>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : !context ? <Empty>No context initialized.</Empty> : (
        <div className="panel">
          <div className="metaRow"><span>Version {context.currentVersionNumber}</span><span>Updated {formatDate(context.updatedAt)}</span></div>
          <Section title="Goal" value={context.goal} />
          <Section title="Tech Stack" value={context.techStack} />
          <Section title="Features" value={context.features} />
          <Section title="Decisions" value={context.decisions} />
          <Section title="Constraints" value={context.constraints} />
          <Section title="Issues" value={context.issues} />
          <Section title="Dependencies" value={context.dependencies} />
          <Section title="Next Steps" value={context.nextSteps} />
          <Section title="Architecture Notes" value={context.architectureNotes} />
          <Section title="AI Instructions" value={context.aiInstructions} />
        </div>
      )}
      {!loading && !context && (
        <div className="panel">
          <div className="copyRow"><h2>Sample demo context</h2><button className="secondary" onClick={() => copy(sampleContext)}>Copy sample</button></div>
          <p className="note">Use this sample project context for demo when initializing a new project.</p>
          <pre>{sampleContext}</pre>
        </div>
      )}
      {optimized?.optimizedContext && (
        <div className="panel">
          <h2>Optimized AI Context Preview</h2>
          <p className="note">{optimized.optimizationSummary}</p>
          <div className="metaRow">
            <span>Original estimate: {optimized.originalTokenEstimate} tokens</span>
            <span>Optimized estimate: {optimized.tokenEstimate} tokens</span>
            <span>Savings: {optimized.estimatedSavingsPercent}%</span>
          </div>
          <Section title="Optimized Features" value={optimized.optimizedContext.features} />
          <Section title="Optimized Decisions" value={optimized.optimizedContext.decisions} />
          <Section title="Optimized Next Steps" value={optimized.optimizedContext.nextSteps} />
        </div>
      )}
    </section>
  );
}
