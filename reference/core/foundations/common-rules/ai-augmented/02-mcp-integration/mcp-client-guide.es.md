# MCP Client Guide: Consuming MCP in Applications


---

## Introduction
Un **Cliente MCP** es el componente de software responsable de conectarse a uno o varios servidores MCP, organizar sesiones, leer el catálogo de herramientas/recursos y exponerlos a la lógica de su aplicación o a la ventana de contexto de LLM.
## Client Use Cases
1. **En el IDE (uso local):** Herramientas como Claude Desktop, Cursor o Claude CLI actúan como clientes nativos. Se configuran editando el archivo `mcp-config.json` del host.
2. **En su propio backend (uso programático):** Su aplicación NestJS o .NET actúa como un cliente que se conecta a servidores MCP remotos expuestos por otros departamentos de la empresa.
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
La forma canónica de utilizar un cliente MCP es tomar la matriz devuelta por `client.listTools()`, asignarla al formato de esquema JSON aceptado por su proveedor de LLM (`herramientas` de OpenAI, `herramientas` de Anthropic) e inyectarlo en la llamada del modelo. Cuando el modelo decide invocar uno, su código captura el nombre y los argumentos y ejecuta `client.callTool()`.

---
[Volver al índice](./README.md)