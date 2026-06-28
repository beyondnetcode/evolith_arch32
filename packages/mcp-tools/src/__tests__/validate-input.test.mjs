import { test } from "node:test";
import assert from "node:assert/strict";

import { validateInput } from "../validate-input.js";
import { echoDef } from "../tools/echo.js";
import { registerEvolithTools } from "../registry.js";

test("accepts valid args matching the schema", () => {
  assert.deepEqual(validateInput(echoDef.inputSchema, { message: "hi" }), []);
});

test("flags a missing required property", () => {
  const errors = validateInput(echoDef.inputSchema, {});
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing required property: message/);
});

test("flags a wrong-typed property", () => {
  const errors = validateInput(echoDef.inputSchema, { message: 42 });
  assert.ok(errors.some((e) => /property 'message' must be of type string/.test(e)));
});

test("rejects non-object arguments", () => {
  assert.deepEqual(validateInput(echoDef.inputSchema, "nope"), ["arguments must be an object"]);
  assert.deepEqual(validateInput(echoDef.inputSchema, [1, 2]), ["arguments must be an object"]);
});

test("a schema with no declared shape validates trivially", () => {
  assert.deepEqual(validateInput({ type: "object", properties: {}, required: [] }, { any: 1 }), []);
});

test("CallTool returns isError for invalid arguments instead of dispatching", async () => {
  const registered = new Map();
  registerEvolithTools({ setRequestHandler: (schema, h) => registered.set(schema, h) });
  const [, callHandler] = [...registered.values()];

  const result = await callHandler({ params: { name: "evolith-echo", arguments: {} } });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Invalid arguments for 'evolith-echo'.*message/);
});

test("CallTool still dispatches when arguments are valid", async () => {
  const registered = new Map();
  registerEvolithTools({ setRequestHandler: (schema, h) => registered.set(schema, h) });
  const [, callHandler] = [...registered.values()];

  const result = await callHandler({ params: { name: "evolith-echo", arguments: { message: "ok" } } });
  assert.notEqual(result.isError, true);
  assert.match(result.content[0].text, /ok/);
});
