import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { authStore } from "../api/client";

export function AppLayout() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectLinks = projectId ? [
    ["/context", "Context"],
    ["/github", "GitHub"],
    ["/suggestions", "Suggestions"],
    ["/versions", "Versions"],
    ["/mcp", "MCP Setup"]
  ] : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">Context Vault</div>
          <p className="tagline">Context Vault keeps AI project memory portable across tools.</p>
        </div>
        <nav>
          <NavLink to="/projects">Projects</NavLink>
          {projectLinks.map(([suffix, label]) => (
            <NavLink key={suffix} to={`/projects/${projectId}${suffix}`}>{label}</NavLink>
          ))}
        </nav>
        <button className="secondary" onClick={() => { authStore.clear(); navigate("/login"); }}>Logout</button>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
