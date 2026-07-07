> **Navegación Bilingüe:** [View English version](./operational-budgets-runbook.md)

# Runbook de Presupuestos Operativos — Serverless y Edge

Los presupuestos operativos en `topology.manifest.json` (`spec.operationalBudgets`) son **envelopes arquitectónicos**, no planes financieros. Tracker sigue siendo dueño de las decisiones de `roi`, `cost` y `budget` según el `businessBoundary` del manifest. Este runbook describe cómo los operadores verifican que un satélite se mantiene dentro del envelope.

Este runbook es normativo para **serverless** y **edge-computing**; otras topologías pueden heredarlo cuando aplique.

## Qué significa cada presupuesto

| Campo | Significado | Señal de fallo |
|---|---|---|
| `latencyBudgetMs` | Presupuesto p99 de ejecución end-to-end | La latencia p99 supera el presupuesto en una ventana de 24h |
| `coldStartCeilingMs` | Cold-start máximo aceptable | El p95 de cold-start supera el techo en una ventana de 7 días |
| `costCeilingPerExecutionCents` | Techo arquitectónico por ejecución (centavos enteros) | El costo medio por ejecución supera el envelope en el período de facturación |

Si alguna señal se enciende, la decisión arquitectónica debe revisarse. Los valores no son SLOs vendidos al cliente — son la línea por encima de la cual la topología deja de pagarse a sí misma.

## Cómo medir

### Latencia
- Fuente: distributed tracing (spans de OpenTelemetry). Usa `service.name = <satélite>` y `topology.id = serverless|edge-computing` como filtros.
- Query: p99 de la duración del span raíz en una ventana móvil de 24h.
- Muestreo: al menos 1% del tráfico productivo, nunca menos de 1000 traces/día.

### Cold-start
- Fuente: métrica del runtime de la función (`aws.lambda.init_duration_ms`, `gcp.run.startup_latency`, equivalente para runtimes edge).
- Query: p95 a 7 días, particionado por versión del paquete desplegado.
- Nota: el techo se mide por paquete, no por evento de cold-start — un contenedor caliente que de vez en cuando arranca en frío es aceptable; un paquete cuyo p95 está por encima del techo no lo es.

### Costo
- Fuente: export de facturación del proveedor (CSV o dataset BigQuery) o un dashboard de costo curado.
- Query: `total_cost_cents / total_invocations` sobre el mes de facturación completo.
- Tolerancia: un 10% de cabecera es aceptable durante un único ciclo de facturación siempre que la tendencia revierta; dos ciclos consecutivos por encima del envelope obligan a revisar la arquitectura.

## Reporte

Un satélite que supere algún envelope debe:

1. Abrir un hallazgo en su tablero Tracker referenciando el gap relevante (GT-165) y la versión del manifest infringida.
2. Adjuntar la ventana de medición y la query cruda para que el hallazgo sea reproducible.
3. Proponer una remediación: devolver el satélite al envelope, documentar una excepción justificada (rara) o levantar un ADR proponiendo un envelope nuevo.

Una corrida de medición que se mantiene dentro de cada envelope produce una entrada de maturity-evidence. No se requiere hallazgo.

## Cuándo revisar el envelope

Los envelopes arquitectónicos son duraderos, no aspiracionales. Revisa solo cuando:

- Un runtime o plataforma nuevos cambian genuinamente el piso (p. ej. un runtime serverless trae cold-start sub-100ms por defecto).
- Dos o más satélites han producido evidencia sostenida de que el envelope es el corte equivocado.
- Un ADR sucesor formaliza el cambio.

No bajes un envelope solo porque un satélite no puede cumplirlo — ese satélite es la señal, no el envelope.

## Referencias

- [`topology-manifest.schema.json`](../../../../../src/rulesets/schema/topology-manifest.schema.json) — definición del schema de `operationalBudgets`.
- [ADR-0095 — Gobierno de Arquitectura Serverless](../../adrs/core/0095-serverless-architecture-governance.es.md).
- [ADR-0096 — Gobierno de Arquitectura Edge Computing](../../adrs/core/0096-edge-computing-architecture-governance.es.md).
- [GT-165](../../../control-center/gaps/gap-reference-catalog.es.md#gt-165) — Gap que estableció este runbook.
