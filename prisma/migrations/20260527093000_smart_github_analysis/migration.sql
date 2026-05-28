-- AlterTable
ALTER TABLE "ContextSuggestion" ADD COLUMN "reasoningSummary" TEXT;
ALTER TABLE "ContextSuggestion" ADD COLUMN "confidence" TEXT;
ALTER TABLE "ContextSuggestion" ADD COLUMN "relatedGithubEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContextSuggestion_relatedGithubEventId_key" ON "ContextSuggestion"("relatedGithubEventId");

-- AddForeignKey
ALTER TABLE "ContextSuggestion" ADD CONSTRAINT "ContextSuggestion_relatedGithubEventId_fkey" FOREIGN KEY ("relatedGithubEventId") REFERENCES "GitHubEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
