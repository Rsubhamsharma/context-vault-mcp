import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  CONTEXT_VAULT_API_URL: z.string().url().default("http://localhost:4000"),
  CONTEXT_VAULT_API_KEY: z.string().optional(),
  CONTEXT_VAULT_PROJECT_ID: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error("Invalid Context Vault MCP environment configuration");
}

export const env = {
  apiUrl: parsed.data.CONTEXT_VAULT_API_URL.replace(/\/+$/, ""),
  apiKey: parsed.data.CONTEXT_VAULT_API_KEY,
  defaultProjectId: parsed.data.CONTEXT_VAULT_PROJECT_ID
};
