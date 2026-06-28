# @evolith/mcp-tools

Definiciones y handlers de herramientas Evolith reutilizables para un servidor
Model Context Protocol (MCP). El package expone un registry que cablea las
herramientas Evolith sobre cualquier instancia `server` de MCP.

## Tools

| Nombre | Descripción | Input |
| --- | --- | --- |
| `evolith-ping` | Chequeo de liveness. | _(ninguno)_ |
| `evolith-echo` | Devuelve un mensaje al agente. | `message: string` (requerido) |
| `evolith-read-gap-tracking` | Lee el board de gap-tracking y reporta gaps abiertos + progreso. | `rootDir?: string` |

Cada tool exporta un `<name>Def` (`name`, `description`, `inputSchema`) y un
`<name>Handler(args)`.

## Input validation

Cada request `CallTool` se valida contra el `inputSchema` de la herramienta
antes de ejecutar el handler (`validateInput`). Propiedades requeridas
faltantes, valores con tipo incorrecto o argumentos que no son objeto devuelven
un resultado MCP con `isError: true` y un mensaje descriptivo, en vez de llegar
al handler como `undefined`/tipos incorrectos.

## Usage

```js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerEvolithTools } from "@evolith/mcp-tools/registry.js";

const server = new Server({ name: "evolith", version: "1.0.0" }, { capabilities: { tools: {} } });
registerEvolithTools(server);
```

`registerEvolithTools(server)` registra los handlers `ListTools` y `CallTool`.
`evolith-read-gap-tracking` resuelve la raíz del repo desde `args.rootDir`,
luego `EVOLITH_REPO_ROOT`, luego `process.cwd()`.

## Testing

```bash
npm run --workspace packages/mcp-tools test
```

Los tests corren con el runner integrado de Node (`node --test`).

## Contribuir

Para añadir una tool: crea `src/tools/<name>.js` exportando `<name>Def` (`{ name, description, inputSchema }`) y `<name>Handler(args)`, y regístralos en [`src/registry.js`](./src/registry.js) (array `tools` + mapa `handlers`). Mantén el `inputSchema` exacto — `validateInput` rechaza los requests que no lo cumplen antes de ejecutar el handler. Añade un test en `src/__tests__/` y una fila en la tabla de Tools (EN + ES). Issues y pull requests son bienvenidos.

> Este paquete (`@evolith/mcp-tools`) contiene el registry de tools ligero y sin dependencias. El Gateway MCP completo en NestJS con las 27 tools de gobernanza, ABAC y transporte HTTP vive en [`@evolith/mcp-server`](../mcp-server/README.es.md).
