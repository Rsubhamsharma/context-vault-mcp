import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { apiKeyService, hashApiKey } from "../modules/apiKeys/apiKey.service";
import type { ApiKeyScope } from "../modules/apiKeys/apiKey.schemas";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true
} as const;

const getBearerToken = (req: Request): string => {
  const authHeader = req.header("authorization");
  const [scheme, token] = authHeader?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Missing or invalid Authorization header");
  }

  return token;
};

const isContextVaultApiKey = (token: string): boolean => {
  return /^cv_(live|test)_[A-Za-z0-9_-]{32,}$/.test(token);
};

const authenticateJwt = async (req: Request): Promise<void> => {
  const token = getBearerToken(req);
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: publicUserSelect
  });

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists");
  }

  req.user = user;
  req.authType = "jwt";
};

const authenticateApiKey = async (
  req: Request,
  requiredScopes: ApiKeyScope[] = []
): Promise<void> => {
  const token = getBearerToken(req);

  if (!isContextVaultApiKey(token)) {
    throw new ApiError(401, "Invalid API key");
  }

  const keyHash = hashApiKey(token);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: publicUserSelect
      }
    }
  });

  if (!apiKey || apiKey.revokedAt) {
    throw new ApiError(401, "Invalid or revoked API key");
  }

  const scopes = apiKeyService.parseScopes(apiKey.scopes);
  const missingScope = requiredScopes.find((scope) => !scopes.includes(scope));
  if (missingScope) {
    throw new ApiError(403, `API key is missing required scope: ${missingScope}`);
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  req.user = apiKey.user;
  req.authType = "apiKey";
  req.apiKey = {
    id: apiKey.id,
    scopes
  };
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authenticateJwt(req);
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token"));
  }
};

export const requireApiKey = (requiredScopes: ApiKeyScope[] = []) => async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authenticateApiKey(req, requiredScopes);
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid API key"));
  }
};

export const authenticateJwtOrApiKey = (requiredApiKeyScopes: ApiKeyScope[] = []) => async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = getBearerToken(req);
    if (isContextVaultApiKey(token)) {
      await authenticateApiKey(req, requiredApiKeyScopes);
    } else {
      await authenticateJwt(req);
    }
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Authentication failed"));
  }
};
