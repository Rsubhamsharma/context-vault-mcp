import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Project } from "../api/client";
import { Empty, ErrorBox, Loading } from "../components/State";
import { formatDate } from "../utils";

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

  return (
    <section>
      <header className="pageHeader"><div><h1>Projects</h1><p>Choose the project memory source your AI tools should use.</p></div></header>
      {error && <ErrorBox message={error} />}
      <form className="panel form compact" onSubmit={create}>
        <h2>Create project</h2>
        <div className="grid2">
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        </div>
        <button>Create project</button>
      </form>
      {loading ? <Loading /> : projects.length === 0 ? <Empty>No projects yet.</Empty> : (
        <div className="list">
          {projects.map((project) => (
            <article className="card" key={project.id}>
              <div>
                <h3>{project.name}</h3>
                <p>{project.description || "No description"}</p>
                <span className="muted">Created {formatDate(project.createdAt)}</span>
              </div>
              <Link className="buttonLink" to={`/projects/${project.id}/context`}>Open</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
