# Schema Index

JSON Schema definitions for validating Evolith SDLC artifacts.

| Schema | Purpose | Artifact | Phase |
|---|---|---|---|
| [adr.schema.json](./adr.schema.json) | Validate ADR structure and required fields | ADR | All |
| [prd.schema.json](./prd.schema.json) | Validate PRD structure and required fields | PRD | 1 |
| [discovery-canvas.schema.json](./discovery-canvas.schema.json) | Validate Discovery Canvas initiative registration | Discovery Canvas | 1 |
| [technical-feasibility.schema.json](./technical-feasibility.schema.json) | Validate Technical Feasibility and quality attributes (NFRs) | Technical Feasibility Canvas | 1 |
| [ballpark-estimation.schema.json](./ballpark-estimation.schema.json) | Validate T-Shirt sizing and team estimation | Ballpark Estimation | 1 |
| [evolith-user-story.schema.json](./evolith-user-story.schema.json) | Validate atomic user story with BDD criteria | User Story | 1 |
| [agile-backlog.schema.json](./agile-backlog.schema.json) | Validate prioritized backlog for Epic/Initiative | Agile Backlog | 1 |
| [cli-impact-analysis.schema.json](./cli-impact-analysis.schema.json) | Validate CLI capability requirements | CLI Impact Analysis | 1-2 |
| [functional-story.schema.json](./functional-story.schema.json) | Validate Functional Story compliance | Functional Story | 2 |
| [technical-story.schema.json](./technical-story.schema.json) | Validate Technical Story structure | Technical Story | 3 |
| [test-summary-report.schema.json](./test-summary-report.schema.json) | Validate Test Summary Report | Test Summary Report | 4 |
| [release-notes.schema.json](./release-notes.schema.json) | Validate Release Notes completeness | Release Notes | 5 |
| [evolith-yaml.schema.json](./evolith-yaml.schema.json) | Validate satellite evolith.yaml contract | Satellite governance | All |
| [topology-manifest.schema.json](./topology-manifest.schema.json) | Validate topology.manifest.json files for Multi-Topology corpus resolution | Topology manifest | All |
| [gate-evidence.schema.json](./gate-evidence.schema.json) | Validate structured gate-evaluation evidence (core/ADR-0073) | Gate Evidence | All |
| [maturity-evidence.schema.json](./maturity-evidence.schema.json) | Validate maturity status evidence logs | Maturity Evidence | All |
| [output-envelope.schema.json](./output-envelope.schema.json) | Validate the universal machine output envelope (core/ADR-0073) | CLI/MCP/REST output | All |
| [knowledge-intake.schema.json](./knowledge-intake.schema.json) | Validate governed external knowledge candidates | Knowledge intake candidate | All |
| [governance.input.schema.json](../opa/schemas/governance.input.schema.json) | Validate governance OPA policy input structure | OPA Governance Input | All |
| [mcp.input.schema.json](../opa/schemas/mcp.input.schema.json) | Validate MCP OPA policy input structure | OPA MCP Input | All |
| [version-pinning.input.schema.json](../opa/schemas/version-pinning.input.schema.json) | Validate version pinning OPA policy input structure | OPA Version Pinning Input | All |
| [cli-readiness.input.schema.json](../opa/schemas/cli-readiness.input.schema.json) | Validate CLI readiness OPA policy input structure | OPA CLI Readiness Input | All |
| [knowledge-intake.input.schema.json](../opa/schemas/knowledge-intake.input.schema.json) | Validate knowledge intake OPA policy input structure | OPA Knowledge Intake Input | All |
| [taxonomy.input.schema.json](../opa/schemas/taxonomy.input.schema.json) | Validate taxonomy OPA policy input structure | OPA Taxonomy Input | All |
| [ci-cd.input.schema.json](../opa/schemas/ci-cd.input.schema.json) | Validate CI/CD OPA policy input structure | OPA CI/CD Input | All |
| [evidence.input.schema.json](../opa/schemas/evidence.input.schema.json) | Validate evidence OPA policy input structure | OPA Evidence Input | All |
| [abac-mcp-tool-access.input.schema.json](../opa/schemas/abac-mcp-tool-access.input.schema.json) | Validate ABAC tool access OPA policy input structure | OPA ABAC Tool Access Input | All |

**Phase 1 Coverage:** 7 schemas (Discovery Canvas, Technical Feasibility Canvas, Ballpark Estimation, Evolith User Story, Agile Backlog, CLI Impact Analysis, PRD)

---

Back to [Rulesets Hub](../README.md)
