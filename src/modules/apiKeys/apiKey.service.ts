import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { ApiError } from "../../utils/ApiError";
import type { ApiKeyScope, CreateApiKeyInput } from "./apiKey.schemas";

const API_KEY_ENVIRONMENT = "live";

export const hashApiKey = (key: string): string => {
  return crypto.createHash("sha256").update(key).digest("hex");
};

const generateRawApiKey = (): string => {
  const secret = crypto.randomBytes(32).toString("base64url");
  return `cv_${API_KEY_ENVIRONMENT}_${secret}`;
};

const keyPrefixForDisplay = (key: string): string => key.slice(0, 18);

const parseScopes = (value: unknown): ApiKeyScope[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (scope): scope is ApiKeyScope =>
      scope === "context:read" || scope === "context:write:suggestion"
  );
};

export const apiKeyService = {
  async createApiKey(userId: string, input: CreateApiKeyInput) {
    const rawKey = generateRawApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = keyPrefixForDisplay(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: input.name,
        keyPrefix,
        keyHash,
        scopes: input.scopes
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true
      }
    });

    return {
      ...apiKey,
      key: rawKey,
      scopes: parseScopes(apiKey.scopes)
    };
  },

  async listApiKeys(userId: string) {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true
      }
    });

    return apiKeys.map((apiKey) => ({
      ...apiKey,
      scopes: parseScopes(apiKey.scopes)
    }));
  },

  async revokeApiKey(userId: string, apiKeyId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId }
    });

    if (!apiKey) {
      throw new ApiError(404, "API key not found");
    }

    return prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: apiKey.revokedAt ?? new Date() },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true
      }
    });
  },

  parseScopes
};
