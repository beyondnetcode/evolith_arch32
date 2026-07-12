# Evolith MCP Services

> **Navegación bilingüe:** [English Version](./README.md)

Evolith MCP Services expone la gobernanza de Evolith Core como contexto en tiempo real para LLMs y agentes autónomos a través del [Model Context Protocol](https://modelcontextprotocol.io). Se distribuye como el paquete independiente **`@beyondnet/evolith-mcp`** (binario `evolith-mcp`), que también puede arrancarse de forma programática desde otras superficies.

## Resumen

El servidor MCP convierte el corpus de referencia de Core, los rulesets y los phase gates en **tools**, **resources** y **prompts** gobernados que un agente puede invocar para recuperar contexto, evaluar criterios y enviar evidencia — bajo los mismos contratos que las superficies CLI y REST. El servidor vive en [`packages/mcp-server`](../../../src/packages/mcp-server) y se arranca con el binario `evolith-mcp`; ver su [README](../../../src/packages/mcp-server/README.es.md) para la referencia completa de tools/resources/prompts, el modelo de auth y la guía de despliegue.

> 📖 **Manual de uso — [Usando MCP](../../../reference/core/interfaces/using-the-mcp.md).** Guía legible y orientada a tareas de cada una de las 47 tools `evolith-*` — entradas, la compuerta de aprobación mutativa y ejemplos reales de llamada/respuesta. Parte del [hub de How-To de interfaces](../../../reference/core/interfaces/README.md) (CLI · MCP · REST) con catálogos por fase SDLC y playbooks.

## Superficie

La superficie instalable exacta se genera desde las fuentes del CLI y no debe mantenerse a mano — ver el [Inventario de Superficie del Producto](../smart-cli/product-inventory.es.md). En el release actual:

| Capacidad | Conteo | Ejemplos |
|---|:---:|---|
| **Tools** | 27 | `evolith-validate`, `evolith-composable-validate`, `evolith-gate-evaluate`, `evolith-architecture-validate`, `evolith-phase-advance`, `evolith-auto-fix`, `evolith-drift-detect`, `evolith-dora-metrics`, `evolith-metrics` |
| **Resources** | 9 | `evolith://rulesets`, `evolith://phase-gates`, `evolith://agents`, `evolith://core/version` |
| **Prompts** | 8 | `evolith/validate-repository`, `evolith/architecture-review`, `evolith/sdlc-handoff`, `evolith/moscow-prioritization` |

> Los conteos se verifican contra el [Inventario de Superficie del Producto](../smart-cli/product-inventory.es.md) generado y las fuentes del servidor MCP (`tools/*.tool.ts`, `resources.service.ts`, `prompts.service.ts`); no los edites a mano sin re-derivarlos desde esas fuentes.

### GT-312: Motor de Validación Composable

La tool `evolith-composable-validate` expone el motor de validación composable (GT-312) con 5 modos de validación:

| Modo | Descripción | Ejemplo |
|---|---|---|
| **SDLC** | Valida fases, gates, artifacts, blocking criteria | `evolith-composable-validate --phase discovery` |
| **Arquitectura** | Valida topología, límites hexagonales, aislamiento de dominio | `evolith-composable-validate --topology modular-monolith` |
| **Ruleset** | Valida rulesets específicos independientemente | `evolith-composable-validate --ruleset compliance-baseline` |
| **ADR** | Valida contra reglas específicas de ADR | `evolith-composable-validate --adr adr-0002` |
| **Ad-hoc** | Valida archivos individuales bajo demanda | `evolith-composable-validate --file src/domain/user.ts` |

> Las claves de fase SDLC son `discovery`, `design`, `construction`, `qa`, `release` (mapean a las fases f1–f5). El schema vivo de `evolith-composable-validate` también acepta aún los alias legacy `f1`–`f5` (marcados como deprecados); prefiere las claves canónicas.

El sistema es **inteligente y flexible** — los usuarios pueden combinar cualquier punto de entrada sin forzar un flujo específico.

## Transportes

| Transporte | Caso de uso |
|---|---|
| **stdio (JSON-RPC 2.0)** | Agentes locales e integraciones de editor lanzados vía `evolith-mcp serve` |
| **Streamable HTTP (SDK oficial MCP)** | Agentes y servicios remotos, con autenticación por API-key fail-closed |

## Instalación y prerrequisitos

- **Prerrequisito:** Node.js `>=20.0.0` (`engines.node` en `packages/mcp-server/package.json`). No requiere base de datos; las API keys HTTP se almacenan en memoria.
- **Instalación:**

```bash
# Desde el monorepo
npm install @beyondnet/evolith-mcp

# O globalmente (expone el binario evolith-mcp)
npm install -g @beyondnet/evolith-mcp
```

El binario es `evolith-mcp` (`bin` de `package.json`); los únicos subcomandos son `serve` y `version`.

## Ejecutar el servidor

```bash
# stdio (por defecto)
evolith-mcp serve

# Streamable HTTP (define EVOLITH_API_KEY para auth en producción)
evolith-mcp serve --transport http --port 3000
```

Flags del CLI: `--transport|-t stdio|http`, `--port|-p <n>` (default `3000`), `--api-key <key>`, `--allow-no-auth` (ignorado en producción). En producción la autenticación es obligatoria: el servidor la fuerza aunque se defina `--allow-no-auth` / `EVOLITH_MCP_ALLOW_NO_AUTH`.

## Variables de entorno

| Variable | Propósito | Default |
|---|---|---|
| `EVOLITH_API_KEY` | API key del transporte HTTP (Bearer o `x-api-key`); otorga contexto `admin` | (ninguno) |
| `JWT_SECRET` | Secret HS256 opcional; cuando está definido, un Bearer que no coincide con la key se valida como JWT y sus `roles` alimentan ABAC | (ninguno) |
| `EVOLITH_MCP_ALLOW_NO_AUTH` | Permite ejecutar HTTP sin auth solo en no-producción | `false` |
| `PORT` | Puerto de escucha HTTP (lo sobreescribe `--port`) | `3000` |
| `MCP_HTTP_HOST` | Host de bind HTTP | (default del SDK) |
| `NODE_ENV` | `production` activa auth fail-closed y resolución de policy ABAC fail-closed | `development` |
| `LOG_LEVEL` | Nivel de log de Pino (los logs siempre van a **stderr**) | `info` |
| `OTEL_ENABLED` | Activa el tracing OpenTelemetry | `false` |

La autenticación, los roles/códigos ABAC, el contrato de tools mutativas y la referencia completa por tool viven en el [README](../../../src/packages/mcp-server/README.es.md) del paquete.

## Registro de tools

El paquete ligero `@beyondnet/evolith-mcp-tools` fue retirado. El registro canónico vive ahora dentro del gateway standalone en [packages/mcp-server/src/tools](../../../src/packages/mcp-server/src/tools/tools.module.ts), donde los schemas de tools, chequeos ABAC, auditoría, resources, prompts y comportamiento de transporte se gobiernan juntos.

## Troubleshooting

| Síntoma | Causa / solución |
|---|---|
| stdio: logs mezclados con la respuesta MCP | Esperado — los logs van a **stderr**, stdout está reservado para el stream JSON-RPC. Lee stderr por separado. |
| HTTP `401 Unauthorized` | `EVOLITH_API_KEY` ausente/incorrecta, o un JWT inválido cuando `JWT_SECRET` está definido. |
| `ABAC-02: No roles present` | El principal autenticado no tiene roles; provee roles vía el claim `roles` del JWT, o usa la API key (contexto admin). |
| `OPA: policy.wasm not found` | `engine: "opa"` requiere `sdk/cli/rulesets/opa/policy.wasm` bajo `CORE_PATH`. Una policy ausente es **fail-closed en producción** (denegación dura, `ABAC_POLICY_MISSING`) y solo se abstiene en no-producción; usa `engine: "native"` para evitar OPA. |

## Conformidad

Initialize, discovery (tools/resources/prompts), métricas y evaluación de gates se verifican sobre ambos transportes por las suites MCP E2E y de smoke. Ver el [Catálogo de Capacidades MCP](../smart-cli/docs/planning/mcp-capability-catalog.md) para el desglose de esquemas por capacidad.

## Contribuir

Para clone/setup de desarrollo, comandos de test y convenciones de rama/commit, ver el [CONTRIBUTING.md](../../../CONTRIBUTING.md) en la raíz del repo. Para añadir una tool, ver la guía de extensión en el [README](../../../src/packages/mcp-server/README.es.md) del paquete.

---
[Volver al Índice de Productos](../README.md)
