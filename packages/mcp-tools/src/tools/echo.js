export const echoDef = {
  name: "evolith-echo",
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
};

export async function echoHandler(args) {
  const { message } = args;
  return {
    content: [
      {
        type: "text",
        text: `Evolith Echo: ${message}`,
      },
    ],
  };
}
