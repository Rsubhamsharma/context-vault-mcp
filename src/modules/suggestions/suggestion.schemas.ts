import { SuggestionSource } from "@prisma/client";
import { z } from "zod";
import { contextPatchSchema } from "../context/context.schemas";

export const suggestionIdParamsSchema = z.object({
  projectId: z.string().min(1),
  suggestionId: z.string().min(1)
});

export const createSuggestionSchema = z.object({
  title: z.string().min(1).max(200),
  source: z.nativeEnum(SuggestionSource).default(SuggestionSource.ai),
  suggestedPatch: contextPatchSchema
});

export const applySuggestionSchema = z.object({
  changeSummary: z.string().min(1).max(1000).optional(),
  mergeMode: z.enum(["merge", "replace"]).default("merge")
});

export type CreateSuggestionInput = z.infer<typeof createSuggestionSchema>;
export type ApplySuggestionInput = z.infer<typeof applySuggestionSchema>;
