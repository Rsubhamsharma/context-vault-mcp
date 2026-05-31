import assert from "node:assert/strict";
import test from "node:test";
import { githubAnalysisService, type GitHubChangedFile } from "./githubAnalysis.service";

const analyze = (commitMessages: string[], changedFiles: GitHubChangedFile[]) => githubAnalysisService.analyze({
  eventType: "push",
  branch: "main",
  commitSha: "abc123",
  commitMessages,
  changedFiles,
  repoOwner: "example",
  repoName: "repo"
});

const patchText = (result: ReturnType<typeof githubAnalysisService.analyze>) => {
  return Object.values(result.suggestedPatch).flat().join(" ").toLowerCase();
};

test("frontend version history and landing page commits generate frontend-specific suggestions", () => {
  const result = analyze(
    ["feat: add version history and landing pages with associated styles to the frontend"],
    [
      { filename: "client/src/pages/VersionsPage.tsx" },
      { filename: "client/src/pages/LandingPage.tsx" },
      { filename: "client/src/styles.css" }
    ]
  );

  assert.deepEqual(result.suggestedPatch.decisions, []);
  assert.deepEqual(result.suggestedPatch.constraints, []);
  assert.deepEqual(result.suggestedPatch.issues, []);
  assert.deepEqual(result.suggestedPatch.dependencies, []);
  assert.deepEqual(result.suggestedPatch.nextSteps, []);
  assert.match(result.suggestedPatch.features.join(" "), /frontend version history UI/i);
  assert.match(result.suggestedPatch.features.join(" "), /landing page UI/i);
  assert.match(result.suggestedPatch.architectureNotes.join(" "), /Frontend includes landing and version-history pages/i);
  assert.doesNotMatch(patchText(result), /readable version titles|version metadata is generated|manually write version change summaries|review github push/i);
});

test("backend version metadata commits can generate version metadata context", () => {
  const result = analyze(
    ["feat: generate readable version metadata summaries"],
    [
      { filename: "src/modules/context/versionMetadata.service.ts" },
      { filename: "src/modules/context/context.service.ts" }
    ]
  );

  assert.match(result.suggestedPatch.features.join(" "), /backend version metadata generation/i);
  assert.match(result.suggestedPatch.architectureNotes.join(" "), /Backend version metadata logic/i);
});

test("dependencies are only suggested when package files provide dependency evidence", () => {
  const withoutPackage = analyze(
    ["feat: add zod validation to settings form"],
    [{ filename: "frontend/src/pages/SettingsPage.tsx" }]
  );
  assert.deepEqual(withoutPackage.suggestedPatch.dependencies, []);

  const withPackage = analyze(
    ["feat: add zod validation dependency"],
    [{ filename: "package.json" }]
  );
  assert.ok(withPackage.suggestedPatch.dependencies.includes("Zod"));
});

test("docs-only changes stay conservative", () => {
  const result = analyze(
    ["docs: update setup instructions"],
    [{ filename: "docs/setup.md" }]
  );

  assert.deepEqual(result.suggestedPatch.decisions, []);
  assert.deepEqual(result.suggestedPatch.constraints, []);
  assert.deepEqual(result.suggestedPatch.issues, []);
  assert.deepEqual(result.suggestedPatch.dependencies, []);
  assert.deepEqual(result.suggestedPatch.nextSteps, []);
  assert.match(result.suggestedPatch.features.join(" "), /documentation/i);
});

test("fixed bug commits do not add noisy fixed issue entries", () => {
  const result = analyze(
    ["fix: prevent settings panel overflow on mobile"],
    [{ filename: "frontend/src/pages/SettingsPage.tsx" }]
  );

  assert.deepEqual(result.suggestedPatch.issues, []);
  assert.doesNotMatch(patchText(result), /fixed issue indicated by github change|fixed or addressed issue/i);
});

test("feature push without changed-file metadata still creates a reviewable suggestion", () => {
  const result = analyze(
    ["feat: add project dashboard activity scroll"],
    []
  );

  assert.match(result.suggestedPatch.features.join(" "), /project dashboard activity scroll/i);
  assert.deepEqual(result.suggestedPatch.nextSteps, []);
  assert.notEqual(result.confidence, "high");
});
