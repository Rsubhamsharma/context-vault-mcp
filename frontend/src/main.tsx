import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { api, authStore } from "./api/client";
import { AppLayout } from "./pages/AppLayout";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { AuthPage } from "./pages/AuthPage";
import { ContextPage } from "./pages/ContextPage";
import { DocsPage } from "./pages/DocsPage";
import { GitHubPage } from "./pages/GitHubPage";
import { LandingPage } from "./pages/LandingPage";
import { McpPage } from "./pages/McpPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SuggestionsPage } from "./pages/SuggestionsPage";
import { VersionsPage } from "./pages/VersionsPage";
import "./styles.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return authStore.getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function ProjectDeepLink({ target }: { target: "mcp" | "docs" | "github" }) {
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (!authStore.getToken()) {
      setTo("/login");
      return;
    }

    void api.projects()
      .then((result) => {
        const project = result.projects[0];
        setTo(project ? `/projects/${project.id}/${target}` : "/projects");
      })
      .catch(() => setTo("/projects"));
  }, [target]);

  return to ? <Navigate to={to} replace /> : null;
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
          <Route path="/projects" element={<ProjectsPage />} />
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
