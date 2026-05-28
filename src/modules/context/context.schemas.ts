import { z } from "zod";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

const contextCollectionSchema = z.union([z.array(jsonValueSchema), z.record(jsonValueSchema)]);
const stringArraySchema = z.array(z.string());

export const contextFieldsSchema = z.object({
  goal: z.string().default(""),
  techStack: contextCollectionSchema.default([]),
  features: contextCollectionSchema.default([]),
  decisions: contextCollectionSchema.default([]),
  constraints: contextCollectionSchema.default([]),
  issues: contextCollectionSchema.default([]),
  dependencies: contextCollectionSchema.default([]),
  nextSteps: contextCollectionSchema.default([]),
  architectureNotes: contextCollectionSchema.default([]),
  aiInstructions: z.string().default("")
});

export const initializeContextSchema = contextFieldsSchema.extend({
  changeSummary: z.string().min(1).max(1000).optional()
});

const contextPatchObjectSchema = contextFieldsSchema.partial();
export const contextMergeModeSchema = z.enum(["merge", "replace"]).default("merge");

export const contextPatchSchema = contextPatchObjectSchema.refine(
  (value) => Object.keys(value).length > 0,
  "At least one context field is required"
);

export const updateContextSchema = contextPatchObjectSchema
  .extend({
  changeSummary: z.string().min(1).max(1000).optional(),
  mergeMode: contextMergeModeSchema
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "changeSummary" && key !== "mergeMode"),
    "At least one context field is required"
  );

export const replaceContextSchema = z.object({
  goal: z.string(),
  techStack: stringArraySchema,
  features: stringArraySchema,
  decisions: stringArraySchema,
  constraints: stringArraySchema,
  issues: stringArraySchema,
  dependencies: stringArraySchema,
  nextSteps: stringArraySchema,
  architectureNotes: stringArraySchema,
  aiInstructions: z.string(),
  changeSummary: z.string().min(1).max(1000).optional()
});

export const optimizedContextQuerySchema = z.object({
  mode: z.enum(["full-clean", "smart-task"]).default("full-clean"),
  task: z.string().optional(),
  raw: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true")
});

export const manualContextCaptureSchema = z.object({
  rawText: z.string().min(3).max(20000),
  mode: z.enum(["general_note", "git_summary", "release_note", "session_summary"]).default("general_note")
});

export type ContextFieldsInput = z.infer<typeof contextFieldsSchema>;
export type InitializeContextInput = z.infer<typeof initializeContextSchema>;
export type ContextPatchInput = z.infer<typeof contextPatchSchema>;
export type UpdateContextInput = z.infer<typeof updateContextSchema>;
export type ContextMergeMode = z.infer<typeof contextMergeModeSchema>;
export type ReplaceContextInput = z.infer<typeof replaceContextSchema>;
export type OptimizedContextQuery = z.infer<typeof optimizedContextQuerySchema>;
export type ManualContextCaptureInput = z.infer<typeof manualContextCaptureSchema>;
