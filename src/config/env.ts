import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  GITHUB_WEBHOOK_DEV_MODE: z.coerce.boolean().default(true),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_NAME: z.string().default("context-vault"),
  GITHUB_APP_SLUG: z.string().default("context-vault"),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_SETUP_URL: z.string().default("http://localhost:5173/github/setup"),
  GITHUB_SUGGESTION_AI_PROVIDER: z.string().default("gemini"),
  GITHUB_SUGGESTION_AI_MODEL: z.string().default("gemini-2.0-flash"),
  GEMINI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  BACKEND_PUBLIC_URL: z.string().default("http://localhost:4000")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

export const env = parsed.data;
