-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "keyPrefix" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "project_repo_connection_type_unique" RENAME TO "GitHubConnection_projectId_repoOwner_repoName_connectionTyp_key";
