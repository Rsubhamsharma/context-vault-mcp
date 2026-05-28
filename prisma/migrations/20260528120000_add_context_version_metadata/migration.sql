ALTER TABLE "ContextVersion"
ADD COLUMN "versionTitle" TEXT,
ADD COLUMN "changedSections" JSONB,
ADD COLUMN "changePreview" JSONB;
