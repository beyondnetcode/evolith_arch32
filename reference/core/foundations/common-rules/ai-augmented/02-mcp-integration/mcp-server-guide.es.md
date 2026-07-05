# MCP Server Guide: Exposing Corporate Capabilities


---

## When to build an MCP Server?
Se debe crear un servidor MCP corporativo cuando las capacidades comerciales específicas de nuestros servicios backend deben exponerse a ecosistemas agentes (ya sea para acelerar el desarrollo interno o potenciar las funciones orientadas al usuario), garantizando que la misma interfaz sirva simultáneamente para múltiples herramientas de IA.

---
## Base Structure in Node.js (TypeScript)
Usando el SDK oficial `@modelcontextprotocol/sdk`:```typescript
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
Emplear soporte MCP integrado en Semantic Kernel o el SDK oficial de .NET:```csharp
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
Adoptamos la notación **`Snake_Case`** separada por dominio jerárquico para evitar colisiones entre diferentes servidores MCP de la empresa:

* **Correcto:** `inventory_query`, `shipment_track`, `auth_revoke_token`.
* **Incorrecto:** `query`, `trackShipment` (no se recomienda CamelCase en mensajes genéricos), `doIt`.
## Production Ready MCP Server Checklist
Un servidor MCP NO es apto para producción si carece de:
- [] **Autenticación de host:** Validación de transporte estricta (mediante token o encabezado SSE).
- [] **Limitación de velocidad:** Protección contra un agente en un bucle infinito que consume la base de datos en segundos.
- [] **Registro de auditoría centralizado:** Cada llamada de herramienta ejecutada debe informar el ID del agente, la herramienta invocada y los argumentos.
- [] **Manejo seguro de errores:** Si el backend falla, devuelve un mensaje útil para la IA sin filtrar Stack Traces ni secretos del servidor.

---
[Volver al índice](./README.md)