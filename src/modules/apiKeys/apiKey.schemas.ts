import { z } from "zod";

export const apiKeyScopeSchema = z.enum(["context:read", "context:write:suggestion"]);

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(apiKeyScopeSchema).min(1).max(10)
});

export const apiKeyIdParamsSchema = z.object({
  apiKeyId: z.string().min(1)
});

export type ApiKeyScope = z.infer<typeof apiKeyScopeSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
