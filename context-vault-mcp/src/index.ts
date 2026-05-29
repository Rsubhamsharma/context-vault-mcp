#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ContextVaultClient } from "./lib/contextVaultClient.js";
import { registerAfterTaskContextCapturePrompt } from "./prompts/afterTaskContextCapture.prompt.js";
import { registerContinueWithContextPrompt } from "./prompts/continueWithContext.prompt.js";
import { registerContextCreateSuggestionTool } from "./tools/contextCreateSuggestion.tool.js";
import { registerContextAutoCaptureTool } from "./tools/contextAutoCapture.tool.js";
import { registerContextCaptureTool } from "./tools/contextCapture.tool.js";
import { registerContextHealthCheckTool } from "./tools/contextHealthCheck.tool.js";
import { registerContextImportGitTool } from "./tools/contextImportGit.tool.js";
import { registerContextLoadTool } from "./tools/contextLoad.tool.js";
import { registerContextLoadVersionTool } from "./tools/contextLoadVersion.tool.js";
import { registerContextSearchTool } from "./tools/contextSearch.tool.js";
import { registerContextSmartTool } from "./tools/contextSmart.tool.js";
import { registerContextVersionsTool } from "./tools/contextVersions.tool.js";
import { registerGitHubConnectUrlTool } from "./tools/githubConnectUrl.tool.js";

const server = new McpServer({
  name: "context-vault-mcp",
  version: "0.1.0"
});

const client = new ContextVaultClient();

registerContextHealthCheckTool(server, client);
registerContextLoadTool(server, client);
registerContextLoadVersionTool(server, client);
registerContextVersionsTool(server, client);
registerContextCreateSuggestionTool(server, client);
registerContextAutoCaptureTool(server, client);
registerContextCaptureTool(server, client);
registerContextImportGitTool(server, client);
registerContextSearchTool(server, client);
registerContextSmartTool(server, client);
registerGitHubConnectUrlTool(server, client);
registerContinueWithContextPrompt(server);
registerAfterTaskContextCapturePrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
