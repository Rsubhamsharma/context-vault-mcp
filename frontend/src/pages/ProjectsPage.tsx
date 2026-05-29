import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Project } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

const workflowSteps = [
  ["Connect GitHub App", "Link the repository that should feed project memory."],
  ["Push code or finish AI task", "GitHub, MCP, or manual capture sends a meaningful update."],
  ["Context Vault creates a smart suggestion", "Changes become a reviewable memory patch, not an automatic mutation."],
  ["User reviews and applies", "You decide what becomes official project context."],
  ["Versioned project memory updates", "Every applied change creates an immutable context version."],
  ["Any AI tool loads context through MCP", "Codex, Cursor, Claude, and other clients share the same memory."]
];

const demoChecklist = [
  "Project context initialized",
  "MCP API key created",
  "GitHub App connected",
  "Smart suggestion created",
  "Suggestion applied",
  "Version history updated",
  "context_load tested in AI CLI"
];

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await api.projects();
      setProjects(result.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    await api.createProject({ name, description: description || undefined });
    setName("");
    setDescription("");
    await load();
  }

  useEffect(() => { void load(); }, []);
  const latestProject = projects[0];

  return (
    <section>
      <header className="pageHeader"><div><h1>Dashboard</h1><p>Choose the project memory source your AI tools should use.</p></div></header>
      {error && <ErrorBox message={error} />}
      <div className="panel dashboardHero">
        <div>
          <span className="eyebrow">Project memory layer</span>
          <h2>GitHub stores code. Context Vault stores AI-readable project memory.</h2>
          <p>Switch AI tools without losing project understanding, then review every proposed memory change before it becomes official.</p>
        </div>
        <div className="statusCards">
          <div><span>Projects</span><strong>{projects.length}</strong></div>
          <div><span>Current version</span><strong>{latestProject?.context?.currentVersionNumber ? `v${latestProject.context.currentVersionNumber}` : "-"}</strong></div>
          <div><span>Last update</span><strong>{latestProject?.context?.updatedAt ? formatDate(latestProject.context.updatedAt) : "No context"}</strong></div>
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader"><h2>Context Vault workflow</h2><span className="badge">Review-first</span></div>
        <div className="workflowGrid compactWorkflow">
          {workflowSteps.map(([title, description], index) => (
            <div className="workflowStep" key={title}>
              <span className="stepNumber">{index + 1}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="split dashboardSplit">
        <form className="panel form compact" onSubmit={create}>
          <h2>Create project</h2>
          <p className="muted">Start a new source of truth for AI-readable project memory.</p>
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <button>Create project</button>
        </form>
        <div className="panel">
          <div className="panelHeader"><h2>Demo checklist</h2><span className="badge">Setup</span></div>
          <ul className="checklist">
            {demoChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
      {loading ? <Loading /> : projects.length === 0 ? <Empty>No projects yet.</Empty> : (
        <div className="panel">
          <div className="panelHeader"><h2>Projects</h2><span className="badge">{projects.length} total</span></div>
          <div className="projectList">
            {projects.map((project) => (
              <article className="projectRow" key={project.id}>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description || "No description"}</p>
                  <span className="muted">Created {formatDate(project.createdAt)}</span>
                </div>
                <Link className="buttonLink" to={`/projects/${project.id}/context`}>Open</Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
