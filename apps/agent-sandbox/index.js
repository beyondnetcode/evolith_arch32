import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEvolithTools } from "@evolith/mcp-tools";

const server = new Server(
  {
    name: "evolith-agent-sandbox",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerEvolithTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Evolith Agent Sandbox (MCP) is running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
