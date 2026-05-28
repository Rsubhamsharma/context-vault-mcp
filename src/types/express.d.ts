import type { User } from "@prisma/client";
import type { ApiKeyScope } from "../modules/apiKeys/apiKey.schemas";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name" | "createdAt" | "updatedAt">;
      authType?: "jwt" | "apiKey";
      apiKey?: {
        id: string;
        scopes: ApiKeyScope[];
      };
      rawBody?: Buffer;
    }
  }
}
