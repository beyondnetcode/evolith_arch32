# @evolith/mcp-tools

Reusable Evolith tool definitions and handlers for a Model Context Protocol
(MCP) server. The package exposes a registry that wires Evolith tools onto any
MCP `server` instance.

## Tools

| Name | Description | Input |
| --- | --- | --- |
| `evolith-ping` | Liveness check. | _(none)_ |
| `evolith-echo` | Echo a message back to the agent. | `message: string` (required) |
| `evolith-read-gap-tracking` | Read the gap-tracking board and report open gaps + progress. | `rootDir?: string` |

Each tool exports a `<name>Def` (`name`, `description`, `inputSchema`) and a
`<name>Handler(args)`.

## Input validation

Every `CallTool` request is validated against the tool's `inputSchema` before
the handler runs (`validateInput`). Missing required properties, wrong-typed
values, or non-object arguments return an MCP result with `isError: true` and a
descriptive message instead of reaching the handler as `undefined`/wrong types.

## Usage

```js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerEvolithTools } from "@evolith/mcp-tools/registry.js";

const server = new Server({ name: "evolith", version: "1.0.0" }, { capabilities: { tools: {} } });
registerEvolithTools(server);
```

`registerEvolithTools(server)` registers the `ListTools` and `CallTool`
handlers. `evolith-read-gap-tracking` resolves the repo root from `args.rootDir`,
then `EVOLITH_REPO_ROOT`, then `process.cwd()`.

## Testing

```bash
npm run --workspace packages/mcp-tools test
```

Tests run with the Node built-in test runner (`node --test`).
