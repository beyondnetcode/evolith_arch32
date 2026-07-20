> **Navegación bilingüe:** [See English version](./0102-evolith-agent-runtime.md)

# ADR-0102: Evolith Agent Runtime como capa agéntica desacoplada

> **Firma del Agente:** Architect Agent (Winston)

## Status
Accepted (2026-06-29 — Architecture Board)

## Date
2026-06-29

## Context and Problem

Evolith Core es un motor de evaluación sin estado y determinístico, gobernado por
contratos, rulesets, OPA y `.harness` ([ADR-0101](./0101-core-stateless-evaluation-engine.es.md)).
Crece la necesidad de *operar* el Core de forma agéntica: conversar, planificar,
recordar, programar y ejecutar capacidades gobernadas en nombre de quien llama
(normalmente Evolith Tracker). El riesgo es que una capa agéntica, sobre todo si
se construye directamente sobre un framework concreto (p. ej. Hermes Agent),
acople el Core determinístico a una tecnología de runtime volátil, o crezca hasta
convertirse en un ejecutor paralelo que esquive `.harness` y su gobernanza.

El problema: cómo añadir una capa agéntica de operación que pueda usar Hermes
hoy, otro framework mañana o un motor propio después, **sin** convertir a ninguno
en dependencia del Core y **sin** desplazar a `.harness` como ejecutor oficial
gobernado.

## Objective and Scope

Definir e implementar una primera versión del **Evolith Agent Runtime**: una capa
agéntica desacoplada que opere el Core mediante puertos, integrándose con
`.harness`, el contrato de evaluación del Core, OPA/rulesets y (opcionalmente)
Tracker. En alcance: el contrato del runtime, el catálogo de puertos, los
adaptadores por defecto y reales, el manifest de capacidades de `.harness` y la
trazabilidad. Fuera de alcance: persistir el estado tenant/producto/iniciativa
(eso es de Tracker) y entregar un cliente Hermes de producción (sigue siendo un
adaptador opcional).

## Options Considered

### Option A: Embed agent logic into .harness

Extender `.harness` con conversación/memoria/planificación. Rechazada: sobrecarga
a un ejecutor determinístico con preocupaciones agénticas con estado, acopla la
gobernanza al comportamiento del agente y dificulta auditar `.harness`.

### Option B: Depend on Hermes directly in the runtime

Construir el runtime sobre el SDK de Hermes. Rechazada: convierte a un framework
concreto en dependencia dura, contamina el grafo de dependencias y bloquea
intercambiar motores o ejecutar sin motor instalado.

### Option C: capa agéntica de Puertos y Adaptadores (elegida)

Un nuevo paquete hexagonal (`@beyondnet/evolith-agent-runtime`) que depende solo de
puertos. `.harness`, el Core, OPA, Tracker y cualquier motor son adaptadores.
Elegida porque satisface todas las reglas de diseño y deja intactos el Core y
`.harness`.

## Decision and Rationale

### 1. The runtime is a ports-only orchestrator

`AgentRuntimeService` depende exclusivamente de interfaces (`IHarnessPort`,
`ICoreEvaluationPort`, `IPolicyValidationPort`, `ITrackerTracePort`,
`IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`). Toda la
tecnología concreta vive en adaptadores.

### 2. .harness is a capability provider, not replaced

`.harness` sigue siendo el ejecutor oficial, versionado y gobernado. El runtime
descubre sus capacidades desde `.harness/manifest.yaml` y las ejecuta vía
`IHarnessPort`. Nunca reimplementa `.harness`.

### 3. Hermes is an optional engine adapter

Hermes (o cualquier LLM/framework) vive detrás de `IAgentEnginePort` en
`HermesAgentAdapter`, importado de forma perezosa para que el paquete compile y
corra con Hermes no instalado. El Core y el dominio del runtime nunca importan
Hermes.

### 4. Governance is uniform and unskippable

Cada capacidad declara su postura (permisos, aprobación, traza, política). El
runtime aplica aprobación (HITL), política de OPA y trazabilidad de forma
uniforme. El runtime puede proponer, ejecutar tools autorizadas y recomendar,
pero no puede saltarse gates ni reescribir reglas.

### 5. Ejecución Basada en Eventos (SSE)

El runtime soporta Streaming Basado en Eventos a través de Server-Sent Events (SSE). En lugar de bloquearse en una ejecución síncrona, el orquestador del runtime retorna un `AsyncGenerator` cediendo eventos intermedios en tiempo real (ej. selección de herramientas, aprobaciones de humanos en el bucle, fragmentos de ejecución de harness). La API (`agent-runtime-api`) adapta este generador a un Observable de RxJS para empujar los estados en tiempo real a los clientes.

## Evidence and Evaluation Criteria

La implementación ([`src/packages/agent-runtime`](../../../../../src/packages/agent-runtime/README.es.md))
satisface los criterios de aceptación, verificados con build + pruebas:

- El Core no está acoplado a Hermes (confirmado por grep: sin import de Hermes
  fuera del adaptador; dominio/aplicación usan solo imports de tipo del contrato
  canónico).
- Los puertos respaldan toda integración externa; `.harness` es el proveedor de
  capacidades.
- El runtime corre extremo a extremo con adaptadores stub (16 pruebas en verde
  más un ejemplo ejecutable) y cambia a adaptadores reales de `.harness`/OPA/HTTP
  sin cambios de código.
- La trazabilidad se emite en cada ejecución gobernada con procedencia explícita
  (`executedBy`/`validatedBy`/`governedBy`/`policyEngine`).

## Consequences, Risks, and Trade-offs

Positivo: independencia tecnológica, testabilidad y una separación limpia entre
decidir (runtime), ejecutar (`.harness`), gobernar (Core) y política (OPA).
Negativo/compensaciones: una capa de indirección extra; el adaptador del Core por
defecto es un stub (el adaptador en proceso/REST de producción es un próximo paso
documentado); el scheduling durable y un cliente Hermes real son extensiones
futuras. Riesgo: deriva entre skills y manifest, mitigada manteniendo el manifest
versionado y el catálogo de skills explícito.

## References

- [Documentación de arquitectura del Agent Runtime](../../../../../src/packages/agent-runtime/README.es.md)
- [`.harness/manifest.yaml`](../../../../../.harness/manifest.yaml)
- [`src/packages/agent-runtime`](../../../../../src/packages/agent-runtime/README.es.md)

## Related Decisions and Standards

- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — motor de evaluación
  del Core sin estado (el contrato que consume el runtime).
- [ADR-0100](./0100-governance-execution-boundary-product-initiative.es.md) —
  frontera gobernanza vs ejecución.
- Reglas de diseño 1–8 del brief del Agent Runtime (independencia tecnológica,
  sin Hermes en el Core, adaptadores para toda integración, `.harness` como
  proveedor de capacidades).
