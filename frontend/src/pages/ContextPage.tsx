import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, OptimizedContextResult, ProjectContext } from "../api/client";
import { ErrorBox } from "../components/State";
import { asList, formatDate } from "../utils";

const modeOptions = [
  { value: "general_note", label: "General Note" },
  { value: "git_summary", label: "Git Summary" },
  { value: "release_note", label: "Release Note" },
  { value: "session_summary", label: "Session Summary" }
];

type ContextSectionDefinition = {
  id: string;
  title: string;
  value: unknown;
  description?: string;
};

type OverviewBlock = {
  title: string;
  value: string;
};

function sectionCount(value: unknown) {
  return asList(value).length;
}

function populatedCount(sections: ContextSectionDefinition[]) {
  return sections.filter((section) => sectionCount(section.value) > 0).length;
}

function formattedContext(context: ProjectContext, optimized?: OptimizedContextResult | null) {
  return JSON.stringify(optimized?.optimizedContext ?? context, null, 2);
}

function firstText(value: unknown) {
  return asList(value)[0] ?? "Nothing recorded yet.";
}

function totalItemCount(sections: ContextSectionDefinition[]) {
  return sections.reduce((total, section) => total + sectionCount(section.value), 0);
}

function ContextHeader({
  context,
  sectionsPopulated,
  totalSections,
  copied,
  onCopy,
  onCreate
}: {
  context: ProjectContext | null;
  sectionsPopulated: number;
  totalSections: number;
  copied: boolean;
  onCopy: () => void;
  onCreate: () => void;
}) {
  const isReady = Boolean(context && sectionsPopulated > 0);

  return (
    <header className="contextKbHeader">
      <div>
        <h1>Project Context</h1>
        <p>Official AI-readable memory used by connected AI tools.</p>
        <div className="contextKbMeta" aria-label="Project context metadata">
          <span>{context ? `v${context.currentVersionNumber}` : "No version"}</span>
          <span>Updated {context ? formatDate(context.updatedAt) : "Never"}</span>
          <span>{sectionsPopulated}/{totalSections} sections</span>
          <span>{isReady ? "MCP ready" : "MCP pending"}</span>
        </div>
      </div>
      <div className="contextKbActions">
        <button className="actionButton" onClick={onCopy} disabled={!context}>{copied ? "Copied" : "Copy Context"}</button>
        <button className="ghostButton" onClick={onCreate}>New Suggestion</button>
        <Link className="ghostButton" to="../mcp">MCP Setup</Link>
      </div>
    </header>
  );
}

function ContextIntro() {
  return (
    <p className="contextIntro">
      <span>Official memory</span>
      This memory is loaded by MCP tools before work starts.
    </p>
  );
}

function ContextOverview({
  blocks
}: {
  blocks: OverviewBlock[];
}) {
  return (
    <section className="contextOverviewDocument" aria-label="Context overview">
      {blocks.map((block) => (
        <article key={block.title}>
          <h3>{block.title}</h3>
          <p>{block.value}</p>
        </article>
      ))}
    </section>
  );
}

function MemoryDetailsDisclosure({
  context,
  sectionsPopulated,
  totalSections,
  itemCount
}: {
  context: ProjectContext;
  sectionsPopulated: number;
  totalSections: number;
  itemCount: number;
}) {
  return (
    <details className="memoryDetailsDisclosure">
      <summary>Memory details</summary>
      <dl>
        <div><dt>Current version</dt><dd>v{context.currentVersionNumber}</dd></div>
        <div><dt>Last updated</dt><dd>{formatDate(context.updatedAt)}</dd></div>
        <div><dt>Context items</dt><dd>{itemCount}</dd></div>
        <div><dt>Sections populated</dt><dd>{sectionsPopulated}/{totalSections}</dd></div>
        <div><dt>MCP handoff</dt><dd>{sectionsPopulated > 0 ? "Ready" : "Pending"}</dd></div>
      </dl>
    </details>
  );
}

function ContextSectionNav({
  sections,
  activeSectionId,
  onSelect,
  details
}: {
  sections: ContextSectionDefinition[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
  details: ReactNode;
}) {
  return (
    <aside className="contextSectionNav">
      <label className="contextSectionSelect">
        Section
        <select value={activeSectionId} onChange={(event) => onSelect(event.target.value)}>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>{section.title} ({sectionCount(section.value)})</option>
          ))}
        </select>
      </label>
      <nav aria-label="Project context sections">
        {sections.map((section) => {
          const active = section.id === activeSectionId;
          return (
            <button
              aria-current={active ? "page" : undefined}
              className={active ? "isActive" : ""}
              key={section.id}
              onClick={() => onSelect(section.id)}
              type="button"
            >
              <span>{section.title}</span>
              <em>{sectionCount(section.value)}</em>
            </button>
          );
        })}
      </nav>
      {details}
    </aside>
  );
}

function ShowMoreList({ items, limit = 8 }: { items: string[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, limit);

  return (
    <>
      <ul className="contextKbList">
        {visibleItems.map((item, index) => <ContextListItem item={item} key={`${item}-${index}`} />)}
      </ul>
      {items.length > limit && (
        <button className="contextTextButton" type="button" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Show less" : `Show ${items.length - limit} more`}
        </button>
      )}
    </>
  );
}

function ContextListItem({ item }: { item: string }) {
  return <li><span aria-hidden="true" /><p>{item}</p></li>;
}

function ContextSectionContent({
  section,
  overviewBlocks
}: {
  section: ContextSectionDefinition;
  overviewBlocks: OverviewBlock[];
}) {
  const items = asList(section.value);
  const isOverview = section.id === "overview";

  return (
    <article className="contextSectionContent" id={section.id}>
      <header>
        <div>
          <h2>{section.title}</h2>
          {section.description && <p>{section.description}</p>}
        </div>
        <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
      </header>
      {isOverview ? <ContextOverview blocks={overviewBlocks} /> : items.length > 0 ? <ShowMoreList items={items} /> : <p className="contextKbEmptyLine">Nothing recorded yet.</p>}
    </article>
  );
}

function CollapsibleMcpPreview({ optimized }: { optimized: OptimizedContextResult | null }) {
  if (!optimized?.optimizedContext) return null;
  const previewText = JSON.stringify(optimized.optimizedContext, null, 2);
  return (
    <details className="contextMcpPreview">
      <summary>
        <span>
          <strong>MCP handoff preview</strong>
          <em>{optimized.optimizationSummary}</em>
        </span>
      </summary>
      <dl>
        <div><dt>Token estimate</dt><dd>{optimized.originalTokenEstimate} tokens</dd></div>
        <div><dt>Optimized estimate</dt><dd>{optimized.tokenEstimate} tokens</dd></div>
        <div><dt>Savings</dt><dd>{optimized.estimatedSavingsPercent}%</dd></div>
      </dl>
      <pre>{previewText}</pre>
    </details>
  );
}

function ContextEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="contextKbEmptyState">
      <h2>No project context yet</h2>
      <p>Initialize this vault with goals, decisions, constraints, and next steps so AI tools can continue from the same memory.</p>
      <div>
        <button className="actionButton" onClick={onCreate}>Initialize Context</button>
        <button className="ghostButton" onClick={onCreate}>New Suggestion</button>
        <Link className="ghostButton" to="../docs">View Docs</Link>
      </div>
    </section>
  );
}

function ContextSkeleton() {
  return (
    <div className="contextKbSkeleton" aria-label="Loading project context">
      <div className="contextSkeletonNav">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="contextSkeletonRows">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ManualSuggestionDialog({
  open,
  rawText,
  mode,
  submitting,
  success,
  onClose,
  onRawTextChange,
  onModeChange,
  onSubmit
}: {
  open: boolean;
  rawText: string;
  mode: string;
  submitting: boolean;
  success: string;
  onClose: () => void;
  onRawTextChange: (value: string) => void;
  onModeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="reviewDialogOverlay" role="presentation" onMouseDown={onClose}>
      <section className="reviewDialog" role="dialog" aria-modal="true" aria-labelledby="context-manual-suggestion-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="context-manual-suggestion-title">Create manual suggestion</h2>
            <p>Paste project notes, architecture updates, or implementation summaries. Context Vault turns them into a reviewable memory suggestion.</p>
          </div>
          <button className="dialogCloseButton" onClick={onClose} type="button" aria-label="Close manual suggestion dialog">×</button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            Notes
            <textarea
              value={rawText}
              onChange={(event) => onRawTextChange(event.target.value)}
              placeholder="Updated the auth flow, added GitHub connection handling, and decided that suggestions remain review-first."
              required
            />
          </label>
          <label>
            Mode
            <select value={mode} onChange={(event) => onModeChange(event.target.value)}>
              {modeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {success && <div className="reviewDialogSuccess">{success}</div>}
          <footer>
            <button className="ghostButton" onClick={onClose} type="button">Cancel</button>
            <button className="actionButton" disabled={submitting || !rawText.trim()} type="submit">
              {submitting ? "Creating..." : "Create suggestion"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export function ContextPage() {
  const { projectId = "" } = useParams();
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [optimized, setOptimized] = useState<OptimizedContextResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState("general_note");
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("overview");

  const sections = useMemo<ContextSectionDefinition[]>(() => {
    if (!context) return [];
    const decisions = asList(context.decisions);
    const productPromise = [
      context.goal,
      ...decisions.filter((item) => /stores|memory|source|truth|review|context|ai/i.test(item)).slice(0, 3)
    ].filter(Boolean);

    return [
      { id: "overview", title: "Overview", value: [context.goal, ...productPromise, ...asList(context.architectureNotes).slice(0, 3)], description: "The memory baseline AI tools should understand first." },
      { id: "features", title: "Features", value: context.features, description: "Delivered product capabilities that should not be rediscovered." },
      { id: "decisions", title: "Decisions", value: context.decisions, description: "Approved product and engineering choices that guide future work." },
      { id: "constraints", title: "Constraints", value: context.constraints, description: "Rules, boundaries, and invariants that connected AI tools must preserve." },
      { id: "issues", title: "Issues", value: context.issues, description: "Known risks, bugs, and unresolved problems." },
      { id: "dependencies", title: "Dependencies", value: context.dependencies, description: "Frameworks, services, packages, and external systems in use." },
      { id: "next-steps", title: "Next Steps", value: context.nextSteps, description: "Open work that should remain visible between AI sessions." },
      { id: "architecture", title: "Architecture", value: context.architectureNotes, description: "How the system is structured and where key responsibilities live." },
      { id: "ai-instructions", title: "AI Instructions", value: context.aiInstructions, description: "Operating instructions connected AI tools should follow." }
    ];
  }, [context]);

  const sectionsPopulated = populatedCount(sections);
  const selectedSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const itemCount = totalItemCount(sections);
  const overviewBlocks = useMemo<OverviewBlock[]>(() => {
    if (!context) {
      return [];
    }
    const decisions = asList(context.decisions);
    const promise = decisions.find((item) => /stores|memory|source|truth|review|context|ai/i.test(item));
    return [
      { title: "Project Goal", value: firstText(context.goal) },
      { title: "Product Promise", value: promise ?? firstText(context.goal) },
      { title: "Current Architecture Summary", value: firstText(context.architectureNotes) },
      { title: "AI Instruction Summary", value: firstText(context.aiInstructions) }
    ];
  }, [context]);

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
    } catch {
      setError("Could not load project context. Check backend status and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyContext() {
    if (!context) return;
    await navigator.clipboard.writeText(formattedContext(context, optimized));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function capture(event: FormEvent) {
    event.preventDefault();
    if (!rawText.trim() || captureLoading) return;
    setCaptureLoading(true);
    setCaptureSuccess("");
    setError("");
    try {
      await api.captureContext(projectId, { rawText, mode });
      setRawText("");
      setCaptureSuccess("Suggestion created. Review it in Suggestions.");
      window.setTimeout(() => {
        setDialogOpen(false);
        setCaptureSuccess("");
      }, 700);
    } catch {
      setError("Could not create suggestion. Check backend status and try again.");
    } finally {
      setCaptureLoading(false);
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  return (
    <section className="contextKbPage">
      <ContextHeader
        context={context}
        sectionsPopulated={sectionsPopulated}
        totalSections={sections.length || 9}
        copied={copied}
        onCopy={() => void copyContext()}
        onCreate={() => setDialogOpen(true)}
      />

      {error && <ErrorBox message={error} />}

      {loading ? <ContextSkeleton /> : !context || sectionsPopulated === 0 ? (
        <ContextEmptyState onCreate={() => setDialogOpen(true)} />
      ) : (
        <main className="contextKbMain">
          <ContextIntro />
          <div className="contextBrowserLayout">
            <ContextSectionNav
              sections={sections}
              activeSectionId={selectedSection.id}
              onSelect={setActiveSectionId}
              details={context ? (
                <MemoryDetailsDisclosure context={context} sectionsPopulated={sectionsPopulated} totalSections={sections.length} itemCount={itemCount} />
              ) : null}
            />
            <div className="contextBrowserMain">
              <ContextSectionContent section={selectedSection} overviewBlocks={overviewBlocks} />
              <CollapsibleMcpPreview optimized={optimized} />
            </div>
          </div>
        </main>
      )}

      <ManualSuggestionDialog
        open={dialogOpen}
        rawText={rawText}
        mode={mode}
        submitting={captureLoading}
        success={captureSuccess}
        onClose={() => {
          if (!captureLoading) setDialogOpen(false);
        }}
        onRawTextChange={setRawText}
        onModeChange={setMode}
        onSubmit={(event) => void capture(event)}
      />
    </section>
  );
}
