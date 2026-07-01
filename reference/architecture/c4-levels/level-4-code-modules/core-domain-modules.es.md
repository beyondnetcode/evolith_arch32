# C4 Nivel 4: Módulos del Core Domain

> **Navegación Bilingüe:** [Ver Versión en Inglés](./core-domain-modules.md)

**Estado:** Aprobado  
**Nivel:** 4 - Código / Módulos  
**Padre:** [C4 Nivel 4: Hub de Código y Módulos](./README.es.md)

## 1. Contexto del Módulo de Dominio

El Evolith Core Domain es donde reside toda la lógica stateless de gobernanza arquitectónica. Consiste en los modelos TypeScript (`@evolith/core-domain`), los rulesets JSON que declaran la intención arquitectónica, los esquemas JSON que los validan y los archivos OPA Rego que los ejecutan.

## 2. Mapa de Organización de Código

```text
evolith/
├── packages/core-domain/           # La Librería de Dominio Base
│   ├── src/domain/                 # Entidades Puras y Value Objects
│   │   ├── gate-evidence.ts        # Modelos para envío de evidencia
│   │   ├── execution-context.ts    # Contexto opaco (tenant, producto, iniciativa)
│   │   └── gate-decision.ts        # Resultado de evaluación de Core (NO es el GateDecision de Tracker)
│   └── src/ports/                  # Interfaces de Salida (Puertos)
│       └── i-gate-evaluator.ts
│
├── rulesets/                       # La Fuente de Verdad Física (Corpus)
│   ├── phase-gates/                # Rulesets Declarados
│   │   └── phase-gates.rules.json
│   ├── schema/                     # Contratos para los Rulesets
│   │   ├── sdlc-gate.schema.json
│   │   ├── sdlc-phase.schema.json
│   │   └── rule-definition.schema.json
│   └── opa/                        # Políticas WASM
│       ├── phase-gates.rego        # Lógica de política Rego
│       └── policy.wasm             # WebAssembly compilado para ejecución en runtime
```

## 3. Relaciones Clave

1. **Paquete `core-domain`:** Utilizado universalmente por `apps/core-api`, `packages/agent-runtime` y `packages/smart-cli`. No contiene *ninguna* dependencia de framework (ni NestJS, ni Traefik).
2. **`phase-gates.rego`:** El archivo open-policy-agent evalúa las condiciones establecidas en `phase-gates.rules.json` en contra de la `gate-evidence` pasada en runtime.
3. **`execution-context.ts`:** Demuestra que el core es verdaderamente stateless. Maneja el `workspaceRef` e identificadores opacos, nunca persistiendo la lógica de tenant de forma interna.

---
[Volver al Nivel 4: Hub de Código y Módulos](./README.es.md)
