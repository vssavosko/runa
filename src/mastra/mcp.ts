import { MCPClient } from "@mastra/mcp";

export const mcp = new MCPClient({
  servers: {
    playwright: {
      command: "pnpm",
      args: ["dlx", "@playwright/mcp@latest", "--headless"],
    },
  },
});
