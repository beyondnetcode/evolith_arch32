import { test } from "node:test";
import assert from "node:assert/strict";

import { pingDef, pingHandler } from "../tools/ping.js";
import { echoDef, echoHandler } from "../tools/echo.js";
import { readGapTrackingDef } from "../tools/read-gap-tracking.js";

test("each tool definition exposes a name, description, and inputSchema", () => {
  for (const def of [pingDef, echoDef, readGapTrackingDef]) {
    assert.equal(typeof def.name, "string");
    assert.ok(def.name.startsWith("evolith-"), `expected evolith- prefix: ${def.name}`);
    assert.equal(typeof def.description, "string");
    assert.equal(def.inputSchema.type, "object");
  }
});

test("tool names are unique", () => {
  const names = [pingDef.name, echoDef.name, readGapTrackingDef.name];
  assert.equal(new Set(names).size, names.length);
});

test("ping handler returns a pong text payload", async () => {
  const result = await pingHandler();
  assert.match(result.content[0].text, /pong/i);
});

test("echo handler echoes the provided message", async () => {
  const result = await echoHandler({ message: "hello-evolith" });
  assert.match(result.content[0].text, /hello-evolith/);
});

test("registry exposes registerEvolithTools as a function", async () => {
  const mod = await import("../registry.js");
  assert.equal(typeof mod.registerEvolithTools, "function");
});

test("registry wires ListTools and CallTool handlers and routes by name", async () => {
  const { registerEvolithTools } = await import("../registry.js");

  // Minimal fake MCP server capturing registered handlers by schema.
  const registered = new Map();
  const fakeServer = {
    setRequestHandler(schema, handler) {
      registered.set(schema, handler);
    },
  };

  registerEvolithTools(fakeServer);
  assert.equal(registered.size, 2, "expected ListTools + CallTool handlers");

  const [listHandler, callHandler] = [...registered.values()];

  const list = await listHandler();
  assert.ok(Array.isArray(list.tools) && list.tools.length === 3);

  const echoed = await callHandler({ params: { name: "evolith-echo", arguments: { message: "x" } } });
  assert.match(echoed.content[0].text, /x/);

  await assert.rejects(
    () => callHandler({ params: { name: "does-not-exist", arguments: {} } }),
    /Tool not found/,
  );
});
