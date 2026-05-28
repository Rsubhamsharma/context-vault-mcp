import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, Suggestion } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { asList, formatDate } from "../utils";

const patchFields = ["features", "decisions", "constraints", "issues", "dependencies", "nextSteps", "architectureNotes", "aiInstructions"];

export function SuggestionsPage() {
  const { projectId = "" } = useParams();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState("general_note");

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
    setError("");
    try {
      action === "apply" ? await api.applySuggestion(projectId, id) : await api.rejectSuggestion(projectId, id);
      await load();
    } catch {
      setError(action === "apply" ? "Failed to apply suggestion" : "Failed to reject suggestion");
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
      <form className="panel form" onSubmit={capture}>
        <h2>Capture Manual Context</h2>
        <label>Messy update<textarea value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="we added auth and fixed duplicate apply bug" required /></label>
        <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="general_note">General note</option>
          <option value="git_summary">Git summary</option>
          <option value="release_note">Release note</option>
          <option value="session_summary">Session summary</option>
        </select></label>
        <button>Create suggestion</button>
      </form>
      {loading ? <Loading /> : suggestions.length === 0 ? <Empty>No suggestions yet.</Empty> : (
        <div className="list">
          {suggestions.map((item) => (
            <article className="card wide" key={item.id}>
              <div className="cardHeader"><div><h3>{item.title}</h3><p>{item.source} · {item.status} · {formatDate(item.createdAt)}</p></div>{item.confidence && <span className="badge">{item.confidence}</span>}</div>
              {item.reasoningSummary && <p className="note">{item.reasoningSummary}</p>}
              <div className="patchGrid">{patchFields.map((field) => {
                const values = asList(item.suggestedPatch?.[field]);
                return values.length ? <div className="sectionBlock" key={field}><h4>{field}</h4><ul>{values.map((value) => <li key={value}>{value}</li>)}</ul></div> : null;
              })}</div>
              <div className="actions">
                <button disabled={item.status !== "pending"} onClick={() => void act(item.id, "apply")}>Apply</button>
                <button className="secondary" disabled={item.status !== "pending"} onClick={() => void act(item.id, "reject")}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
