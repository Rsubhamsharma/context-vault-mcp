import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, Version } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

const sectionLabels: Record<string, string> = {
  goal: "Goal",
  techStack: "Tech Stack",
  features: "Features",
  decisions: "Decisions",
  constraints: "Constraints",
  issues: "Issues",
  dependencies: "Dependencies",
  nextSteps: "Next Steps",
  architectureNotes: "Architecture Notes",
  aiInstructions: "AI Instructions"
};

const previewLabels: Record<string, string> = {
  addedTechStack: "Tech stack",
  addedFeatures: "Feature",
  addedDecisions: "Decision",
  addedConstraints: "Constraint",
  addedIssues: "Issue",
  addedDependencies: "Dependency",
  addedNextSteps: "Next step",
  addedArchitectureNotes: "Architecture note"
};

const changedSections = (version: Version): string[] => {
  return Object.entries(version.changedSections ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${sectionLabels[key] ?? key}: ${value === true ? "changed" : `+${value}`}`);
};

const previewItems = (version: Version): string[] => {
  return Object.entries(version.changePreview ?? {}).flatMap(([key, values]) =>
    Array.isArray(values) ? values.slice(0, 2).map((value) => `${previewLabels[key] ?? key}: ${value}`) : []
  );
};

export function VersionsPage() {
  const { projectId = "" } = useParams();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const result = await api.versions(projectId);
        setVersions(result.versions);
      } catch (err) {
        setError("Version loading failed");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [projectId]);

  return (
    <section>
      <header className="pageHeader"><div><h1>Version History</h1><p>Immutable snapshots created whenever official context changes.</p></div></header>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : versions.length === 0 ? <Empty>No versions yet.</Empty> : (
        <div className="split versionsLayout">
          <div className="versionTimeline">
            {versions.map((version, index) => (
              <article className={`versionCard ${index === 0 ? "currentVersion" : ""}`} key={version.id}>
                <div className="versionMarker">v{version.versionNumber}</div>
                <div className="versionBody">
                  <div className="cardHeader">
                    <div>
                      <h3>{version.versionTitle ?? "Project Context Updated"}</h3>
                      <p className="muted">Source: {version.source} · Created {formatDate(version.createdAt)}</p>
                    </div>
                    <button className="secondary" onClick={() => setSelected(version)}>View Snapshot</button>
                  </div>
                  <p>{version.changeSummary}</p>
                  <div className="badgeStack">
                    {changedSections(version).map((item) => <span className="badge" key={item}>{item}</span>)}
                    {changedSections(version).length === 0 && <span className="badge">No section changes recorded</span>}
                  </div>
                  {previewItems(version).length > 0 && (
                    <ul className="miniList">
                      {previewItems(version).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="panel snapshotPanel">
            <h2>Historical Snapshot</h2>
            {selected && <p className="note">Historical snapshot. Latest official context may be newer.</p>}
            {selected ? <pre>{JSON.stringify(selected.snapshot, null, 2)}</pre> : <Empty>Select a version.</Empty>}
          </div>
        </div>
      )}
    </section>
  );
}
