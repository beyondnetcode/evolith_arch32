# C4 Nivel 4: Módulos del Core Domain

> **Navegación Bilingüe:** [Ver Versión en Inglés](./core-domain-modules.md)

**Estado:** Aprobado  
**Nivel:** 4 - Código / Módulos  
**Padre:** [C4 Nivel 4: Hub de Código y Módulos](./README.es.md)

## 1. Contexto del Módulo de Dominio

El Evolith Core Domain es donde residen los contratos ejecutables de gobernanza y la lógica stateless de evaluación arquitectónica. Consiste en módulos TypeScript de dominio/aplicación/evaluación (`@beyondnet/evolith-core-domain`), rulesets JSON que declaran la intención arquitectónica, esquemas JSON que validan payloads y artefactos de política OPA Rego/WASM.

## 2. Mapa de Organización de Código

```text
evolith/
├── packages/core-domain/           # La Librería de Dominio Base
│   ├── src/domain/                 # Entidades puras, value objects, eventos, puertos y autoridad tenant
│   │   ├── gate-evidence.ts        # Modelos de evidencia y contexto de ejecución
│   │   ├── gates/decision/         # Modelo de recomendación no vinculante de gate del Core
│   │   ├── phases/transition/      # Modelo de transición de fase y reglas de estado
│   │   ├── providers/              # Puertos de provider
│   │   └── tenancy/                # Guardrails de autoridad tenant
│   ├── src/application/            # Casos de uso, servicios, validators, generators y sync flows
│   │   ├── use-cases/              # Flujos validate/evaluate/sync/init/propose
│   │   ├── validators/             # Evaluadores native + OPA y modos de validación
│   │   └── services/               # Gate registry, topology catalog y servicios de proyecto
│   ├── src/evaluation/             # Orquestador canónico EvaluationContext/EvaluationResult
│   ├── src/evidence/               # Soporte de evidence graph
│   └── src/schemas/                # Helpers runtime de schema
│
├── rulesets/                       # La Fuente de Verdad Física (Corpus)
│   ├── phase-gates/                # Rulesets Declarados
│   │   └── phase-gates.rules.json
│   ├── sdlc/                       # Workflow SDLC y rulesets de phase gates
│   │   └── phase-gates.rules.json
│   ├── schema/                     # Contratos para los Rulesets
│   │   ├── evaluation-context.schema.json
│   │   ├── evaluation-result.schema.json
│   │   ├── sdlc-gate.schema.json
│   │   ├── sdlc-phase.schema.json
│   │   └── rule-definition.schema.json
│   └── opa/                        # Políticas WASM
│       ├── phase-gates.rego        # Lógica de política Rego
│       └── policy.wasm             # WebAssembly compilado para ejecución en runtime
```

## 3. Relaciones Clave

1. **Paquete `core-domain`:** Utilizado universalmente por `apps/core-api`, `packages/agent-runtime`, `packages/mcp-server` y `sdk/cli`. Mantiene el wiring específico de NestJS/runtime fuera de los contratos de dominio.
2. **Evaluación canónica:** `src/evaluation/` define `EvaluationContext`, `EvaluationResult`, `EvaluationOrchestrator`, evaluadores kind y puertos compartidos por Core API, MCP y CLI.
3. **Paridad Native + OPA:** `src/application/validators/evaluators/` y `rulesets/opa/` proveen el camino dual-engine requerido por la gobernanza del repositorio.
4. **Contexto opaco:** Los identificadores tenant/product/initiative se aceptan solo como contexto temporal. Core puede reflejarlos en trazas/resultados, pero no posee autorización, persistencia tenant ni decisiones vinculantes de gate.

---
[Volver al Nivel 4: Hub de Código y Módulos](./README.es.md)
