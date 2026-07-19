# ADR-0079: Corpus de Referencia Multi-Topología y Contrato de Manifiesto Topológico

> **Navegación Bilingüe:** [English](./0079-multi-topology-reference-corpus.md)

## Estado

Accepted — Evolith Architecture Board, 2026-06-18.

## Fecha

2026-06-18

## Contexto y Problema

Evolith Core está evolucionando desde un corpus estático de referencia de arquitectura progresiva hacia un framework de gobernanza arquitectónica ejecutable. El corpus existente ya gobierna el eje progresivo desde monolito modular hacia módulos distribuidos y microservicios mediante ADRs, rulesets, validación CLI, herramientas MCP y Service CORE API.

La nueva dirección estratégica exige que Evolith Core gobierne familias arquitectónicas adicionales: cloud-native serverless, sistemas event-driven, data mesh, edge computing y arquitecturas agénticas o AI-first. Tratar estas familias como una lista plana de etapas mutuamente excluyentes sería incorrecto. Un producto puede combinar múltiples dimensiones topológicas, por ejemplo monolito modular más integración event-driven, o microservicios más data mesh más agentic AI.

Sin un modelo topológico controlado, el repositorio corre el riesgo de duplicar ADRs, crear implementaciones paralelas de CLI o MCP por topología, romper la taxonomía de raíz y perder la Paridad de Dos Motores entre reglas Native y políticas OPA/Rego.

## Objetivo y Alcance

**Objetivo:** definir la taxonomía autoritativa, el contrato de manifiesto y el modelo de exposición ejecutable para un Corpus de Referencia Multi-Topología en Evolith Core.

**En alcance:**

- clasificación de topologías como modelo dimensional;
- ubicaciones canónicas para documentación topológica y reglas ejecutables;
- `topology.manifest.json` como contrato vinculante de cada perfil topológico;
- preservación de F1/F2/F3 como modelo de compatibilidad del progressive-axis;
- exposición mediante el plano de control existente de CLI, MCP y Service CORE API;
- paridad obligatoria Native y OPA/Rego para reglas de validación topológica.

**Fuera de alcance:**

- implementar todos los perfiles topológicos en este ADR;
- definir reglas detalladas para serverless, event-driven, data mesh, edge computing o agentic AI;
- cambiar la taxonomía raíz del repositorio para permitir `/topologies/`;
- agregar datos de negocio, timing, ROI, costos, staffing o priorización a los artefactos Core.

## Opciones Consideradas

1. **Directorio `/topologies/` en raíz.** Rechazado por ahora. Entra en conflicto con la taxonomía actual de raíz lean y corpus de referencia salvo que un ADR reemplazante modifique esa política.
2. **Carpetas topológicas planas bajo `reference/core/architecture/topologies/`.** Rechazado. Implica incorrectamente que serverless, event-driven, data mesh, edge computing y agentic AI son alternativas mutuamente excluyentes.
3. **CLI, servidor MCP o Core API separados por topología.** Rechazado. Duplica superficies operativas y viola el modelo unificado command-as-a-service ratificado por ADR-0073 y ADR-0074.
4. **Corpus topológico dimensional con resolución por manifiesto.** Seleccionado. Preserva la taxonomía del repositorio, modela dimensiones arquitectónicas combinables y permite que un solo plano de control cargue contexto y reglas por topología.

## Decisión y Rationale

Adoptar un **Corpus de Referencia Multi-Topología dimensional y orientado por manifiestos**.

El corpus canónico legible por humanos vivirá bajo:

```text
reference/core/architecture/topologies/
  progressive-axis/
  execution/
  integration/
  data/
  ai/
```

Las reglas topológicas ejecutables canónicas vivirán bajo:

```text
rulesets/topologies/
  progressive-axis/
  execution/
  integration/
  data/
  ai/
```

Cada perfil topológico debe proveer un `topology.manifest.json` que declare su identificador, dimensión, estado, ADRs y rulesets Core heredados, ADRs específicos de topología, rulesets Native, políticas OPA/Rego, recursos MCP, herramientas MCP, validadores CLI, scaffolds opcionales y contratos UMS relevantes.

F1, F2 y F3 siguen siendo válidos como el **modelo de compatibilidad progressive-axis**:

```text
F1 -> modular-monolith
F2 -> distributed-modules
F3 -> microservices
```

CLI, MCP y Service CORE API permanecen como un único plano de control operativo. Deben resolver comportamiento topológico mediante el catálogo topológico y resolver de manifiestos compartidos de Core Domain. Ninguna topología puede introducir un CLI separado, servidor MCP separado o Core API separado.

Las reglas de validación topológica deben preservar la Paridad de Dos Motores: cada nueva regla topológica ejecutable debe tener cobertura de ruleset JSON nativo y cobertura equivalente de política OPA/Rego.

Los artefactos topológicos de Core deben seguir siendo técnicos. Evolith Tracker permanece como owner de timing de negocio, ownership, priorización, ROI, costos y decisiones de Funnel 0.

## Evidencia y Criterios de Evaluación

La opción seleccionada se evaluó contra:

1. **Seguridad de taxonomía del repositorio:** no crea nuevos directorios de contenido en raíz.
2. **Componibilidad:** permite que productos combinen dimensiones topológicas.
3. **Simplicidad operativa:** mantiene CLI, MCP y Service CORE API unificados.
4. **Aplicabilidad machine-readable:** soporta validación de manifiestos, reglas Native y paridad OPA/Rego.
5. **Usabilidad IA:** expone contexto topológico mediante recursos, herramientas y prompts MCP.
6. **Compatibilidad retroactiva:** preserva la semántica existente de validación arquitectónica F1/F2/F3.

Evidencia usada:

- rulesets F1/F2/F3 existentes bajo `rulesets/architecture/`;
- política OPA de arquitectura existente bajo `rulesets/opa/architecture.rego`;
- restricciones de taxonomía raíz de ADR-0048 y ADR-0070;
- contrato unificado de salida CLI/MCP de ADR-0073;
- capa de exposición Service CORE API de ADR-0074;
- conceptos MCP de recursos, herramientas, prompts y capacidades de servidor.

## Consecuencias, Riesgos y Trade-offs

**Consecuencias positivas:**

- Evolith Core puede gobernar múltiples familias arquitectónicas modernas sin fragmentar el repositorio.
- Los agentes IA pueden solicitar contexto arquitectónico acotado por topología antes de escribir código.
- El CLI y Service CORE API pueden validar reglas específicas de topología mediante el mismo modelo de dominio.
- F1/F2/F3 permanecen compatibles mientras se incorporan a un modelo topológico más amplio.

**Riesgos:**

- El schema de manifiesto topológico se convierte en un contrato crítico y debe versionarse con cuidado.
- La Paridad de Dos Motores aumenta el trabajo de implementación para cada nueva regla topológica.
- Las herramientas existentes que solo conocen `--arch-level` requieren un mapping de compatibilidad durante la migración.

**Trade-off aceptado:** la implementación inicial usará `reference/core/architecture/topologies/` y `rulesets/topologies/` en lugar de `/topologies/` raíz para preservar la taxonomía actual del repositorio. Un ADR futuro puede reconsiderar la ubicación en raíz solo si el valor de gobernanza supera el costo taxonómico.

## Referencias

- [Especificación Model Context Protocol](https://modelcontextprotocol.io/)
- [Política de Taxonomía y Estructura del Repositorio](../../../control-center/taxonomy/repository-taxonomy.md)
- [Plan de Implementación del Corpus de Referencia Multi-Topología](../../../control-center/audits/multi-topology-reference-corpus-implementation-plan.es.md)
- [Tablero de Seguimiento de Gaps](../../../control-center/gaps/gap-tracking.es.md)

## Decisiones y Estándares Relacionados

- [ADR-0041: Evaluación de Políticas Dual-Engine](./0041-dual-engine-policy-evaluation.es.md)
- [ADR-0047: Framework de Evolución de Arquitectura Progresiva](./0047-architectural-patterns-monolith-soa-microservices.es.md)
- [ADR-0048: Taxonomía Empresarial y Layout de Referencia](./0048-enterprise-taxonomy-reference-layout.es.md)
- [ADR-0070: Taxonomía de Raíz Lean del Repositorio](./0070-lean-root-repository-taxonomy.es.md)
- [ADR-0073: Contrato Unificado de Salida CLI/MCP](./0073-unified-cli-output-contract.es.md)
- [ADR-0074: Capa de Exposición Nativa del Evolith Core API](./0074-evolith-core-api-exposure-layer.es.md)
- [ADR-0078: Gobernanza de Separación Financiera de Dominios](./0078-domain-financial-separation-governance.es.md)

---
[Volver al Registro ADR](../README.es.md)

> **Agent Signature:** Architect Agent
