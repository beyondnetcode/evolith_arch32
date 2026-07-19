# ADR-0073: Contrato Unificado de Salida CLI/MCP y Schema de Evidencia de Gates

> **Navegación Bilingüe:** [English Version](./0073-unified-cli-output-contract.md)

## Estado

Accepted — Evolith Architecture Board, 2026-06-10. Cierra [GT-01](../../../control-center/gaps/gap-reference-catalog.es.md#gt-01).

## Fecha

2026-06-10

## Contexto y Problema

Dos documentos de diseño definen cómo la capa CLI/MCP de Evolith debe exponer resultados a consumidores máquina, y divergen:

- El documento del lado Core, [Interfaces Técnicas del SDLC Tracker](../../../sdlc/sdlc-tracker-technical-interfaces.es.md), especifica un payload estructurado `GateEvidence` (veredicto, violaciones, referencia y versión de ruleset) devuelto por la evaluación de gates.
- El análisis del lado Tracker (repositorio `evolith_tracker`, `tracker-smart-cli-gap-analysis.md`) especifica un envelope genérico de salida `{success, data, meta}` con códigos de error machine-readable, más flags globales (`--format`, `--dry-run`, flags de contexto) y la convención de comandos `evolith <verbo> <sustantivo>`.

Hoy el CLI no implementa ninguno de los dos contratos: `--format json` existe en algunos comandos pero emite JSON con forma de presentación, cada comando da forma a su propia salida, el binario se llama `evolith-cli`, y el Tracker no puede construirse hasta que exista un contrato autoritativo. Por el principio de Inmutabilidad Upstream, ese contrato debe ratificarse en Evolith Core — el Tracker lo hereda, nunca lo define.

## Objetivo y Alcance

**Objetivo:** ratificar un contrato único de salida que toda superficie machine-facing del CLI y servidor MCP de Evolith emita, para que el Tracker, los pipelines de CI y los agentes de IA parseen resultados de manera uniforme.

**En alcance:** el envelope JSON de salida; el schema `GateEvidence` como payload de evaluación de gates; el conjunto de flags globales; el registro de códigos de error; naming del binario y de los tools MCP; el modelo de ejecución command-as-a-service (invocación remota de operaciones registradas vía MCP/REST). **Fuera de alcance:** la implementación de la evaluación de gates ([GT-02](../../../control-center/gaps/gap-reference-catalog.es.md#gt-02)/[GT-03](../../../control-center/gaps/gap-reference-catalog.es.md#gt-03)), la selección de transporte ([GT-05](../../../control-center/gaps/gap-reference-catalog.es.md#gt-05)), la semántica de webhooks/eventos ([GT-14](../../../control-center/gaps/gap-reference-catalog.es.md#gt-14)), y el renderizado human-facing (table/markdown), que permanece libre.

## Opciones Consideradas

1. **Solo GateEvidence, sin envelope (doc del lado Core tal cual).** Las llamadas de gate quedan estructuradas pero el resto de comandos sigue ad-hoc; CI y agentes siguen necesitando parsers por comando. Rechazada: resuelve un comando, no el contrato.
2. **Solo envelope, sin payloads tipados (doc del lado Tracker tal cual).** Wrapper uniforme pero `data` queda sin schema; el Tracker re-validaría formas defensivamente. Rechazada: empuja la disciplina de schema aguas abajo, violando el principio ACL de que los datos no conformes se rechazan en la frontera.
3. **Contrato unificado: envelope envolviendo payloads tipados por schema (elegida).** El envelope del lado Tracker se vuelve el wrapper universal; el `GateEvidence` del lado Core se vuelve el primer payload `data` tipado, publicado como JSON Schema en `rulesets/schema/`.
4. **Status quo (JSON ad-hoc por comando).** Rechazada: bloquea el Tracker, contradice el requisito de "evidencia estructurada de gates" de la visión.

## Decisión y Justificación

Adoptar la **opción 3**. Toda salida machine-readable (`--format json` en el CLI; todo resultado de tool MCP) emite:

```json
{
  "success": true,
  "data": { },
  "meta": {
    "command": "evolith gate evaluate",
    "executedAt": "2026-06-10T00:00:00Z",
    "durationMs": 234,
    "correlationId": "uuid",
    "context": { "initiative": "opc", "tenant": "opc", "phase": "opc" }
  }
}
```

En fallo, `success: false` y un objeto `error` reemplaza a `data`:

```json
{ "success": false, "error": { "code": "GATE_BLOCKED", "message": "…", "details": { } }, "meta": { } }
```

**Elementos ratificados:**

1. **Envelope** como arriba. `meta.context` hace eco verbatim del contexto provisto por el caller — el CLI permanece stateless; `initiative`/`tenant` son valores opacos pass-through, nunca estado del CLI.
2. **`GateEvidence`** es el payload `data` de la evaluación de gates: `{ gateId, phase, verdict: passed|failed|skipped, rulesetRef, rulesetVersion, violations: [{ ruleId, severity: error|warning, location, message }], evaluatedAt, evaluatedBy: human|agent|ci }`. Publicado como `rulesets/schema/gate-evidence.schema.json` (entregable de GT-02). Los 27 rulesets ya tienen el campo `version` que `rulesetVersion` requiere (verificado 2026-06-10).
3. **Flags globales:** `--format <json|table|yaml|markdown>` en todo comando; `--dry-run` en todo comando de escritura; `--phase <discovery|design|construction|qa|release>` en comandos de alcance de gate. Los flags de contexto `--initiative` / `--tenant` se aceptan y se hacen eco, nunca se persisten.
4. **Registro inicial de códigos de error:** `GATE_BLOCKED`, `VALIDATION_FAILED`, `RULESET_NOT_FOUND`, `SCHEMA_INVALID`, `INVALID_PHASE`, `NOT_A_SATELLITE`, `IO_ERROR`, `INTERNAL_ERROR`. Los códigos son append-only; renombrar o reutilizar un código es un breaking change que exige un ADR que reemplace a este.
5. **Naming:** el paquete añade un alias de bin `evolith` junto a `evolith-cli` (que permanece por compatibilidad); la documentación y los ejemplos nuevos usan `evolith <verbo> <sustantivo>`. Los nombres de tools MCP espejan los comandos CLI unidos por guiones (`evolith-gate-evaluate` ↔ `evolith gate evaluate`).
6. **Modelo de ejecución Command-as-a-Service:** toda operación gobernada se implementa una sola vez como use case de capa application y se expone por tres adapters delgados — el comando CLI (terminal), un tool MCP (agentes de IA y el Tracker vía stdio/HTTP) y, donde el Tracker lo requiera, un endpoint REST. Un consumidor externo envía el comando por cualquier superficie, Evolith ejecuta por detrás el mismo use case, y devuelve el mismo envelope. Dos restricciones: (a) **sin ejecución arbitraria de comandos** — solo las operaciones explícitamente registradas son invocables remotamente (el registro es la lista de tools MCP; un endpoint genérico de "ejecutar cualquier string de shell/CLI" queda prohibido como superficie de inyección); (b) **paridad de superficies** — una operación invocable remotamente debe aceptar los mismos parámetros y devolver el mismo envelope que su forma CLI, de modo que el comportamiento se testea una sola vez.

**Justificación:** el envelope da al Tracker, CI y agentes un solo parser; los payloads tipados mantienen la frontera estricta (regla ACL: rechazar, no normalizar); el statelessness se preserva tratando el contexto como solo-eco; el naming converge en la marca del producto sin romper a los consumidores existentes de `evolith-cli`.

## Evidencias y Criterios de Evaluación

Criterios usados para juzgar las opciones: (a) el Tracker puede consumir resultados de gates sin parsing a medida; (b) el CLI permanece stateless según los [invariantes de interfaz del Tracker](../../../sdlc/sdlc-tracker-technical-interfaces.es.md); (c) cero breaking change para la salida human-facing actual; (d) implementable incrementalmente por comando.

Evidencia: ambos documentos de diseño fuente; estado de código verificado el 2026-06-10 — `--format json` es hoy solo-presentación, los 27 rulesets están versionados, `--dry-run` ya existe en 5 de 7 comandos de escritura (gap trazado como [GT-12](../../../control-center/gaps/gap-reference-catalog.es.md#gt-12)).

## Consecuencias, Riesgos y Trade-offs

**Positivas:** desbloquea el desarrollo del Tracker (GT-02/03/06 implementan contra un contrato ratificado); una sola suite de conformidad cubre todos los comandos; los códigos de error hacen determinista la lógica de retry/branch de los agentes.

**Negativas / riesgos:** doble nombre de bin (`evolith-cli` + `evolith`) hasta que una versión mayor retire uno; el envelope añade anidamiento que consumidores existentes del JSON ad-hoc (si los hay) deben adaptar — mitigado versionando el contrato en `meta` si la evolución lo exige; `meta.durationMs` y `correlationId` añaden costo menor de instrumentación por comando.

**Trade-off aceptado:** los flags de contexto como eco opaco (en vez de scoping de tenant validado) mantienen el CLI stateless pero difieren la validación de tenant enteramente al Tracker.

## Referencias

- [SDLC Tracker — Diseño Técnico de Interfaces](../../../sdlc/sdlc-tracker-technical-interfaces.es.md)
- Análisis del lado Tracker: `evolith_tracker/reference/specs/design/tracker-smart-cli-gap-analysis.md`
- [Especificación JSON Schema](https://json-schema.org/) (formato de schema de payloads)
- [Especificación MCP](https://modelcontextprotocol.io/) (framing de resultados de tools)

## Decisiones y Estándares Relacionados

- [ADR 0069: Implementación del Protocolo de Servidor MCP](./0069-ai-agent-context-protocol-integration.es.md) — transporte sobre el que viaja este contrato
- [ADR 0032: Matriz de Decisión de Protocolos API](./0032-api-protocol-decision-matrix-rest-grpc-graphql.es.md) — principios de selección de protocolo
- [Estándar de Autoría de ADRs](../adr-authoring-standard.es.md) — estructura de este ADR
- Ítems de gap: [GT-01](../../../control-center/gaps/gap-reference-catalog.es.md#gt-01) (esta decisión), GT-02/GT-03/GT-06 (implementación), GT-12 (completar `--dry-run`), GT-18 (publicación npm bajo el alias `evolith`)
- Rulesets: `rulesets/cli/core-parity.rules.json`, futuro `rulesets/schema/gate-evidence.schema.json`

---
[Volver al Registro de ADRs](../README.es.md)

> **Agent Signature:** Architect Agent
