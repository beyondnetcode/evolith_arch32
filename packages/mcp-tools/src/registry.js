import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { pingDef, pingHandler } from "./tools/ping.js";
import { echoDef, echoHandler } from "./tools/echo.js";
import { readGapTrackingDef, readGapTrackingHandler } from "./tools/read-gap-tracking.js";
import { validateInput } from "./validate-input.js";

const tools = [pingDef, echoDef, readGapTrackingDef];
const defsByName = Object.fromEntries(tools.map((def) => [def.name, def]));

const handlers = {
  "evolith-ping": pingHandler,
  "evolith-echo": echoHandler,
  "evolith-read-gap-tracking": readGapTrackingHandler,
};

export function registerEvolithTools(server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const handler = handlers[name];
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    // GT-352: validate arguments against the tool's declared inputSchema before
    // dispatching, so malformed/missing inputs fail clearly instead of reaching
    // the handler as undefined/wrong-typed values.
    const args = request.params.arguments || {};
    const def = defsByName[name];
    const errors = def ? validateInput(def.inputSchema, args) : [];
    if (errors.length > 0) {
      return {
        content: [
          { type: "text", text: `Invalid arguments for '${name}': ${errors.join("; ")}` },
        ],
        isError: true,
      };
    }

    return handler(args);
  });
}
