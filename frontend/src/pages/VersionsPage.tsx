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

const changedSectionText = (version: Version): string => {
  return Object.entries(version.changedSections ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${sectionLabels[key] ?? key}: ${value === true ? "changed" : `+${value}`}`)
    .join(", ");
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
        <div className="split">
          <div className="panel">
            <table><tbody>{versions.map((version) => (
              <tr key={version.id}>
                <td>v{version.versionNumber}</td>
                <td>{version.source}</td>
                <td>
                  <strong>{version.versionTitle ?? "Project Context Updated"}</strong>
                  <p className="muted">{version.changeSummary}</p>
                  {changedSectionText(version) && <p className="muted">{changedSectionText(version)}</p>}
                  {previewItems(version).length > 0 && (
                    <ul className="miniList">
                      {previewItems(version).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  {version.preview && (
                    <p className="muted">
                      {version.preview.features?.slice(0, 2).join(", ") || "No feature preview"} ·
                      {" "}{version.preview.counts?.featuresCount ?? 0} features,
                      {" "}{version.preview.counts?.decisionsCount ?? 0} decisions
                    </p>
                  )}
                </td>
                <td>{formatDate(version.createdAt)}</td>
                <td><button className="secondary" onClick={() => setSelected(version)}>View</button></td>
              </tr>
            ))}</tbody></table>
          </div>
          <div className="panel">
            <h2>Historical Snapshot</h2>
            {selected && <p className="note">Historical snapshot. Latest official context may be newer.</p>}
            {selected ? <pre>{JSON.stringify(selected.snapshot, null, 2)}</pre> : <Empty>Select a version.</Empty>}
          </div>
        </div>
      )}
    </section>
  );
}
