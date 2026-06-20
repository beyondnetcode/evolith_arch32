export const pingDef = {
  name: "evolith-ping",
  description: "Ping the Evolith Agent Sandbox to verify MCP connectivity",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

export async function pingHandler() {
  return {
    content: [
      {
        type: "text",
        text: "pong! Evolith Agent Sandbox is online and ready.",
      },
    ],
  };
}
