import cors from "cors";
import express from "express";
import { apiKeyRoutes } from "./modules/apiKeys/apiKey.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { contextRoutes } from "./modules/context/context.routes";
import { githubRoutes, projectGithubRoutes } from "./modules/github/github.routes";
import { projectRoutes } from "./modules/projects/project.routes";
import { suggestionRoutes } from "./modules/suggestions/suggestion.routes";
import { versionRoutes } from "./modules/versions/version.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    (req as express.Request).rawBody = Buffer.from(buf);
  }
}));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/github", projectGithubRoutes);
app.use("/api/projects/:projectId/context", contextRoutes);
app.use("/api/projects/:projectId/suggestions", suggestionRoutes);
app.use("/api/projects/:projectId/versions", versionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
