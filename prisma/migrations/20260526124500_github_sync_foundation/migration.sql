-- CreateEnum
CREATE TYPE "GitHubEventStatus" AS ENUM ('received', 'processed', 'skipped', 'failed');

-- CreateTable
CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "repoOwner" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "webhookSecretHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "connectionId" TEXT,
    "eventType" TEXT NOT NULL,
    "deliveryId" TEXT,
    "action" TEXT,
    "branch" TEXT,
    "commitSha" TEXT,
    "prNumber" INTEGER,
    "title" TEXT,
    "author" TEXT,
    "rawMetadata" JSONB NOT NULL,
    "status" "GitHubEventStatus" NOT NULL DEFAULT 'received',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GitHubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_projectId_key" ON "GitHubConnection"("projectId");

-- CreateIndex
CREATE INDEX "GitHubConnection_userId_idx" ON "GitHubConnection"("userId");

-- CreateIndex
CREATE INDEX "GitHubConnection_repoOwner_repoName_isActive_idx" ON "GitHubConnection"("repoOwner", "repoName", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubEvent_deliveryId_key" ON "GitHubEvent"("deliveryId");

-- CreateIndex
CREATE INDEX "GitHubEvent_projectId_createdAt_idx" ON "GitHubEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "GitHubEvent_connectionId_idx" ON "GitHubEvent"("connectionId");

-- AddForeignKey
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubEvent" ADD CONSTRAINT "GitHubEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubEvent" ADD CONSTRAINT "GitHubEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GitHubConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
