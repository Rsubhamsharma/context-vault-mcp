-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "keyPrefix" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ApiKey" ADD COLUMN "scopes" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
