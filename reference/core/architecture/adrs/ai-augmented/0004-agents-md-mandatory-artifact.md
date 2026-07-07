> **Bilingual Navigation:** [Ver version en Espanol](./0004-agents-md-mandatory-artifact.es.md)

# ADR-0004: AGENTS.md as Mandatory Repository Artifact

## Status
Accepted

## Date
2026-06-23

## Context and Problem
AI coding assistants (Codex, Copilot, Claude Code) read repository context from `AGENTS.md` (or equivalent) to understand project conventions, validation commands, and architectural constraints. Without a standardized, mandatory artifact, each assistant arrives with different assumptions, leading to inconsistent code generation, missed validation steps, and violations of project-specific conventions.

In Evolith Core, `AGENTS.md` already serves this role, but its adoption across satellite repositories is voluntary. Some satellites have no `AGENTS.md`, some have outdated versions, and none are validated by CI. This creates a silent quality regression: AI assistants in satellite repos operate without guardrails.

The practical impact is measurable: when an AI assistant does not know the project's validation commands, it cannot verify its own output. When it does not know the coding conventions, it generates code that violates them. When it does not know the architectural boundaries, it creates coupling that the team must later untangle.

## Decision
We mandate `AGENTS.md` as a required artifact for every repository in the Evolith ecosystem with the following rules:

### 1. Presence Requirement
Every repository that contains source code or documentation MUST have a root-level `AGENTS.md`. Repositories without one fail the `validate-root-cleanliness.mjs` gate. The gate checks file existence, non-zero size, and presence of at least one `##` heading.

### 2. Content Minimum
`AGENTS.md` MUST contain at minimum:
- **Project context**: What the repository is and its role in the ecosystem
- **Build and run commands**: How to build, test, and validate the project
- **Coding conventions**: Language-specific style rules, naming patterns, file organization
- **Validation commands**: The exact commands that CI runs (so agents can reproduce them locally)
- **Architecture constraints**: Key patterns, layer boundaries, and anti-patterns to avoid

The validation commands section is critical: it is the contract between the CI pipeline and the AI assistant. If a command listed in `AGENTS.md` does not exist or is misspelled, the assistant will attempt to run a non-existent script, leading to confusion and wasted tokens.

### 3. Bilingual Requirement
For Evolith Core and governance repositories, `AGENTS.md` MUST have an `AGENTS.es.md` counterpart with structural parity. Satellite repositories may opt out of bilingual `AGENTS.md` with an explicit documented exception. Bilingual `AGENTS.md` ensures that Spanish-speaking contributors and agents receive equivalent guidance.

### 4. CI Validation
The `validate-docs.mjs` script MUST check for `AGENTS.md` presence in every repository where it runs. Missing or empty `AGENTS.md` triggers a CI failure. Content freshness is validated by checking that referenced scripts and commands exist in the file system. Stale references (pointing to renamed or deleted scripts) trigger a warning.

### 5. Satellite Inheritance
Satellite repositories MUST inherit from the corporate `AGENTS.md` baseline and extend it with satellite-specific conventions. They MUST NOT override corporate-level rules without an accepted ADR. The inheritance pattern is: corporate baseline + satellite additions, never corporate baseline replacement. This prevents satellite-specific overrides from silently weakening corporate standards.

### 6. Version Staleness Protection
Every `AGENTS.md` MUST include a `Last validated` date comment at the top. If this date is older than 90 days, the `validate-docs.mjs` script emits a warning. This prevents the artifact from becoming stale documentation that no one trusts.

## Consequences

### Positive
- **Consistency**: AI assistants in all repositories share a common understanding of project conventions.
- **Discoverability**: New contributors (human or AI) can understand any repository by reading one file.
- **Quality enforcement**: CI validation prevents stale or missing agent configuration.
- **Ecosystem coherence**: Satellite repos remain aligned with corporate standards.
- **Self-documenting CI**: When validation commands are listed in `AGENTS.md`, the CI pipeline becomes self-documenting.

### Negative
- **Maintenance burden**: `AGENTS.md` must be updated when conventions change, adding a documentation touchpoint.
- **Rigidity for small repos**: Trivial repositories may find the content minimum disproportionate to their size.
- **Staleness risk**: Without the version date guard, `AGENTS.md` can silently become outdated.

### Neutral
- **Migration scope**: Existing repositories without `AGENTS.md` must add one before the CI gate is enforced. A grace period allows incremental adoption. The `validate-root-cleanliness.mjs` script logs a warning (not a failure) during the grace period.

## References
- [ADR-0001: Harness Engineering](./0001-harness-engineering.md)
- [ADR-0002: MCP Integration Protocol](./0002-mcp-integration-protocol.md)
- [validate-root-cleanliness.mjs](../../../../../.harness/scripts/ci/03-validate-root-cleanliness.mjs)
- [AGENTS.md](../../../../../AGENTS.md)
- [ADR-0012: Conventions Enforcement](../core/0049-naming-semantics-clean-code-policy.md)
- [ADR-0068: Documentation Release Gitflow](../core/0068-documentation-release-gitflow.md)

---
[Back to ADR Index](../README.md)

> **Agent Signature:** Architect Agent
