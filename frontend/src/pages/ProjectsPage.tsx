import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, Project } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TrashIcon } from "../components/Icons";
import { ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

function StatusChip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "ready" | "warning" }) {
  return <span className={`status-chip ${tone}`}>{children}</span>;
}

function ActionButton({ children, onClick, type = "button", loading = false }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; loading?: boolean }) {
  return (
    <button className="actionButton" type={type} onClick={onClick} disabled={loading}>
      {loading ? "Creating..." : children}
    </button>
  );
}

function CreateVaultDialog({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (project?: Project) => void }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.createProject({ name: form.name.trim(), description: form.description.trim() || undefined });
      onCreate(result.project);
      setForm({ name: "", description: "" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vault");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay vaultDialogOverlay" role="presentation" onMouseDown={onClose}>
      <section className="modal-content vaultDialog" role="dialog" aria-modal="true" aria-labelledby="create-vault-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <span className="dialogKicker">New memory space</span>
          <h3 id="create-vault-title">Create new vault</h3>
          <p>Start a new AI-readable memory space for a project.</p>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && <ErrorBox message={error} />}
            <label>Project name
              <input
                autoFocus
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Core Infrastructure"
                required
              />
            </label>
            <label>Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="What should AI tools remember about this project?"
              />
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="ghostButton" onClick={onClose}>Cancel</button>
            <ActionButton type="submit" loading={loading}>Create vault</ActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function MetricStrip({ projects }: { projects: Project[] }) {
  const projectsWithMemory = projects.filter((project) => (project.context?.currentVersionNumber ?? 0) > 0);
  const latestUpdate = projectsWithMemory
    .map((project) => project.context?.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  const repositoryCount = projects.filter((project) => project.repoUrl).length;

  const metrics = [
    ["Total vaults", String(projects.length)],
    ["Vaults with memory", projectsWithMemory.length ? String(projectsWithMemory.length) : "None yet"],
    ["Connected repositories", repositoryCount ? String(repositoryCount) : "None yet"],
    ["Last memory sync", latestUpdate ? formatDate(latestUpdate) : "Never"]
  ];

  return (
    <div className="workspace-overview metricStrip">
      {metrics.map(([label, value]) => (
        <div className="overview-pill" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ProjectListItem({
  project,
  deletingId,
  onDelete
}: {
  project: Project;
  deletingId: string;
  onDelete: (project: Project) => void;
}) {
  const hasMemory = (project.context?.currentVersionNumber ?? 0) > 0;
  const isDeleting = deletingId === project.id;

  return (
    <article className="vault-item">
      <Link className="vault-item-main" to={`/projects/${project.id}/context`}>
        <span className="vault-item-name">{project.name}</span>
        <span className="vault-item-desc">{project.description || "No description provided."}</span>
      </Link>
      <div className="vault-item-meta">
        {hasMemory ? <span className="versionBadge">v{project.context?.currentVersionNumber}</span> : <span>No memory yet</span>}
      </div>
      <div className="vault-item-meta">
        <span>{hasMemory && project.context?.updatedAt ? formatDate(project.context.updatedAt) : "Never synced"}</span>
      </div>
      <div className="vault-status-chips">
        <StatusChip tone={hasMemory ? "ready" : "warning"}>{hasMemory ? "Memory ready" : "Needs setup"}</StatusChip>
        <StatusChip tone={project.repoUrl ? "ready" : "warning"}>{project.repoUrl ? "GitHub connected" : "Not connected"}</StatusChip>
        <StatusChip tone={hasMemory ? "ready" : "warning"}>{hasMemory ? "MCP ready" : "No context yet"}</StatusChip>
      </div>
      <div className="vault-item-action reviewItemActions">
        <Link className="openVaultButton" to={`/projects/${project.id}/context`}>Open</Link>
        <button
          className="iconDeleteButton"
          disabled={isDeleting}
          onClick={() => onDelete(project)}
          type="button"
          aria-label={`Delete project ${project.name}`}
          title="Delete project"
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await api.projects();
      setProjects(result.projects);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query) ||
      (project.description?.toLowerCase().includes(query) ?? false)
    );
  }, [projects, search]);

  function handleCreated(project?: Project) {
    void load();
    if (project) navigate(`/projects/${project.id}/context`);
  }

  async function deleteProject(project: Project) {
    if (deletingId) return;
    setError("");
    setDeletingId(project.id);
    try {
      await api.deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project. Check backend status and try again.");
    } finally {
      setDeletingId("");
    }
  }

  function confirmProjectDelete() {
    const project = confirmProject;
    setConfirmProject(null);
    if (project) void deleteProject(project);
  }

  return (
    <section className="projects-console">
      <header className="console-header pageHeader">
        <div className="console-header-text">
          <h1>Projects</h1>
          <p>Create or open a vault to manage AI-readable project memory across tools.</p>
        </div>
        <div className="console-actions">
          <Link className="ghostButton" to="/docs">View Docs</Link>
          <ActionButton onClick={() => setIsDialogOpen(true)}>New Vault</ActionButton>
        </div>
      </header>

      {error && <ErrorBox message={error} />}

      <MetricStrip projects={projects} />

      <section className="vaults-section surfacePanel">
        <div className="section-title-row">
          <div>
            <h2>Vaults</h2>
            <p>{filteredProjects.length} visible of {projects.length} total</p>
          </div>
          <div className="vault-search-wrapper searchInput">
            <span className="vault-search-icon" aria-hidden="true"></span>
            <input
              className="vault-search"
              placeholder="Search vaults..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? <Loading /> : filteredProjects.length === 0 ? (
          <div className="empty-vault-state">
            <div className="emptyStateMark" aria-hidden="true"><span /></div>
            <h3>{projects.length ? "No vaults match your search" : "Create your first vault"}</h3>
            <p>Store project goals, decisions, constraints, and AI handoff context in one place.</p>
            <div className="emptyStateActions">
              <ActionButton onClick={() => setIsDialogOpen(true)}>Create vault</ActionButton>
              <Link className="ghostButton" to="/docs">Read docs</Link>
            </div>
          </div>
        ) : (
          <div className="vault-list">
            {filteredProjects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                deletingId={deletingId}
                onDelete={setConfirmProject}
              />
            ))}
          </div>
        )}
      </section>

      <CreateVaultDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreate={handleCreated}
      />
      <ConfirmDialog
        open={Boolean(confirmProject)}
        title="Delete project?"
        description={
          confirmProject
            ? `This permanently deletes "${confirmProject.name}" and its project context, suggestions, versions, and GitHub activity. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete project"
        intent="danger"
        onCancel={() => setConfirmProject(null)}
        onConfirm={confirmProjectDelete}
      />
    </section>
  );
}
