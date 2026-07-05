# MCP Client Guide: Consuming MCP in Applications

## Introduction
An **MCP Client** is the software component responsible for connecting to one or multiple MCP Servers, orchestrating sessions, reading the tool/resource catalog, and exposing them to your application logic or LLM context window.

## Client Use Cases
1. **In the IDE (Local Use):** Tools like Claude Desktop, Cursor, or the Claude CLI act as native clients. They are configured by editing the host's `mcp-config.json` file.
2. **In your own Backend (Programmatic Use):** Your NestJS or .NET application acts as a client connecting to remote MCP Servers exposed by other company departments.

## Consumption Example in Node.js (TypeScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runClient() {
 // Configure transport to a Local Server
 const transport = new StdioClientTransport({
 command: "node",
 args: ["/path/to/mcp-server.js"]
 });

 const client = new Client({
 name: "my-agent-app",
 version: "1.0.0"
 }, {
 capabilities: {}
 });

 // Connect
 await client.connect(transport);

 // 1. List Available Tools
 const tools = await client.listTools();
 console.log("Tools available on this MCP Server:", tools);

 // 2. Execute a Tool
 const result = await client.callTool({
 name: "inventory_query_stock",
 arguments: { sku: "ABC-123" }
 });

 console.log("Tool Result:", result);
}
```

## LLM Orchestration
The canonical way to use an MCP client is taking the array returned by `client.listTools()`, mapping it to the JSON Schema format accepted by your LLM provider (OpenAI `tools`, Anthropic `tools`), and injecting it into the model call. When the model decides to invoke one, your code captures the name and arguments and executes `client.callTool()`.

---
[Back to Index](./README.md)
