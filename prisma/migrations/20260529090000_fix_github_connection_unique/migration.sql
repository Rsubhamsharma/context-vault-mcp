DROP INDEX IF EXISTS "GitHubConnection_projectId_key";
DROP INDEX IF EXISTS "GitHubConnection_projectId_repoOwner_repoName_key";
DROP INDEX IF EXISTS "project_repo_connection_type_unique";

CREATE INDEX IF NOT EXISTS "GitHubConnection_projectId_connectionType_isActive_idx"
ON "GitHubConnection"("projectId", "connectionType", "isActive");

CREATE INDEX IF NOT EXISTS "GitHubConnection_installationId_repositoryId_idx"
ON "GitHubConnection"("installationId", "repositoryId");

CREATE UNIQUE INDEX "project_repo_connection_type_unique"
ON "GitHubConnection"("projectId", "repoOwner", "repoName", "connectionType");
