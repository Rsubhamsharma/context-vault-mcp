import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ApiRequestError, api, authStore } from "./api/client";
import { AppLayout } from "./pages/AppLayout";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { AuthPage } from "./pages/AuthPage";
import { ContextPage } from "./pages/ContextPage";
import { DocsPage } from "./pages/DocsPage";
import { GitHubPage } from "./pages/GitHubPage";
import { LandingPage } from "./pages/LandingPage";
import { McpPage } from "./pages/McpPage";
import { ProjectDashboardPage } from "./pages/ProjectDashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SuggestionsPage } from "./pages/SuggestionsPage";
import { VersionsPage } from "./pages/VersionsPage";
import "./styles.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authenticated" | "anonymous" | "expired">(
    authStore.getToken() ? "checking" : "anonymous"
  );

  useEffect(() => {
    let cancelled = false;
    const token = authStore.getToken();

    if (!token) {
      setStatus("anonymous");
      return;
    }

    setStatus("checking");
    void api.me()
      .then(() => {
        if (!cancelled) setStatus("authenticated");
      })
      .catch((error) => {
        if (cancelled) return;
        authStore.clear();
        setStatus(error instanceof ApiRequestError && error.status === 401 ? "expired" : "anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <main className="authGateShell" aria-live="polite">
        <div className="authGatePanel">
          <span className="authGateMark" aria-hidden="true" />
          <p>Checking session...</p>
        </div>
      </main>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return (
    <Navigate
      to={status === "expired" ? "/login?reason=session" : "/login"}
      replace
      state={{ from: location }}
    />
  );
}

function ProjectDeepLink({ target }: { target: "mcp" | "docs" | "github" }) {
  const location = useLocation();
  const [to, setTo] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    if (!authStore.getToken()) {
      setRequiresLogin(true);
      return;
    }

    void api.projects()
      .then((result) => {
        const project = result.projects[0];
        setTo(project ? `/projects/${project.id}/${target}` : "/projects");
      })
      .catch(() => setTo("/projects"));
  }, [target]);

  if (requiresLogin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return to ? (
    <Navigate to={to} replace />
  ) : (
    <main className="authGateShell" aria-live="polite">
      <div className="authGatePanel">
        <span className="authGateMark" aria-hidden="true" />
        <p>Opening project...</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/mcp" element={<ProjectDeepLink target="mcp" />} />
        <Route path="/github" element={<ProjectDeepLink target="github" />} />
        <Route path="/docs" element={<ProjectDeepLink target="docs" />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
          <Route path="/projects/:projectId/context" element={<ContextPage />} />
          <Route path="/projects/:projectId/github" element={<GitHubPage />} />
          <Route path="/projects/:projectId/suggestions" element={<SuggestionsPage />} />
          <Route path="/projects/:projectId/versions" element={<VersionsPage />} />
          <Route path="/projects/:projectId/api-keys" element={<ApiKeysPage />} />
          <Route path="/projects/:projectId/mcp" element={<McpPage />} />
          <Route path="/projects/:projectId/docs" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
