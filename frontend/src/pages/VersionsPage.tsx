import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Version } from "../api/client";
import { ErrorBox } from "../components/State";
import { asList, formatDate } from "../utils";

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

const sourceOptions = ["All sources", "GitHub", "MCP", "Manual", "System", "Cleanup"];

const sourceLabel = (source: string) => {
  const normalized = source.replace(/_/g, " ").toLowerCase();
  if (normalized.includes("github")) return "GitHub";
  if (normalized.includes("mcp")) return "MCP";
  if (normalized.includes("manual")) return "Manual";
  if (normalized.includes("cleanup")) return "Cleanup";
  if (normalized.includes("system")) return "System";
  return source || "System";
};

const changedSections = (version: Version): string[] => {
  return Object.entries(version.changedSections ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => sectionLabels[key] ?? key);
};

const changedSectionRows = (version: Version): Array<{ label: string; value: string }> => {
  return Object.entries(version.changedSections ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => ({
      label: sectionLabels[key] ?? key,
      value: value === true ? "changed" : `+${value}`
    }));
};

const changeSummaryLine = (version: Version) => {
  const count = changedSections(version).length;
  if (count === 0) return "No meaningful section changes";
  return `${count} ${count === 1 ? "section" : "sections"} changed`;
};

const previewGroups = (version: Version): Array<{ label: string; items: string[] }> => {
  return Object.entries(version.changePreview ?? {}).flatMap(([key, values]) =>
    Array.isArray(values) && values.length > 0 ? [{ label: previewLabels[key] ?? key, items: values }] : []
  );
};

const snapshotRecord = (snapshot: unknown): Record<string, unknown> => {
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
};

const summaryText = (version: Version) => version.changeSummary || "No summary recorded for this memory snapshot.";

const isNoisyVersion = (version: Version) => {
  const text = summaryText(version).toLowerCase();
  return changedSections(version).length === 0 || text.includes("no section changes");
};

function VersionsPageHeader({ versions }: { versions: Version[] }) {
  const current = versions[0];

  return (
    <header className="versionsPageHeader">
      <div>
        <h1>Versions</h1>
        <p>Review the history of official project memory snapshots.</p>
        <div className="versionsHeaderMeta" aria-label="Version history metadata">
          <span>{current ? `Current v${current.versionNumber}` : "No current version"}</span>
          <span>{versions.length} total versions</span>
          <span>Last updated {current ? formatDate(current.createdAt) : "Never"}</span>
        </div>
      </div>
      <div>
        <Link className="actionButton" to="../context">View Current Context</Link>
      </div>
    </header>
  );
}

function VersionFilters({
  query,
  source,
  onQueryChange,
  onSourceChange
}: {
  query: string;
  source: string;
  onQueryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
}) {
  return (
    <div className="versionFilters">
      <input
        aria-label="Search versions"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search versions"
        value={query}
      />
      <select aria-label="Filter by source" onChange={(event) => onSourceChange(event.target.value)} value={source}>
        {sourceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function VersionHistoryItem({
  version,
  active,
  current,
  onSelect
}: {
  version: Version;
  active: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`versionHistoryItem secondary ${active ? "isActive" : ""} ${current ? "isCurrent" : ""} ${isNoisyVersion(version) ? "isQuiet" : ""}`} onClick={onSelect} type="button">
      <span className="versionHistoryNumber">v{version.versionNumber}</span>
      <span className="versionHistoryBody">
        <span className="versionHistoryTopline">
          <strong>{version.versionTitle ?? "Project Context Updated"}</strong>
          <em>{sourceLabel(version.source)}</em>
        </span>
        <span className="versionHistorySummary">{summaryText(version)}</span>
        <span className="versionHistoryMeta">
          <span>{formatDate(version.createdAt)}</span>
          <span>{changeSummaryLine(version)}</span>
        </span>
      </span>
    </button>
  );
}

function VersionHistoryList({
  versions,
  selectedId,
  currentId,
  onSelect
}: {
  versions: Version[];
  selectedId?: string;
  currentId?: string;
  onSelect: (version: Version) => void;
}) {
  if (versions.length === 0) {
    return <p className="versionsNoResults">No versions match this filter.</p>;
  }

  return (
    <div className="scrollableVersionList">
      <div className="versionTimelineTrack">
        {versions.map((version) => (
          <VersionHistoryItem
            active={version.id === selectedId}
            current={version.id === currentId}
            key={version.id}
            onSelect={() => onSelect(version)}
            version={version}
          />
        ))}
      </div>
    </div>
  );
}

function VersionSnapshotPreview({ version }: { version: Version }) {
  const snapshot = snapshotRecord(version.snapshot);
  const previewSections = ["goal", "features", "decisions", "constraints"]
    .map((key) => ({ key, label: sectionLabels[key], items: asList(snapshot[key]).slice(0, 3) }))
    .filter((section) => section.items.length > 0);

  return (
    <section className="versionSnapshotPreview">
      <h3>Snapshot preview</h3>
      {previewSections.length > 0 ? (
        <div>
          {previewSections.map((section) => (
            <article key={section.key}>
              <h4>{section.label}</h4>
              {section.items.map((item) => <p key={item}>{item}</p>)}
            </article>
          ))}
        </div>
      ) : (
        <p className="versionMutedLine">No structured preview is available for this snapshot.</p>
      )}
      <details className="versionFullSnapshot">
        <summary>View full snapshot</summary>
        <pre>{JSON.stringify(version.snapshot, null, 2)}</pre>
      </details>
    </section>
  );
}

function ChangedSectionsSummary({ version }: { version: Version }) {
  const rows = changedSectionRows(version);

  return (
    <section className="versionDetailChanges">
      <h3>Changed sections</h3>
      {rows.length > 0 ? (
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="versionMutedLine">No meaningful section changes</p>
      )}
    </section>
  );
}

function ChangePreview({ version }: { version: Version }) {
  const groups = previewGroups(version);
  const primaryGroups = groups.slice(0, 4).map((group) => ({ ...group, items: group.items.slice(0, 2) }));
  const allItems = groups.flatMap((group) => group.items.map((item) => `${group.label}: ${item}`));

  if (groups.length === 0) return null;

  return (
    <section className="versionDetailPreviewItems">
      <h3>Change preview</h3>
      <div className="versionPreviewGroups">
        {primaryGroups.map((group) => (
          <article key={group.label}>
            <h4>{group.label}</h4>
            {group.items.map((item) => <p key={item}>{item}</p>)}
          </article>
        ))}
      </div>
      {allItems.length > 6 && (
        <details className="versionAllChanges">
          <summary>View all changes</summary>
          <ul>
            {allItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

function VersionDetailPanel({ version }: { version: Version | null }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [version?.id]);

  if (!version) {
    return (
      <aside className="versionDetailPanel isEmpty">
        <p>Select a version to inspect its memory snapshot.</p>
      </aside>
    );
  }

  async function copySnapshot() {
    if (!version) return;
    await navigator.clipboard.writeText(JSON.stringify(version.snapshot, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <aside className="versionDetailPanel">
      <header>
        <div>
          <span className="versionDetailNumber">v{version.versionNumber}</span>
          <h2>{version.versionTitle ?? "Project Context Updated"}</h2>
          <p>{sourceLabel(version.source)} / {formatDate(version.createdAt)}</p>
        </div>
      </header>
      <section className="versionDetailSummary">
        <h3>Summary</h3>
        <p>{summaryText(version)}</p>
      </section>
      <ChangedSectionsSummary version={version} />
      <ChangePreview version={version} />
      <VersionSnapshotPreview version={version} />
      <div className="versionDetailActions">
        <button className="ghostButton" onClick={() => void copySnapshot()} type="button">{copied ? "Copied" : "Copy Snapshot JSON"}</button>
      </div>
    </aside>
  );
}

function VersionEmptyState() {
  return (
    <section className="versionsEmptyState">
      <h2>No versions yet</h2>
      <p>Versions appear after the first meaningful ProjectContext update is applied.</p>
      <div>
        <Link className="actionButton" to="../context">Go to Project Context</Link>
        <Link className="ghostButton" to="../suggestions">Create manual suggestion</Link>
      </div>
    </section>
  );
}

function VersionSkeleton() {
  return (
    <div className="versionsSkeleton" aria-label="Loading versions">
      <div>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function VersionsPage() {
  const { projectId = "" } = useParams();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<Version | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All sources");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await api.versions(projectId);
        setVersions(result.versions);
        setSelected(result.versions[0] ?? null);
      } catch {
        setError("Could not load versions. Check backend status and try again.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [projectId]);

  const filteredVersions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return versions.filter((version) => {
      const matchesSource = source === "All sources" || sourceLabel(version.source) === source;
      const searchable = [
        `v${version.versionNumber}`,
        version.versionTitle ?? "",
        version.source,
        sourceLabel(version.source),
        summaryText(version),
        ...changedSections(version)
      ].join(" ").toLowerCase();
      return matchesSource && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, source, versions]);

  useEffect(() => {
    if (filteredVersions.length === 0) return;
    if (!selected || !filteredVersions.some((version) => version.id === selected.id)) {
      setSelected(filteredVersions[0]);
    }
  }, [filteredVersions, selected]);

  return (
    <section className="versionsPage">
      <VersionsPageHeader versions={versions} />
      {error && <ErrorBox message={error} />}
      {loading ? <VersionSkeleton /> : versions.length === 0 ? <VersionEmptyState /> : (
        <>
          <VersionFilters query={query} source={source} onQueryChange={setQuery} onSourceChange={setSource} />
          <div className="versionsBrowser">
            <VersionHistoryList versions={filteredVersions} selectedId={selected?.id} currentId={versions[0]?.id} onSelect={setSelected} />
            <VersionDetailPanel version={selected} />
          </div>
        </>
      )}
    </section>
  );
}
