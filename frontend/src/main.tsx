import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { authStore } from "./api/client";
import { AppLayout } from "./pages/AppLayout";
import { AuthPage } from "./pages/AuthPage";
import { ContextPage } from "./pages/ContextPage";
import { GitHubPage } from "./pages/GitHubPage";
import { McpPage } from "./pages/McpPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SuggestionsPage } from "./pages/SuggestionsPage";
import { VersionsPage } from "./pages/VersionsPage";
import "./styles.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  return authStore.getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/context" element={<ContextPage />} />
          <Route path="/projects/:projectId/github" element={<GitHubPage />} />
          <Route path="/projects/:projectId/suggestions" element={<SuggestionsPage />} />
          <Route path="/projects/:projectId/versions" element={<VersionsPage />} />
          <Route path="/projects/:projectId/mcp" element={<McpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
