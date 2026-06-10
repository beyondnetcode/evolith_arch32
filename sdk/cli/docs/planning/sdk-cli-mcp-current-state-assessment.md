# SDK/CLI/MCP Current State Assessment

> **Status:** Superseded Historical Diagnostic
> **Date:** 2026-06-06
> **Reference:** Evolith Product Vision Master §2.3
> **Superseded By:** `reference/governance/standards/vision/gap-tracking.md` (single gap tracking board)
> **Bilingual Exception:** SDK planning notes currently have no ES counterpart; authoritative bilingual status is maintained in the vision gap analysis pair.

---

## 0. Current Status Correction — 2026-06-08

This diagnostic is retained as historical context only. It no longer reflects the current CLI/MCP implementation.

Verified current state:
- TypeScript build passes with `npm run build`.
- MCP is no longer a stub; JSON-RPC stdio and minimal local HTTP/SSE transports exist.
- MCP exposes tools, resources, prompts, and metrics handlers.
- `npm test` now starts the suite after repairing Jest configuration and missing dependencies, but the full suite is not yet green.
- Release readiness remains blocked by failing/sandbox-sensitive tests and missing MCP smoke evidence.

Use the current Core gap analysis for active planning:
[Evolith Core Gap Tracking Board](../../../../reference/governance/standards/vision/gap-tracking.md)

## 1. Executive Summary

Evolith's SDK/CLI/MCP infrastructure is in **early foundation stage**. The CLI framework and core validation logic are functional, but the MCP server is entirely stubbed, and most high-level commands (agents, upgrade, docs, scaffold) are POC implementations with TODO comments rather than actual logic.

**Maturity Score:** ~30%

| Component | Status | Coverage |
|-----------|--------|----------|
| CLI Framework | IMPLEMENTED | 100% |
| Core Validation | IMPLEMENTED | ~40% of rulesets |
| MCP Server | NOT_IMPLEMENTED | 0% |
| Interactive UI | IMPLEMENTED | 100% |
| File Operations | IMPLEMENTED | 100% |
| Agent Installation | STUB | 0% |
| Upgrade Logic | STUB | 0% |
| Docs Scaffolding | STUB | 0% |
| Architecture Scaffold | PARTIALLY_IMPLEMENTED | ~20% |
| SDLC Operations | MOCK/POC | ~10% |
| Unit Tests | LIMITED | ~25% |
| E2E Tests | STUBS | ~10% |

---

## 2. SDK Structure

### 2.1 Language & Framework

- **Language:** TypeScript 6.0.3
- **Runtime:** Node.js (CommonJS module)
- **CLI Framework:** NestJS 11.x with nest-commander 3.20.1
- **Package Manager:** npm

### 2.2 Directory Structure

```
sdk/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts                      # Entry point
│   ├── app.module.ts                # Root NestJS module
│   ├── commands/
│   │   ├── init/
│   │   │   ├── init.command.ts      # Initialize satellite
│   │   │   ├── agents.command.ts    # Agent management
│   │   │   └── upgrade.command.ts   # Satellite upgrade
│   │   ├── validate/
│   │   │   └── validate.command.ts  # Ruleset validation
│   │   ├── docs/
│   │   │   └── docs.command.ts      # Docs scaffolding
│   │   ├── mcp/
│   │   │   └── mcp-serve.command.ts # MCP server
│   │   ├── sdlc/
│   │   │   ├── sdlc.command.ts      # Parent (subcommands)
│   │   │   ├── handoff.command.ts   # Phase transition
│   │   │   └── generate-domain.command.ts
│   │   └── architecture/
│   │       └── scaffold.command.ts  # Nx workspace setup
│   └── core/
│       ├── config/
│       │   └── config.service.ts    # YAML config management
│       ├── filesystem/
│       │   └── file-manager.service.ts  # Safe file operations
│       ├── sync/
│       │   └── sync.service.ts      # Template sync
│       ├── validators/
│       │   └── ruleset-validator.service.ts  # Core validation
│       ├── mcp/
│       │   ├── mcp-server.service.ts # MCP server (stub)
│       │   └── watcher.service.ts   # File watcher
│       └── architecture/
│           ├── workspace-manager.strategy.ts  # Interface
│           └── nx-workspace.strategy.ts      # Nx implementation
└── test/
    └── *.e2e-spec.ts
```

### 2.3 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @clack/prompts | ^1.5.1 | Interactive CLI UI |
| @nestjs/common | ^11.1.24 | DI framework |
| @nestjs/core | ^11.1.24 | NestJS runtime |
| chalk | ^4.1.2 | Terminal colors |
| chokidar | ^5.0.0 | File watching |
| conf | ^15.1.0 | Config storage |
| fs-extra | ^11.3.5 | File operations |
| nest-commander | ^3.20.1 | CLI command framework |
| ora | ^9.4.0 | Spinner indicators |
| yaml | ^2.9.0 | YAML parsing |

---

## 3. CLI Commands Inventory

### 3.1 Implemented Commands

| Command | Status | Notes |
|---------|--------|-------|
| `smart-cli validate` | IMPLEMENTED | Full validation with --satellite, --core, --ruleset, --format, --output |
| `smart-cli init` | PARTIALLY_IMPLEMENTED | Interactive wizard works; batch mode stub; file creation mocked |
| `smart-cli mcp serve` | PARTIALLY_IMPLEMENTED | Watcher starts but MCP server is stub |

### 3.2 Stub Commands

| Command | Status | Evidence |
|---------|--------|----------|
| `smart-cli agents` | STUB | `// TODO: Logic for agent installation` (agents.command.ts:14) |
| `smart-cli upgrade` | STUB | `// TODO: logic for upgrading satellite structures safely` (upgrade.command.ts:14) |
| `smart-cli docs` | STUB | `// TODO: logic for scaffolding docs` (docs.command.ts:14) |

### 3.3 POC Commands

| Command | Status | Evidence |
|---------|--------|----------|
| `smart-cli sdlc handoff` | MOCK/POC | `[MOCK] Starting handoff process...` (handoff.command.ts:14) |
| `smart-cli sdlc generate` | MOCK/POC | `[MOCK] Generating domain...` (generate-domain.command.ts:15) |
| `smart-cli scaffold` | PARTIALLY_IMPLEMENTED | Prompts work; exec mocked via setTimeout |

---

## 4. MCP Server Inventory

### 4.1 Current State

| Aspect | Status | Evidence |
|--------|--------|----------|
| Transport | NOT_IMPLEMENTED | McpServerService only logs "Servidor MCP en escucha" |
| Tools | NOT_IMPLEMENTED | No tool definitions exist |
| Resources | NOT_IMPLEMENTED | No resource handlers exist |
| Prompts | NOT_IMPLEMENTED | No prompt templates exist |
| Watcher Integration | PARTIALLY_IMPLEMENTED | WatcherService watches files but doesn't notify MCP |

### 4.2 Watcher Capabilities (Partial)

The `WatcherService` watches:
- `**/*.md` - Markdown files
- `package.json` - Package manifest
- `evolith.setup.json` - Evolith setup config

Detects changes in:
- `reference/architecture/` - Architecture documents
- `docs/` - Documentation

But only logs recommendations, doesn't integrate with MCP protocol.

---

## 5. Ruleset Validation Coverage

### 5.1 Full Validation (Always Runs)

| Rule ID | Check | Implemented |
|---------|-------|-------------|
| GOV-01 | evolith.yaml exists | YES |
| GOV-02 | governance.version declared | YES |
| INH-02 | coreRef.version is valid semver | YES |
| ACL-01 | ACL directory not empty | YES |
| OCB-01 | License not enterprise-only | YES |

### 5.2 Selective Validation (--ruleset flag)

| Ruleset ID | Supported |
|------------|-----------|
| adr-0002 | YES |
| adr-0005 | YES |
| adr-0010 | YES |
| adr-0018 | YES |
| adr-0032 | YES |
| adr-0040 | YES |
| adr-0050 | YES |
| acl | YES |
| open-core | YES |
| inheritance | YES |

### 5.3 NOT Validated by CLI

| Category | Rulesets |
|----------|----------|
| Architecture | f1-modular-monolith, f2-distributed-modules, f3-microservices |
| Cross-cutting | compliance-baseline, definition-of-done, engineering-manifesto, repository-taxonomy |
| SDLC | phase-gates, quality-thresholds |
| Governance | satellite-contracts, executive-scorecards |

---

## 6. Test Coverage

### 6.1 Unit Tests

| Service | Coverage |
|---------|----------|
| ConfigService | YES - get/set/addSatellite |
| SyncService | YES - file copy logic |
| WatcherService | YES - startWatching/destroy |
| FileManagerService | YES - safeCopy scenarios |
| RulesetValidatorService | **NO** - Missing |

**Unit Test Coverage:** ~25% (4 of ~16 services)

### 6.2 E2E Tests

All 6 E2E tests are minimal stubs that only execute the command without verifying behavior.

| Command | E2E Status |
|---------|------------|
| init | STUB |
| validate | STUB |
| agents | STUB |
| docs | STUB |
| upgrade | STUB |
| mcp-serve | STUB |

---

## 7. Architectural Violations

### 7.1 MCP Server Doesn't Implement Protocol

The `McpServerService.onModuleInit()` should use `@modelcontextprotocol/sdk` or similar to implement JSON-RPC transport over stdio. Currently it only logs.

### 7.2 CLI Has No Architecture Validation

`smart-cli validate` doesn't check:
- F1/F2/F3 architecture rules
- Hexagonal architecture boundaries
- Domain layer isolation
- Multi-tenancy implementation

### 7.3 Commands Are Not Extensible

No plugin system exists. Adding new commands requires modifying the codebase directly.

### 7.4 MCP Watcher Doesn't Notify

`WatcherService` detects architectural drift but has no mechanism to push notifications to MCP clients.

---

## 8. Configuration

### 8.1 Config Storage

Uses `conf` package with YAML file extension:
- **Path:** `~/.config/evolith-cli/` (platform-dependent)
- **Defaults:** `{ version: "1.0.0", telemetryEnabled: true, knownSatellites: [] }`

### 8.2 Satellite Configuration

Satellites use `evolith.yaml` at root with structure:
- `apiVersion: evolith.dev/v1`
- `kind: Satellite`
- `metadata.name`, `metadata.phase`, `metadata.architectureVersion`
- `spec.coreRef.version`, `spec.coreRef.rulesetVersion`
- `spec.runtime.language`, `spec.runtime.framework`
- `spec.sdlc.currentPhase`, `spec.sdlc.gates`
- `spec.boundedContexts`
- `spec.compliance.adrRegistry`, `spec.compliance.qualityWaivers`
- `spec.governance.executiveSponsor`

---

## 9. Output Formats

### 9.1 JSON Output (validate command)

```json
{
  "status": "failed",
  "rulesChecked": 5,
  "issues": [
    {
      "ruleId": "GOV-01",
      "severity": "MUST",
      "category": "governance",
      "title": "evolith.yaml missing",
      "description": "...",
      "file": "/path/to/evolith.yaml",
      "blocking": true
    }
  ],
  "coreRef": { "version": null, "path": null },
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```

### 9.2 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | SUCCESS |
| 1 | VALIDATION_FAILED |
| (not defined) | Other errors |

---

## 10. Gaps Summary

| Gap | Severity | Impact |
|-----|----------|--------|
| MCP Server not implemented | CRITICAL | AI agents cannot consume Evolith governance |
| Agent installation not implemented | HIGH | Satellites cannot onboard AI agents |
| Upgrade logic not implemented | HIGH | No safe upgrade path for satellites |
| Architecture validation incomplete | HIGH | Cannot validate F1/F2/F3 rules |
| MCP Watcher not integrated | MEDIUM | No real-time architectural drift detection |
| SDLC operations are mocks | MEDIUM | Phase gates cannot be executed |
| Test coverage low | MEDIUM | Risk of regressions |
| No plugin system | LOW | Extensibility limited |

---

## 11. Next Steps

See: `sdk-cli-mcp-implementation-roadmap.md`

---
[Back to SDK/CLI Planning Index](./README.md)
