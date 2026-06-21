# Índice de Schemas

Definiciones de JSON Schema para validar los artefactos SDLC de Evolith.

| Schema | Propósito | Artefacto | Fase |
|---|---|---|---|
| [adr.schema.json](./adr.schema.json) | Validar la estructura y campos requeridos del ADR | ADR | Todas |
| [prd.schema.json](./prd.schema.json) | Validar la estructura y campos requeridos del PRD | PRD | 1 |
| [discovery-canvas.schema.json](./discovery-canvas.schema.json) | Validar el registro de iniciativas del Discovery Canvas | Discovery Canvas | 1 |
| [technical-feasibility.schema.json](./technical-feasibility.schema.json) | Validar la viabilidad técnica y los atributos de calidad (NFRs) | Technical Feasibility Canvas | 1 |
| [ballpark-estimation.schema.json](./ballpark-estimation.schema.json) | Validar el T-Shirt sizing y la estimación de equipo | Ballpark Estimation | 1 |
| [evolith-user-story.schema.json](./evolith-user-story.schema.json) | Validar la historia de usuario atómica con criterios BDD | User Story | 1 |
| [agile-backlog.schema.json](./agile-backlog.schema.json) | Validar el backlog priorizado por Épica/Iniciativa | Agile Backlog | 1 |
| [cli-impact-analysis.schema.json](./cli-impact-analysis.schema.json) | Validar los requisitos de capacidades del CLI | CLI Impact Analysis | 1-2 |
| [functional-story.schema.json](./functional-story.schema.json) | Validar el cumplimiento de la Historia Funcional | Historia Funcional | 2 |
| [technical-story.schema.json](./technical-story.schema.json) | Validar la estructura de la Historia Técnica | Historia Técnica | 3 |
| [test-summary-report.schema.json](./test-summary-report.schema.json) | Validar el Test Summary Report | Test Summary Report | 4 |
| [release-notes.schema.json](./release-notes.schema.json) | Validar la completitud de las Release Notes | Release Notes | 5 |
| [evolith-yaml.schema.json](./evolith-yaml.schema.json) | Validar el contrato evolith.yaml del satélite | Gobernanza de satélite | Todas |
| [topology-manifest.schema.json](./topology-manifest.schema.json) | Validar archivos topology.manifest.json para resolución del corpus Multi-Topology | Manifiesto topológico | Todas |
| [gate-evidence.schema.json](./gate-evidence.schema.json) | Validar la evidencia estructurada de evaluación de gates (core/ADR-0073) | Gate Evidence | Todas |
| [output-envelope.schema.json](./output-envelope.schema.json) | Validar el envelope universal de salida de máquina (core/ADR-0073) | Salida CLI/MCP/REST | Todas |
| [knowledge-intake.schema.json](./knowledge-intake.schema.json) | Validar candidatos de conocimiento externo gobernado | Candidato de ingesta de conocimiento | Todas |

**Cobertura de Fase 1:** 7 schemas (Discovery Canvas, Technical Feasibility Canvas, Ballpark Estimation, Evolith User Story, Agile Backlog, CLI Impact Analysis, PRD)

---

Volver al [Rulesets Hub](../README.es.md)
