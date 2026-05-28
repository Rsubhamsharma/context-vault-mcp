export class McpToolError extends Error {
  public readonly code: "env" | "network" | "unauthorized" | "not_found" | "api" | "unknown";

  constructor(message: string, code: McpToolError["code"] = "unknown") {
    super(message);
    this.name = "McpToolError";
    this.code = code;
  }
}

export const toSafeErrorMessage = (error: unknown): string => {
  if (error instanceof McpToolError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Context Vault MCP request failed";
};
