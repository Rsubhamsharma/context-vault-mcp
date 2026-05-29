import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, Suggestion } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
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
  mcp: "MCP",
  manual: "Manual",
  ai: "Auto Capture",
  cleanup: "Cleanup"
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  applied: "Applied",
  rejected: "Rejected"
};

export function SuggestionsPage() {
  const { projectId = "" } = useParams();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState("general_note");
  const [actingId, setActingId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await api.suggestions(projectId);
      setSuggestions(result.suggestions);
    } catch (err) {
      setError("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "apply" | "reject") {
    if (!window.confirm(`${action === "apply" ? "Apply" : "Reject"} this suggestion?`)) return;
    setError("");
    setActingId(id);
    try {
      action === "apply" ? await api.applySuggestion(projectId, id) : await api.rejectSuggestion(projectId, id);
      await load();
    } catch {
      setError(action === "apply" ? "Failed to apply suggestion" : "Failed to reject suggestion");
    } finally {
      setActingId("");
    }
  }

  async function capture(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.captureContext(projectId, { rawText, mode });
      setRawText("");
      await load();
    } catch {
      setError("Failed to capture manual context");
    }
  }

  useEffect(() => { void load(); }, [projectId]);

  return (
    <section>
      <header className="pageHeader"><div><h1>Review Queue</h1><p>AI/GitHub suggestions do not change official context until you apply them.</p></div></header>
      {error && <ErrorBox message={error} />}
      <details className="panel capturePanel" open>
        <summary><h2>Capture Manual Context</h2><span>Paste messy updates. Context Vault turns them into reviewable memory suggestions.</span></summary>
        <form className="form" onSubmit={capture}>
          <label>Messy update<textarea value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="we added auth and fixed duplicate apply bug" required /></label>
          <div className="formRow">
            <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="general_note">General note</option>
              <option value="git_summary">Git summary</option>
              <option value="release_note">Release note</option>
              <option value="session_summary">Session summary</option>
            </select></label>
            <button>Create suggestion</button>
          </div>
        </form>
      </details>
      {loading ? <Loading /> : suggestions.length === 0 ? (
        <Empty>No suggestions yet. Connect GitHub, paste manual notes, or let an MCP client call context_auto_capture.</Empty>
      ) : (
        <div className="reviewQueueList">
          {suggestions.map((item) => (
            <article className={`suggestionCard suggestion-${item.status}`} key={item.id}>
              <div className="cardHeader">
                <div>
                  <h3>{item.title}</h3>
                  <p>Created {formatDate(item.createdAt)}</p>
                </div>
                <div className="badgeStack">
                  <span className="badge">{sourceLabels[item.source] ?? item.source}</span>
                  <span className={`badge status-${item.status}`}>{statusLabels[item.status] ?? item.status}</span>
                  {item.confidence && <span className="badge">Confidence: {item.confidence}</span>}
                </div>
              </div>
              {item.reasoningSummary && <div className="note"><strong>Reasoning summary</strong><p>{item.reasoningSummary}</p></div>}
              <div className="patchGrid">{patchFields.map((field) => {
                const values = asList(item.suggestedPatch?.[field]);
                return values.length ? (
                  <details className="patchGroup" key={field} open={field === "features" || field === "decisions"}>
                    <summary>{fieldLabels[field] ?? field}<span>{values.length}</span></summary>
                    <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>
                  </details>
                ) : null;
              })}</div>
              <div className="actions">
                <button disabled={item.status !== "pending" || actingId === item.id} onClick={() => void act(item.id, "apply")}>{actingId === item.id ? "Working..." : "Apply"}</button>
                <button className="secondary" disabled={item.status !== "pending" || actingId === item.id} onClick={() => void act(item.id, "reject")}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
