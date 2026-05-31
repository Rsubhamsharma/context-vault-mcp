import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Suggestion } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TrashIcon } from "../components/Icons";
import { ErrorBox } from "../components/State";
import { asList, formatDate } from "../utils";

const patchFields = ["features", "decisions", "constraints", "issues", "dependencies", "nextSteps", "architectureNotes", "aiInstructions"];

const fieldLabels: Record<string, string> = {
  features: "Features",
  decisions: "Decisions",
  constraints: "Constraints",
  issues: "Issues",
  dependencies: "Dependencies",
  nextSteps: "Next Steps",
  architectureNotes: "Architecture Notes",
  aiInstructions: "AI Instructions"
};

const sourceLabels: Record<string, string> = {
  github: "GitHub",
  github_app: "GitHub",
  mcp: "MCP",
  manual: "Manual",
  manual_capture: "Manual",
  ai: "Auto Capture",
  auto_capture: "Auto Capture",
  cleanup: "Cleanup"
};

const sourceFilters = [
  { value: "all", label: "All sources" },
  { value: "github", label: "GitHub" },
  { value: "mcp", label: "MCP" },
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto Capture" }
];

const modeOptions = [
  { value: "general_note", label: "General Note" },
  { value: "git_summary", label: "Git Summary" },
  { value: "release_note", label: "Release Note" },
  { value: "session_summary", label: "Session Summary" }
];

function sourceLabel(source: string) {
  return sourceLabels[source] ?? source.replace(/_/g, " ");
}

function sourceGroup(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("github")) return "github";
  if (normalized.includes("mcp")) return "mcp";
  if (normalized.includes("manual")) return "manual";
  if (normalized.includes("auto") || normalized === "ai") return "auto";
  return normalized;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function patchGroups(item: Suggestion) {
  return patchFields.map((field) => ({
    field,
    label: fieldLabels[field] ?? field,
    values: asList(item.suggestedPatch?.[field])
  }));
}

function patchSearchText(item: Suggestion) {
  return patchGroups(item).flatMap((group) => [group.label, ...group.values]).join(" ");
}

function ReviewBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "accent" }) {
  return <span className={`reviewBadge ${tone}`}>{children}</span>;
}

function SuggestionsPageHeader({
  counts,
  onCreate
}: {
  counts: { pending: number; applied: number; rejected: number };
  onCreate: () => void;
}) {
  return (
    <header className="reviewQueueHeader">
      <div>
        <h1>Suggestions</h1>
        <p>Review proposed memory updates before they become official project context.</p>
        <div className="reviewQueueCounts" aria-label="Suggestion status summary">
          <span><strong>{counts.pending}</strong> Pending</span>
          <span><strong>{counts.applied}</strong> Applied</span>
          <span><strong>{counts.rejected}</strong> Rejected</span>
        </div>
      </div>
      <div className="reviewQueueActions">
        <button className="actionButton" onClick={onCreate}>New suggestion</button>
        <Link className="ghostButton" to="../docs">View Docs</Link>
      </div>
    </header>
  );
}

function SuggestionFilters({
  status,
  source,
  search,
  onStatusChange,
  onSourceChange,
  onSearchChange
}: {
  status: string;
  source: string;
  search: string;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="reviewFilterBar">
      <div className="reviewSegmentedControl" aria-label="Filter suggestions by status">
        {["all", "pending", "applied", "rejected"].map((value) => (
          <button
            key={value}
            type="button"
            className={status === value ? "is-active" : ""}
            onClick={() => onStatusChange(value)}
          >
            {value === "all" ? "All" : titleCase(value)}
          </button>
        ))}
      </div>
      <select value={source} onChange={(event) => onSourceChange(event.target.value)} aria-label="Filter suggestions by source">
        {sourceFilters.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search title, reasoning, source, or patch..."
        aria-label="Search suggestions"
      />
    </div>
  );
}

function PatchSummary({ item }: { item: Suggestion }) {
  return (
    <div className="reviewPatchSummary" aria-label="Patch summary">
      {patchGroups(item).map((group) => (
        <span key={group.field}>{group.label} <strong>{group.values.length}</strong></span>
      ))}
    </div>
  );
}

function PatchDetails({ item }: { item: Suggestion }) {
  const groups = patchGroups(item).filter((group) => group.values.length > 0);

  if (groups.length === 0) {
    return <p className="reviewPatchEmpty">No structured patch details were provided.</p>;
  }

  return (
    <div className="reviewPatchDetails">
      {groups.map((group) => (
        <section key={group.field}>
          <h4>{group.label}</h4>
          <ul>
            {group.values.map((value, index) => <li key={`${group.field}-${index}`}>{value}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SuggestionReviewItem({
  item,
  actingId,
  onApply,
  onReject,
  onReopen,
  onDelete
}: {
  item: Suggestion;
  actingId: string;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (item: Suggestion) => void;
}) {
  const isActing = actingId === item.id;
  const isPending = item.status === "pending";
  const canDelete = item.status === "applied" || item.status === "rejected";
  const statusTone = item.status === "applied" ? "success" : item.status === "rejected" ? "danger" : "warning";

  return (
    <article className={`reviewQueueItem is-${item.status}`}>
      <div className="reviewItemMain">
        <div className="reviewItemTop">
          <div className="reviewItemTitle">
            <h3>{item.title}</h3>
            <div className="reviewItemMeta">
              <span>{formatDate(item.createdAt)}</span>
              <span>{sourceLabel(item.source)}</span>
              {item.confidence && <span>Confidence: {item.confidence}</span>}
            </div>
          </div>
          <div className="reviewItemBadges">
            <ReviewBadge tone="accent">{sourceLabel(item.source)}</ReviewBadge>
            {item.confidence && <ReviewBadge>{item.confidence}</ReviewBadge>}
            <ReviewBadge tone={statusTone}>{titleCase(item.status)}</ReviewBadge>
          </div>
        </div>

        {item.reasoningSummary && <p className="reviewReasoning">{item.reasoningSummary}</p>}

        <PatchSummary item={item} />

        <details className="reviewDetailsToggle">
          <summary><span>Show details</span><span>Hide details</span></summary>
          <PatchDetails item={item} />
        </details>
      </div>

      <div className="reviewItemActions">
        {isPending && (
          <>
            <button className="ghostButton compactReviewButton" disabled={isActing} onClick={() => onReject(item.id)} type="button">
              {isActing ? "Working..." : "Reject"}
            </button>
            <button className="actionButton compactReviewButton" disabled={isActing} onClick={() => onApply(item.id)} type="button">
              {isActing ? "Applying..." : "Apply"}
            </button>
          </>
        )}
        {item.status === "rejected" && (
          <button className="ghostButton compactReviewButton" disabled={isActing} onClick={() => onReopen(item.id)} type="button">
            {isActing ? "Reopening..." : "Reopen"}
          </button>
        )}
        {item.status === "applied" && <span className="reviewCompletedText">Applied</span>}
        {canDelete && (
          <button
            className="iconDeleteButton"
            disabled={isActing}
            onClick={() => onDelete(item)}
            type="button"
            aria-label={`Delete suggestion ${item.title}`}
            title="Delete suggestion"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </article>
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
      <section className="reviewDialog" role="dialog" aria-modal="true" aria-labelledby="manual-suggestion-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="manual-suggestion-title">Create manual suggestion</h2>
            <p>Paste messy notes, release summaries, or implementation updates. Context Vault turns them into a reviewable memory suggestion.</p>
          </div>
          <button className="dialogCloseButton" onClick={onClose} type="button" aria-label="Close manual suggestion dialog">×</button>
        </header>
        <form onSubmit={onSubmit}>
          <label>
            Notes
            <textarea
              value={rawText}
              onChange={(event) => onRawTextChange(event.target.value)}
              placeholder="Added scoped API keys, fixed duplicate apply protection, and updated MCP setup docs."
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

function SuggestionEmptyState({ hasSuggestions, onCreate }: { hasSuggestions: boolean; onCreate: () => void }) {
  return (
    <div className="reviewQueueEmpty">
      <h3>{hasSuggestions ? "No pending suggestions" : "No suggestions yet"}</h3>
      <p>
        {hasSuggestions
          ? "Your review queue is clear."
          : "Suggestions appear when GitHub events, MCP tools, manual capture, or AI agents propose memory updates."}
      </p>
      {!hasSuggestions && (
        <div>
          <button className="actionButton" onClick={onCreate}>New suggestion</button>
          <Link className="ghostButton" to="../github">Connect GitHub App</Link>
        </div>
      )}
    </div>
  );
}

function SuggestionsSkeleton() {
  return (
    <div className="reviewQueueSkeleton" aria-label="Loading suggestions">
      <span />
      <span />
      <span />
    </div>
  );
}

export function SuggestionsPage() {
  const { projectId = "" } = useParams();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState("general_note");
  const [actingId, setActingId] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    | { type: "reject"; id: string }
    | { type: "delete"; item: Suggestion }
    | null
  >(null);

  const counts = useMemo(() => ({
    pending: suggestions.filter((item) => item.status === "pending").length,
    applied: suggestions.filter((item) => item.status === "applied").length,
    rejected: suggestions.filter((item) => item.status === "rejected").length
  }), [suggestions]);

  const filteredSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suggestions.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSource = sourceFilter === "all" || sourceGroup(item.source) === sourceFilter;
      const searchable = [item.title, item.reasoningSummary, item.source, sourceLabel(item.source), item.confidence, patchSearchText(item)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && matchesSource && (!query || searchable.includes(query));
    });
  }, [suggestions, statusFilter, sourceFilter, search]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const result = await api.suggestions(projectId);
      setSuggestions(result.suggestions);
    } catch {
      setError("Could not load suggestions. Check backend status and try again.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function act(id: string, action: "apply" | "reject" | "reopen") {
    if (actingId) return;
    setError("");
    setActingId(id);
    try {
      if (action === "apply") {
        await api.applySuggestion(projectId, id);
        await api.versions(projectId).catch(() => null);
      } else if (action === "reject") {
        await api.rejectSuggestion(projectId, id);
      } else {
        await api.reopenSuggestion(projectId, id);
        setStatusFilter("pending");
      }
      await load(false);
    } catch {
      setError(action === "apply"
        ? "Could not apply suggestion. Check backend status and try again."
        : action === "reject"
          ? "Could not reject suggestion. Check backend status and try again."
          : "Could not reopen suggestion. Check backend status and try again.");
    } finally {
      setActingId("");
    }
  }

  async function deleteSuggestion(item: Suggestion) {
    setError("");
    setActingId(item.id);
    try {
      await api.deleteSuggestion(projectId, item.id);
      await load(false);
    } catch {
      setError("Could not delete suggestion. Pending suggestions must be applied or rejected before deletion.");
    } finally {
      setActingId("");
    }
  }

  function confirmPendingAction() {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    if (action.type === "reject") {
      void act(action.id, "reject");
    } else {
      void deleteSuggestion(action.item);
    }
  }

  async function capture(event: FormEvent) {
    event.preventDefault();
    if (!rawText.trim() || captureLoading) return;
    setError("");
    setCaptureSuccess("");
    setCaptureLoading(true);
    try {
      await api.captureContext(projectId, { rawText, mode });
      setRawText("");
      setCaptureSuccess("Suggestion created.");
      setStatusFilter("pending");
      await load(false);
      window.setTimeout(() => {
        setManualDialogOpen(false);
        setCaptureSuccess("");
      }, 450);
    } catch {
      setError("Could not create suggestion. Check backend status and try again.");
    } finally {
      setCaptureLoading(false);
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  return (
    <section className="reviewQueuePage">
      <SuggestionsPageHeader counts={counts} onCreate={() => setManualDialogOpen(true)} />

      {error && <ErrorBox message={error} />}

      <section className="reviewQueuePanel">
        <SuggestionFilters
          status={statusFilter}
          source={sourceFilter}
          search={search}
          onStatusChange={setStatusFilter}
          onSourceChange={setSourceFilter}
          onSearchChange={setSearch}
        />
        <div className="reviewSafetyStrip">
          <strong>Review-first memory</strong>
          <span>Suggestions are pending proposals. ProjectContext changes only after you apply one.</span>
        </div>

        {loading ? <SuggestionsSkeleton /> : filteredSuggestions.length === 0 ? (
          <SuggestionEmptyState hasSuggestions={suggestions.length > 0} onCreate={() => setManualDialogOpen(true)} />
        ) : (
          <div className="reviewQueueList">
            {filteredSuggestions.map((item) => (
              <SuggestionReviewItem
                key={item.id}
                item={item}
                actingId={actingId}
                onApply={(id) => void act(id, "apply")}
                onReject={(id) => setConfirmAction({ type: "reject", id })}
                onReopen={(id) => void act(id, "reopen")}
                onDelete={(suggestion) => setConfirmAction({ type: "delete", item: suggestion })}
              />
            ))}
          </div>
        )}
      </section>

      <ManualSuggestionDialog
        open={manualDialogOpen}
        rawText={rawText}
        mode={mode}
        submitting={captureLoading}
        success={captureSuccess}
        onClose={() => {
          if (!captureLoading) setManualDialogOpen(false);
        }}
        onRawTextChange={setRawText}
        onModeChange={setMode}
        onSubmit={(event) => void capture(event)}
      />
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "delete" ? "Delete suggestion?" : "Reject suggestion?"}
        description={
          confirmAction?.type === "delete"
            ? confirmAction.item.status === "applied"
              ? "This removes the suggestion from history. It will not change project context or versions."
              : "This rejected suggestion will be removed from the review list. This cannot be undone."
            : "You can reopen a rejected suggestion later if you rejected it by mistake."
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete suggestion" : "Reject suggestion"}
        intent={confirmAction?.type === "delete" ? "danger" : "default"}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmPendingAction}
      />
    </section>
  );
}
