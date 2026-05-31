import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, authStore, User } from "../api/client";
import { getUserInitials } from "../utils";

type NavItem = {
  suffix?: string;
  to?: string;
  label: string;
  icon: string;
  end?: boolean;
};

function ShellLogo() {
  return (
    <span className="shellLogo" aria-hidden="true">
      <span />
    </span>
  );
}

function SidebarNav({ projectId, onNavigate }: { projectId?: string; onNavigate?: () => void }) {
  const mainLinks: NavItem[] = [
    { to: "/projects", label: "Projects", icon: "P", end: true },
    ...(projectId ? [
      { suffix: "/dashboard", label: "Dashboard", icon: "D" },
      { suffix: "/context", label: "Project Context", icon: "C" },
      { suffix: "/suggestions", label: "Suggestions", icon: "S" },
      { suffix: "/versions", label: "Versions", icon: "V" },
      { suffix: "/github", label: "GitHub", icon: "G" }
    ] : [])
  ];

  const developerLinks: NavItem[] = projectId ? [
    { suffix: "/api-keys", label: "API Keys", icon: "K" },
    { suffix: "/mcp", label: "MCP Setup", icon: "M" },
    { suffix: "/docs", label: "Docs", icon: "?" }
  ] : [];

  const renderLink = (item: NavItem) => {
    const to = item.to ?? `/projects/${projectId}${item.suffix}`;
    return (
      <NavLink key={item.label} to={to} end={item.end} onClick={onNavigate} className={({ isActive }) => isActive ? "active" : ""}>
        <span className="navIcon" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <nav className="sidebarNav" aria-label="Application navigation">
      <span className="navGroup">Main</span>
      {mainLinks.map(renderLink)}
      {developerLinks.length > 0 && (
        <>
          <span className="navGroup">Developer Setup</span>
          {developerLinks.map(renderLink)}
        </>
      )}
    </nav>
  );
}

function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" }) {
  return <span className={`appStatusBadge ${tone}`}>{children}</span>;
}

function UserFallbackIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 10.2a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Zm0 1.5c-3.2 0-5.8 1.8-5.8 4v.9h11.6v-.9c0-2.2-2.6-4-5.8-4Z" />
    </svg>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const redirectToLogin = () => {
      navigate("/login?reason=session", {
        replace: true,
        state: { from: location }
      });
    };

    window.addEventListener("context-vault:session-expired", redirectToLogin);
    return () => window.removeEventListener("context-vault:session-expired", redirectToLogin);
  }, [location, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setGithubConnected(false);
      return;
    }

    void api.githubConnection(projectId)
      .then((result) => {
        if (cancelled) return;
        setGithubConnected([...result.githubAppConnections, ...result.manualConnections].some((connection) => connection.isActive));
      })
      .catch(() => {
        if (!cancelled) setGithubConnected(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void api.me()
      .then((result) => {
        if (!cancelled) setUser(result.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    authStore.clear();
    navigate("/login");
  }

  const initials = getUserInitials(user);

  return (
    <div className="app appShell">
      <aside className="sidebar appSidebar">
        <div className="sidebarHeader">
          <Link to="/" className="brand appBrand" aria-label="Context Vault landing page">
            <ShellLogo />
            <span>Context Vault</span>
          </Link>
          <p className="tagline">AI-readable project memory</p>
        </div>
        <SidebarNav projectId={projectId} />
        <div className="sidebarFooter">
          <div className="appStatus">
            <span />
            MCP memory ready
          </div>
          <button className="logoutButton" onClick={logout}>Logout</button>
        </div>
      </aside>

      <div className="mobileShellBar">
        <button className="mobileMenuButton" type="button" aria-expanded={drawerOpen} aria-label={drawerOpen ? "Close navigation" : "Open navigation"} onClick={() => setDrawerOpen((open) => !open)}>
          <span />
          <span />
        </button>
        <Link to="/" className="appBrand" aria-label="Context Vault landing page"><ShellLogo /><span>Context Vault</span></Link>
      </div>

      {drawerOpen && (
        <div className="mobileSidebarOverlay" onClick={() => setDrawerOpen(false)}>
          <aside className="mobileSidebarDrawer" onClick={(event) => event.stopPropagation()}>
            <div className="sidebarHeader">
              <Link to="/" className="brand appBrand" aria-label="Context Vault landing page" onClick={() => setDrawerOpen(false)}>
                <ShellLogo />
                <span>Context Vault</span>
              </Link>
              <p className="tagline">AI-readable project memory</p>
            </div>
            <SidebarNav projectId={projectId} onNavigate={() => setDrawerOpen(false)} />
            <div className="sidebarFooter">
              <div className="appStatus"><span />MCP memory ready</div>
              <button className="logoutButton" onClick={logout}>Logout</button>
            </div>
          </aside>
        </div>
      )}

      <main className="main appMain">
        <div className="topbar appTopbar">
          <div className="topbarStatus">
            <StatusBadge>Review-first</StatusBadge>
            {projectId && <StatusBadge tone={githubConnected ? "success" : "warning"}>{githubConnected ? "GitHub connected" : "GitHub not connected"}</StatusBadge>}
          </div>
          <Link className="userProfile" to="/profile" aria-label="Open profile" title="Profile">
            <span>{initials || <UserFallbackIcon />}</span>
          </Link>
        </div>
        <div className="pageEnter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
