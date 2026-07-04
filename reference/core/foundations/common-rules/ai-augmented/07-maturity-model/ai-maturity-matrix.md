# AI-Augmented Maturity Matrix

Diagnostic tool for teams to identify their technological integration level and governance concerning AI agents.

## Matrix 3 Levels x 5 Dimensions

| Dimension | Level 1: AI-Assisted | Level 2: AI-Integrated | Level 3: AI-Orchestrated |
| :--- | :--- | :--- | :--- |
| **Documentation** | `AGENTS.md` present in root with basic team commands and rules. | Self-documented internal MCP Servers listed officially in corporate Tool Catalog. | Multi-agent patterns with orchestrators diagrammed in C4 and agent-specific ADRs. |
| **Tools** | Passive usage of IDE tools (Claude Code, Cursor, GitHub Copilot). | The product exposes its own APIs as MCP Servers consumed by models. | System with complete recursive tool-calling agentic cycle and semantic memory. |
| **Verification** | Presence of `pre-commit hooks` and automated local post-edit linter. | CI Pipeline executes automated tests (evals) validating LLM output does not break contracts. | Dedicated verification agents patrol the ecosystem and audit anomalies in the background. |
| **Models** | Free use of authorized models using individual developer API keys. | Formal model selection via corporate ADR based on benchmarks and cost-per-token. | Hybrid role-based multi-model strategy with active governance, real-time cost alerts. |
| **Security** | Total restriction: IDE agents hold no credentials or production DB access. | Limited agent access to production via MCP Servers with explicit auth and scoped limits. | Complete sandbox for code tools and immutable Audit Log for every Tool Call, guaranteeing full traceability. |

## Objective Criteria per Level (Certification)

To certify that your product belongs to a specific level, the team must present the following evidence to the architecture audit:

### Evidence Required for Level 1:
- [] Existence of the `.husky/pre-commit` file (or equivalent) validating the syntax of generated code.
- [] `AGENTS.md` file updated within the last 30 days.

### Evidence Required for Level 2:
- [] JSON Schema of the tool catalog published in team wiki.
- [] CI Logs demonstrating execution of test suites invoking model mocks.
- [] Signed document confirming backend does not expose untokenized PII to the LLM.

### Evidence Required for Level 3:
- [] Token cost dashboard broken down by agent / feature.
- [] Physical demonstration of the "Human-in-the-Loop" switch blocking a simulated transaction.
- [] Multi-agent architecture diagram approved by the committee.

---
[Back to Index](./README.md)
