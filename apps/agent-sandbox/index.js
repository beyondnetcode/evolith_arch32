import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ping",
        description: "Ping the Evolith Agent Sandbox to verify MCP connectivity",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "echo",
        description: "Echo a message back to the agent",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "ping") {
    return {
      content: [
        {
          type: "text",
          text: "pong! Evolith Agent Sandbox is online and ready.",
        },
      ],
    };
  }

  if (request.params.name === "echo") {
    const { message } = request.params.arguments;
    return {
      content: [
        {
          type: "text",
          text: `Evolith Echo: ${message}`,
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Evolith Agent Sandbox (MCP) is running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
