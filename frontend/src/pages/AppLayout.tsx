import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { authStore } from "../api/client";

export function AppLayout() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const projectLinks = projectId ? [
    ["/context", "Project Context", "◆"],
    ["/suggestions", "Suggestions", "◇"],
    ["/versions", "Versions", "◌"],
    ["/github", "GitHub", "⌁"]
  ] : [];
  const developerLinks = projectId ? [
    ["/api-keys", "API Keys", "◍"],
    ["/mcp", "MCP Setup", "⌘"],
    ["/docs", "Docs", "□"]
  ] : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebarHeader">
          <div className="brand"><span className="brandMark"></span>Context Vault</div>
          <p className="tagline">AI-readable project memory for every tool.</p>
        </div>
        <nav>
          <span className="navGroup">Main</span>
          <NavLink to="/projects"><span className="navIcon">⌂</span>Dashboard</NavLink>
          {projectLinks.map(([suffix, label, icon]) => (
            <NavLink key={suffix} to={`/projects/${projectId}${suffix}`}><span className="navIcon">{icon}</span>{label}</NavLink>
          ))}
          {developerLinks.length > 0 && <span className="navGroup">Developer Setup</span>}
          {developerLinks.map(([suffix, label, icon]) => (
            <NavLink key={suffix} to={`/projects/${projectId}${suffix}`}><span className="navIcon">{icon}</span>{label}</NavLink>
          ))}
        </nav>
        <div className="sidebarFooter">
          <div className="appStatus"><span></span>MCP memory ready</div>
          <button className="secondary" onClick={() => { authStore.clear(); navigate("/login"); }}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="commandInput">Search memory, suggestions, docs...</div>
          <div className="topbarBadges">
            <span className="badge successBadge">Review-first</span>
            <span className="badge">Scoped keys</span>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
