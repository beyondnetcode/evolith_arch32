import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { pingDef, pingHandler } from "./tools/ping.js";
import { echoDef, echoHandler } from "./tools/echo.js";
import { readGapTrackingDef, readGapTrackingHandler } from "./tools/read-gap-tracking.js";

const tools = [pingDef, echoDef, readGapTrackingDef];

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
    const handler = handlers[request.params.name];
    if (!handler) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }
    return handler(request.params.arguments || {});
  });
}
