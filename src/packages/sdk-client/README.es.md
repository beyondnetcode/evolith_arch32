# @evolith/sdk

Librería cliente tipada en TypeScript para la **API REST** de Evolith Core y sus
**herramientas MCP**. Es un envoltorio fino e inyectable por transporte: sin estado
global, sin configuración de red implícita, y cada método está completamente tipado
contra los contratos del servidor.

> Estado: **experimental**. El paquete se publica desde este monorepo pero todavía no
> está integrado en una aplicación de primera parte; existe para que consumidores
> externos (repos satélite, scripts de automatización, el Tracker BFF) puedan hablar
> con Evolith Core sin volver a derivar los DTOs a mano.

## Propósito

Evolith Core expone dos superficies:

- una **API REST** versionada servida por `apps/core-api` (versionado por URI bajo el
  prefijo `api/v`, por lo que las rutas reales son `/api/v1/<recurso>`);
- un conjunto de **herramientas MCP** servidas por `packages/mcp-server` sobre
  JSON-RPC `tools/call`.

Este SDK refleja los DTOs de los controladores (`apps/core-api/src/presentation/dtos`)
y los esquemas de entrada/salida de las herramientas MCP
(`packages/mcp-server/src/tools/*.tools.ts`) como tipos TypeScript escritos a mano, y
provee una clase cliente por superficie. Es el único punto de integración tipado para
que los consumidores no dupliquen las formas de las solicitudes.

## Consumidor previsto

- **Repositorios satélite** que ejecutan evaluaciones de compuertas / detección de
  drift contra una API de Evolith Core alojada.
- **Scripts de automatización y CI** que necesitan acceso tipado a las transiciones de
  fase.
- **El Tracker BFF**, que custodia el `workspaceRef` opaco y media las llamadas a Core
  en nombre de los usuarios finales.

Todos los cuerpos de solicitud reciben un `workspaceRef` opaco (emitido por el Tracker
BFF) en lugar de credenciales crudas, manteniendo el SDK solo como transporte.

## Cliente REST

`EvolithRestClient` es un envoltorio tipado sobre `fetch`. Cada método devuelve el
`SuccessEnvelope<T>` completo (`{ success, data, meta }`); las respuestas no-2xx lanzan
`EvolithApiError`.

| Método | Verbo / Ruta |
| --- | --- |
| `evaluateGate(gateId, body)` | `POST /api/v1/gates/:gateId/evaluate` |
| `evaluatePhaseGate(phase, body)` | resuelve fase → id de compuerta, luego `evaluateGate` |
| `transitionPhase(body)` | `POST /api/v1/phases/transition` |
| `listTopologies()` | `GET /api/v1/architecture/topologies` |
| `getTopology(id)` | `GET /api/v1/architecture/topologies/:id` |
| `validateSatellite(body)` | `POST /api/v1/architecture/validate-satellite` |
| `detectDrift(body)` | `POST /api/v1/architecture/detect-drift` |
| `invalidateTopologyCache()` | `POST /api/v1/architecture/cache/invalidate` |
| `initProject(body)` | `POST /api/v1/projects/initialize` |
| `proposeAdvance(body)` | `POST /api/v1/projects/propose-advance` |

Opciones del constructor: `baseUrl` (requerido), `apiKey` (token Bearer opcional),
`fetch` (implementación personalizada opcional), `timeoutMs` (por defecto `30_000`,
aplicado vía `AbortController`) y `apiPrefix` (por defecto `/api`).

```ts
import { EvolithRestClient } from '@evolith/sdk';

const client = new EvolithRestClient({ baseUrl: 'http://localhost:3000', apiKey: 'token' });
const result = await client.evaluatePhaseGate('discovery', { workspaceRef: 'op_abc123' });
console.log(result.data.passed);
```

## Cliente MCP

`EvolithMcpClient` es agnóstico al transporte: provee cualquier función que envíe una
solicitud `tools/call` y devuelva el arreglo de contenido crudo. Cada método convierte
la respuesta parseada al tipo de salida correcto y reporta `isError`.

| Método | Herramienta MCP |
| --- | --- |
| `evaluateGate(input)` | `evolith-gate-evaluate` |
| `validate(input)` | `evolith-validate` |
| `advancePhase(input)` | `evolith-phase-advance` |
| `listTopologies(input?)` | `evolith-topology-list` |
| `getTopology(input)` | `evolith-topology-get` |
| `call(toolName, input)` | despacho tipado genérico |

La fábrica `createJsonRpcTransport(sendRequest)` adapta cualquier emisor JSON-RPC a la
forma de transporte requerida.

```ts
import { EvolithMcpClient, createJsonRpcTransport } from '@evolith/sdk';

const mcp = new EvolithMcpClient({ transport: createJsonRpcTransport(myRpcFn) });
const gate = await mcp.evaluateGate({ phase: 'discovery', projectPath: '/repos/my-service' });
```

## Testing

Las pruebas unitarias viven en `src/__tests__/sdk.spec.ts` y nunca tocan la red: el
cliente REST se maneja con un `fetch` simulado y el cliente MCP con un transporte
simulado.

```bash
npm test            # ejecuta la suite de Jest
npm run test:cov    # ejecuta con cobertura (≥85% de cobertura de funciones en los clientes)
```
