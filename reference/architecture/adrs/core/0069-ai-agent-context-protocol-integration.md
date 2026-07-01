# ADR-0069: AI Agent Context Protocol Integration

## Status
Approved

## Date
2026-06-06

## Context and Problem
Evolith Core provides governance rulesets (ACL, Open-Core Boundary, Executive Scorecards) that AI agents must consume to enforce architectural decisions. Currently, agents access governance through manual CLI commands or direct file reading. This creates inconsistent enforcement and forces each agent to implement custom logic to parse artifacts.

## Objective and Scope
Standardize how AI models and agents interact with external tools and architectural resources to ensure a single source of truth for ruleset access.

## Options Considered
- **Selected:** AI Agent Context Protocol Integration
- **Others:** Custom REST APIs for agents (rejected due to lack of standardization), Direct file access (rejected due to inconsistent agent parsing).

## Decision and Rationale
Adopt a standardized **AI Agent Context Protocol** implementation to expose architectural governance natively to AI assistants.

The integration must provide:
- **Tools**: Executable validation functions that agents can invoke (e.g., repository validation against rulesets).
- **Resources**: Read-only access to governance artifacts.
- **Prompts**: Standardized templates that agents can request to format their output or analysis.

*(Example implementation: Model Context Protocol (MCP) server wrapping an underlying CLI/SDK).*

**Architecture Update (2026-06-30):** The MCP server was initially bundled inside the CLI. To preserve a clean boundary and reduce CLI bloat, the MCP server has been completely decoupled from the CLI package and is now deployed as a standalone executable.

## Evidence and Evaluation Criteria
Evaluated against the principle of automation and standardization. Utilizing a standardized protocol enables multiple compatible AI agents (e.g., Claude Desktop, custom bots) to consume Evolith governance consistently without bespoke integrations.

## Consequences, Risks, and Trade-offs

### Positive
- AI agents can consume Evolith governance natively via standardized protocols.
- Consistent validation enforcement across all agent implementations.
- A single source of truth for ruleset access via tools, resources, and prompts.

### Negative
- Additional maintenance burden for the protocol server.
- Protocol compliance testing adds CI complexity.

## References
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)

## Related Decisions and Standards
- None

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
