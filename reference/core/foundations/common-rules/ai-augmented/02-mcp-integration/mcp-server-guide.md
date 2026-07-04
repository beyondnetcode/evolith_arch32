# MCP Server Guide: Exposing Corporate Capabilities

## When to build an MCP Server?
A corporate MCP Server should be built when specific business capabilities of our backend services need to be exposed to agentic ecosystems (either to accelerate internal development or empower user-facing features), guaranteeing that the same interface simultaneously serves multiple AI tools.

---

## Base Structure in Node.js (TypeScript)

Using the official `@modelcontextprotocol/sdk` SDK:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// 1. Instantiate Server
const server = new Server({
 name: "corporate-inventory-server",
 version: "1.0.0",
}, {
 capabilities: {
 tools: {}, // Exposing write/action capabilities
 },
});

// 2. Register Tool Catalog (ListTools)
server.setRequestHandler(ListToolsRequestSchema, async () => {
 return {
 tools: [
 {
 name: "inventory_query_stock",
 description: "Queries the available stock of a specific SKU in a specific warehouse.",
 inputSchema: {
 type: "object",
 properties: {
 sku: { type: "string", description: "Product unique identifier" },
 warehouseId: { type: "string", description: "Warehouse ID" }
 },
 required: ["sku"],
 },
 },
],
 };
});

// 3. Resolve tool execution (CallTool)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
 if (request.params.name === "inventory_query_stock") {
 const { sku } = request.params.arguments as { sku: string };
 // Internal call to your domain service or repository
 const stock = await fetchStockFromDatabase(sku); 
 return {
 content: [{ type: "text", text: JSON.stringify({ sku, availableStock: stock }) }],
 };
 }
 throw new Error("Tool not found");
});

// 4. Start transport (Usually stdio for local usage or CI)
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Equivalent Structure in .NET (C#)

Employing embedded MCP support in Semantic Kernel or the official .NET SDK:

```csharp
using Microsoft.ModelContextProtocol;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMCPServer("corporate-inventory-server")
 .AddTool("inventory_query_stock", "Queries the available stock of a specific SKU", async (string sku) => 
 {
 var stock = await myInventoryService.GetStockAsync(sku);
 return new ToolResult { Content = stock.ToString() };
 });

var app = builder.Build();
app.UseMCPServer(); // Expose via SSE (Server-Sent Events) over HTTP
app.Run();
```

---

## Corporate Naming Conventions

We adopt **`Snake_Case`** notation separated by hierarchical domain to prevent collisions among different company MCP Servers:

* **Correct:** `inventory_query`, `shipment_track`, `auth_revoke_token`.
* **Incorrect:** `query`, `trackShipment` (CamelCase not recommended in generic prompts), `doIt`.

## Production Ready MCP Server Checklist

An MCP Server is NOT production-fit if it lacks:
- [] **Host Authentication:** Strict transport validation (via Token or SSE Header).
- [] **Rate Limiting:** Protection against an agent in an infinite loop consuming the database in seconds.
- [] **Centralized Audit Log:** Every executed tool call must report Agent ID, invoked Tool, and Arguments.
- [] **Safe Error Handling:** If backend fails, return a useful message for AI without leaking Stack Traces or server secrets.

---
[Back to Index](./README.md)
