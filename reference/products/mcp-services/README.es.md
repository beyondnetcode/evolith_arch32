# Evolith MCP Services

> **Navegación bilingüe:** [English Version](./README.md)

Evolith MCP Services expone la gobernanza de Evolith Core como contexto en tiempo real para LLMs y agentes autónomos a través del [Model Context Protocol](https://modelcontextprotocol.io). Se distribuyen dentro del paquete `@evolith/smart-cli` — no hay instalación separada.

## Resumen

El servidor MCP convierte el corpus de referencia de Core, los rulesets y los phase gates en **tools**, **resources** y **prompts** gobernados que un agente puede invocar para recuperar contexto, evaluar criterios y enviar evidencia — bajo los mismos contratos que las superficies CLI y REST.

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
| **SDLC** | Valida fases, gates, artifacts, blocking criteria | `evolith-composable-validate --phase f1` |
| **Arquitectura** | Valida topología, límites hexagonales, aislamiento de dominio | `evolith-composable-validate --topology modular-monolith` |
| **Ruleset** | Valida rulesets específicos independientemente | `evolith-composable-validate --ruleset compliance-baseline` |
| **ADR** | Valida contra reglas específicas de ADR | `evolith-composable-validate --adr adr-0002` |
| **Ad-hoc** | Valida archivos individuales bajo demanda | `evolith-composable-validate --file src/domain/user.ts` |

El sistema es **inteligente y flexible** — los usuarios pueden combinar cualquier punto de entrada sin forzar un flujo específico.

## Transportes

| Transporte | Caso de uso |
|---|---|
| **stdio (JSON-RPC 2.0)** | Agentes locales e integraciones de editor lanzados vía `smart-cli mcp serve` |
| **Streamable HTTP (SDK oficial MCP)** | Agentes y servicios remotos, con autenticación por API-key |

## Ejecutar el servidor

```bash
# stdio (por defecto)
smart-cli mcp serve

# Streamable HTTP
smart-cli mcp serve --transport http --port 3000
```

## Conformidad

Initialize, discovery (tools/resources/prompts), métricas y evaluación de gates se verifican sobre ambos transportes por las suites MCP E2E y de smoke. Ver el [Catálogo de Capacidades MCP](../smart-cli/docs/planning/mcp-capability-catalog.md) para el desglose de esquemas por capacidad.

---
[Volver al Índice de Productos](../README.md)
