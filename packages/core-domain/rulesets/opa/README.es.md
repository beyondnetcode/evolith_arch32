# Políticas OPA y Schemas de Entrada

Esta carpeta contiene las políticas principales de Open Policy Agent (OPA) `.rego` utilizadas para la validación de arquitectura y gobernanza en la plataforma Evolith.

Cada política OPA define un contrato formal para su entrada, respaldado por un JSON Schema versionado.

## Políticas y Schemas OPA

| Archivo de Política | Archivo de Prueba | JSON Schema de Entrada | Descripción |
|---|---|---|---|
| [governance.rego](./governance.rego) | [governance.test.rego](./governance.test.rego) | [governance.input.schema.json](./schemas/governance.input.schema.json) | Verifica los límites de herencia de satélites y decisiones obligatorias. |
| [mcp.rego](./mcp.rego) | [mcp.test.rego](./mcp.test.rego) | [mcp.input.schema.json](./schemas/mcp.input.schema.json) | Verifica el cumplimiento del protocolo MCP y la evidencia de pruebas de humo. |
| [version-pinning.rego](./version-pinning.rego) | [version-pinning.test.rego](./version-pinning.test.rego) | [version-pinning.input.schema.json](./schemas/version-pinning.input.schema.json) | Aplica reglas estrictas de fijación (pinning) de dependencias de paquetes. |
| [cli-readiness.rego](./cli-readiness.rego) | [cli-readiness.test.rego](./cli-readiness.test.rego) | [cli-readiness.input.schema.json](./schemas/cli-readiness.input.schema.json) | Valida la compilación, documentación y preparación del archivo lock del Smart CLI. |
| [knowledge-intake.rego](./knowledge-intake.rego) | [knowledge-intake.test.rego](./knowledge-intake.test.rego) | [knowledge-intake.input.schema.json](./schemas/knowledge-intake.input.schema.json) | Gobierna el ciclo de vida de ingesta, estado de revisión y emparejamiento topológico de conocimiento externo. |
| [taxonomy.rego](./taxonomy.rego) | [taxonomy.test.rego](./taxonomy.test.rego) | [taxonomy.input.schema.json](./schemas/taxonomy.input.schema.json) | Valida la taxonomía de directorios del repositorio, nombres de archivos ADR y pares bilingües. |
| [ci-cd.rego](./ci-cd.rego) | [ci-cd.test.rego](./ci-cd.test.rego) | [ci-cd.input.schema.json](./schemas/ci-cd.input.schema.json) | Asegura que el escaneo de dependencias, scripts de flujo de trabajo y actualizaciones de dependencias estén presentes. |
| [evidence.rego](./evidence.rego) | [evidence.test.rego](./evidence.test.rego) | [evidence.input.schema.json](./schemas/evidence.input.schema.json) | Valida el esquema, periodos de retención y propiedad de los artefactos de evidencia de gates. |
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | [abac-mcp-tool-access.test.rego](./abac-mcp-tool-access.test.rego) | [abac-mcp-tool-access.input.schema.json](./schemas/abac-mcp-tool-access.input.schema.json) | Restringe la ejecución de herramientas del Model Context Protocol (MCP) por rol, acción y entorno. |

---
[Volver al Centro de Rulesets](../README.es.md)
