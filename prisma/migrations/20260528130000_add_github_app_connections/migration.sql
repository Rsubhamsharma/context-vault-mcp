CREATE TYPE "GitHubConnectionType" AS ENUM ('manual', 'github_app');

ALTER TABLE "GitHubConnection"
DROP CONSTRAINT IF EXISTS "GitHubConnection_projectId_key";

ALTER TABLE "GitHubConnection"
ADD COLUMN "installationId" TEXT,
ADD COLUMN "repositoryId" TEXT,
ADD COLUMN "accountLogin" TEXT,
ADD COLUMN "accountType" TEXT,
ADD COLUMN "connectionType" "GitHubConnectionType" NOT NULL DEFAULT 'manual';

CREATE INDEX "GitHubConnection_projectId_idx" ON "GitHubConnection"("projectId");
CREATE INDEX "GitHubConnection_installationId_idx" ON "GitHubConnection"("installationId");
CREATE INDEX "GitHubConnection_repositoryId_idx" ON "GitHubConnection"("repositoryId");
CREATE UNIQUE INDEX "GitHubConnection_projectId_repoOwner_repoName_key" ON "GitHubConnection"("projectId", "repoOwner", "repoName");
