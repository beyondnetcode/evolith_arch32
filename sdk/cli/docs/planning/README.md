# SDK/CLI/MCP Planning Documents

> **Owner:** SDK Team
> **Date:** 2026-06-06

This directory contains planning documents for the SDK, CLI, and MCP components of Evolith.

---

## Index

| Document | Status | Purpose |
|----------|--------|---------|
| [Current State Assessment](./sdk-cli-mcp-current-state-assessment.md) | Complete | Diagnostic of existing code and capabilities |
| [Target Architecture](./sdk-cli-mcp-target-architecture.md) | Complete | Shared architecture design for SDK/CLI/MCP |
| [API Capability Catalog](./sdk-api-capability-catalog.md) | Complete | 9 service modules and their capabilities |
| [CLI Command Catalog](./cli-command-catalog.md) | Complete | 50+ CLI commands organized by domain |
| [MCP Capability Catalog](./mcp-capability-catalog.md) | Complete | 30+ tools, 12 resources, 6 prompts |
| [CLI/MCP Parity Matrix](./cli-mcp-parity-matrix.md) | Complete | Feature parity between CLI and MCP |
| [Gap Analysis](./sdk-cli-mcp-gap-analysis.md) | Complete | 10 identified gaps (G-01 through G-10) |
| [Implementation Roadmap](./sdk-cli-mcp-implementation-roadmap.md) | Complete | 6-phase plan (XS to XL effort) |
| [Testing Strategy](./testing-strategy.md) | Complete | Unit, integration, E2E testing approach |
| [Release Readiness Checklist](./release-readiness-checklist.md) | Complete | Phase-gate release criteria |

---

## Document Summary

### Current State Assessment
Full diagnostic of SDK (~30% maturity), CLI (framework working, most commands mocks), MCP (stub only). Identifies 35-page analysis of current state.

### Target Architecture
Shared service layer design where SDK is single source of truth. CLI and MCP consume same service instances. MCP uses stdio transport (JSON-RPC), not HTTP.

### API Capability Catalog
9 service modules defined: RulesetValidator, EvolithYaml, BilingualValidation, ArchitectureValidation, AgentInstallation, UpgradeLogic, SdlcOperations, ArtifactGeneration, McpServer.

### CLI Command Catalog
50+ commands cataloged across domains: validate (5 flags), agent (5 subcommands), architecture (4 subcommands), sdlc (4 subcommands), config (3 subcommands), help.

### MCP Capability Catalog
30+ tools, 12 resources, 6 prompts defined. Tools include validate, agent-install, architecture-validate, sdlc-handoff. Resources cover rulesets, phase-gates, agents.

### CLI/MCP Parity Matrix
Feature parity requirements: CLI and MCP must offer same validation coverage. MCP does NOT notify clients (G-01 architectural violation identified).

### Gap Analysis
10 gaps identified with severity and effort:
- G-01 (CRITICAL): MCP Server Protocol Not Implemented
- G-02 (HIGH): Architecture Validation Incomplete
- G-03 (HIGH): Agent Installation Logic Missing
- G-04 (HIGH): Upgrade Logic Incomplete
- G-05 (MEDIUM): SDLC Operations Partial
- G-06 (MEDIUM): Artifact Generation Limited
- G-07 (MEDIUM): Test Coverage ~25%
- G-08 (MEDIUM): MCP Resources Not Implemented
- G-09 (MEDIUM): MCP Prompts Not Implemented
- G-10 (LOW): Plugin System Not Designed

### Implementation Roadmap
6-phase plan: Phase 1 (SDK Foundation, L), Phase 2 (CLI Completion, M), Phase 3 (MCP Server, M), Phase 4 (SDK Extraction, XL), Phase 5 (Plugin System, XL), Phase 6 (Advanced Features, L).

### Testing Strategy
Test pyramid: 70% unit, 25% integration, 5% E2E. Phase 1 targets 80% unit coverage. Vitest framework. MCP integration tests use stdio subprocess.

### Release Readiness Checklist
Pre-release universal gates, Phase 1-3 specific gates, regression testing suite, release sign-off section.

---

## Related Documents

- [Evolith Product Vision Master](../../../../reference/governance/standards/vision/evolith-product-vision-master.md)
- [ACL Ruleset](../../../../rulesets/acl/anti-corruption-layer.rules.json)
- [Open-Core Boundary Rules](../../../../rulesets/governance/open-core-boundary.rules.json)
- [Executive Scorecards](../../../../rulesets/governance/executive-scorecards.rules.json)