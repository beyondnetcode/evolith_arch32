# Evolith MCP Services

> **Navegación bilingüe:** [English Version](./README.md)

Evolith MCP Services expone la gobernanza de Evolith Core como contexto en tiempo real para LLMs y agentes autónomos a través del [Model Context Protocol](https://modelcontextprotocol.io). Se distribuyen dentro del paquete `@evolith/smart-cli` — no hay instalación separada.

## Resumen

El servidor MCP convierte el corpus de referencia de Core, los rulesets y los phase gates en **tools**, **resources** y **prompts** gobernados que un agente puede invocar para recuperar contexto, evaluar criterios y enviar evidencia — bajo los mismos contratos que las superficies CLI y REST.

## Superficie

La superficie instalable exacta se genera desde las fuentes del CLI y no debe mantenerse a mano — ver el [Inventario de Superficie del Producto](../smart-cli/product-inventory.es.md). En el release actual:

| Capacidad | Conteo | Ejemplos |
|---|:---:|---|
| **Tools** | 21 | `evolith-validate`, `evolith-gate-evaluate`, `evolith-architecture-validate`, `evolith-phase-advance`, `evolith-metrics` |
| **Resources** | 7 | `evolith://rulesets`, `evolith://phase-gates`, `evolith://agents`, `evolith://core/version` |
| **Prompts** | 7 | `evolith/validate-repository`, `evolith/architecture-review`, `evolith/sdlc-handoff`, `evolith/moscow-prioritization` |

## Transportes

| Transporte | Caso de uso |
|---|---|
| **stdio (JSON-RPC 2.0)** | Agentes locales e integraciones de editor lanzados vía `smart-cli mcp-server` |
| **Streamable HTTP (SDK oficial MCP)** | Agentes y servicios remotos, con autenticación por API-key |

## Ejecutar el servidor

```bash
# stdio (por defecto)
smart-cli mcp-server

# Streamable HTTP
smart-cli mcp-server --http --port 3000
```

## Conformidad

Initialize, discovery (tools/resources/prompts), métricas y evaluación de gates se verifican sobre ambos transportes por las suites MCP E2E y de smoke. Ver el [Catálogo de Capacidades MCP](../smart-cli/docs/planning/mcp-capability-catalog.md) para el desglose de esquemas por capacidad.

---
[Volver al Índice de Productos](../README.md)
