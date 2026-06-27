# OPA Policies and Input Schemas

This directory contains the core Open Policy Agent (OPA) `.rego` policies used for architecture and governance validation in the Evolith platform.

Every OPA policy defines a formal contract for its input, backed by a versioned JSON Schema.

## OPA Policies and Schemas

| Policy File | Test File | Input JSON Schema | Description |
|---|---|---|---|
| [governance.rego](./governance.rego) | [governance.test.rego](./governance.test.rego) | [governance.input.schema.json](./schemas/governance.input.schema.json) | Verifies satellite inheritance boundaries and mandatory decisions. |
| [mcp.rego](./mcp.rego) | [mcp.test.rego](./mcp.test.rego) | [mcp.input.schema.json](./schemas/mcp.input.schema.json) | Verifies Model Context Protocol (MCP) compliance and smoke testing evidence. |
| [version-pinning.rego](./version-pinning.rego) | [version-pinning.test.rego](./version-pinning.test.rego) | [version-pinning.input.schema.json](./schemas/version-pinning.input.schema.json) | Enforces strict package dependency pinning rules. |
| [cli-readiness.rego](./cli-readiness.rego) | [cli-readiness.test.rego](./cli-readiness.test.rego) | [cli-readiness.input.schema.json](./schemas/cli-readiness.input.schema.json) | Validates Smart CLI compilation, documentation, and lock file readiness. |
| [knowledge-intake.rego](./knowledge-intake.rego) | [knowledge-intake.test.rego](./knowledge-intake.test.rego) | [knowledge-intake.input.schema.json](./schemas/knowledge-intake.input.schema.json) | Governs the intake lifecycle, review status, and topology matching of external knowledge. |
| [taxonomy.rego](./taxonomy.rego) | [taxonomy.test.rego](./taxonomy.test.rego) | [taxonomy.input.schema.json](./schemas/taxonomy.input.schema.json) | Validates repository directory taxonomy, ADR file names, and bilingual pairs. |
| [ci-cd.rego](./ci-cd.rego) | [ci-cd.test.rego](./ci-cd.test.rego) | [ci-cd.input.schema.json](./schemas/ci-cd.input.schema.json) | Asserts that dependency scanning, workflow scripts, and dependency updates are present. |
| [evidence.rego](./evidence.rego) | [evidence.test.rego](./evidence.test.rego) | [evidence.input.schema.json](./schemas/evidence.input.schema.json) | Validates the schema, retention periods, and ownership of gate evidence artifacts. |
| [abac-mcp-tool-access.rego](./abac-mcp-tool-access.rego) | [abac-mcp-tool-access.test.rego](./abac-mcp-tool-access.test.rego) | [abac-mcp-tool-access.input.schema.json](./schemas/abac-mcp-tool-access.input.schema.json) | Restricts Model Context Protocol (MCP) tool execution by role, action, and environment. |

---
[Back to Rulesets Hub](../README.md)
