# Release Readiness Checklist

> **Status:** Draft
> **Date:** 2026-06-06
> **Owner:** SDK Team

---

## 1. Overview

This checklist defines readiness criteria for releasing SDK, CLI, and MCP components. Each phase gate has specific requirements that must be satisfied before release.

---

## 2. Pre-Release Universal Gates

These gates apply to every release regardless of phase.

### 2.1 Code Quality

- [ ] All TypeScript compiles without errors (`npm run build`)
- [ ] No `TODO` or `FIXME` comments in release scope
- [ ] No hardcoded secrets, keys, or credentials
- [ ] No console.log/debug statements in production code
- [ ] Package.json `version` updated appropriately (semver)
- [ ] `CHANGELOG.md` updated with release changes

### 2.2 Documentation

- [ ] README.md reflects current state of SDK/CLI/MCP
- [ ] All public API methods have JSDoc comments
- [ ] Migration guide created if breaking changes exist
- [ ] Bilingual documentation updated (EN + ES pairs)

### 2.3 Git & Version Control

- [ ] Commit history is clean (no WIP commits)
- [ ] Version tag created: `sdk-cli-mcp-vX.Y.Z`
- [ ] Branch protection enabled on `main`
- [ ] PR reviewed and approved (minimum 1 approver)

---

## 3. Phase 1 Gates (SDK Foundation)

### 3.1 SDK Core Services

- [ ] `RulesetValidatorService` implemented and unit tested (80%+ coverage)
- [ ] `EvolithYamlService` implemented and unit tested
- [ ] `BilingualValidationService` implemented and unit tested
- [ ] `ArchitectureValidationService` skeleton implemented
- [ ] All services export proper TypeScript interfaces

### 3.2 CLI Validate Command

- [ ] `--satellite` flag functional
- [ ] `--core` flag functional
- [ ] `--ruleset` flag functional
- [ ] `--format` flag functional (json, summary, table)
- [ ] `--output` flag functional (path to file)
- [ ] `validate` command passes all integration tests

### 3.3 SDK Package

- [ ] `package.json` has proper `name`: `@beyondnet/evolith-sdk`
- [ ] `exports` field correctly maps all service entry points
- [ ] `types` field points to correct declaration file
- [ ] SDK can be imported in external TypeScript project
- [ ] SDK tree-shakes correctly (no unused code bundled)

---

## 4. Phase 2 Gates (CLI Completion)

### 4.1 Agent Management Commands

- [ ] `evolith-cli agent install` creates valid ruleset structure
- [ ] `evolith-cli agent list` shows installed agents
- [ ] `evolith-cli agent validate` validates agent ruleset
- [ ] `evolith-cli agent upgrade` handles version upgrades
- [ ] `evolith-cli agent remove` cleanly removes agent

### 4.2 Architecture Validation

- [ ] `evolith-cli architecture validate` checks F1 modular independence
- [ ] `evolith-cli architecture validate` checks F2 contract boundaries
- [ ] `evolith-cli architecture validate` checks F3 extraction readiness
- [ ] Validation output includes specific rule violations with codes

### 4.3 SDLC Operations

- [ ] `evolith-cli sdlc handoff` generates artifact manifest
- [ ] `evolith-cli sdlc handoff` validates phase gate requirements
- [ ] `evolith-cli sdlc status` shows current phase gate status
- [ ] `evolith-cli sdlc advance` triggers phase transition (if authorized)

---

## 5. Phase 3 Gates (MCP Implementation)

### 5.1 MCP Server Core

- [ ] MCP server starts via `evolith-cli mcp` command
- [ ] JSON-RPC 2.0 compliance verified
- [ ] StdioServerTransport implemented correctly
- [ ] Server responds to `initialize` request
- [ ] Server responds to `shutdown` request

### 5.2 MCP Tools

- [ ] `evolith-validate` tool accepts `path`, `format`, `ruleset` arguments
- [ ] `evolith-validate` returns structured JSON result
- [ ] `evolith-agent-install` tool accepts `name`, `template` arguments
- [ ] `evolith-agent-install` returns installation confirmation
- [ ] `evolith-architecture-validate` tool implemented
- [ ] `evolith-sdlc-handoff` tool implemented

### 5.3 MCP Resources

- [ ] `evolith://rulesets` resource lists available rulesets
- [ ] `evolith://ruleset/{name}` resource returns ruleset content
- [ ] `evolith://phase-gates` resource shows current phase status
- [ ] `evolith://agents` resource lists installed agents

### 5.4 MCP Prompts

- [ ] `evolith/validate-repository` prompt template defined
- [ ] `evolith/agent-onboarding` prompt template defined
- [ ] `evolith/architecture-review` prompt template defined
- [ ] Prompts include proper instructions for Claude Desktop

---

## 6. Phase 4+ Gates (Future)

### 6.1 SDK Extraction

- [ ] SDK published to npm registry (if applicable)
- [ ] SDK versioning strategy documented
- [ ] SDK deprecation policy defined

### 6.2 Plugin System

- [ ] Plugin interface documented (see G-10)
- [ ] Plugin discovery mechanism implemented
- [ ] Plugin sandboxing/security model defined

---

## 7. Regression Testing

Before any release, run the following regression suite:

### 7.1 Core Regression

```
npm run test:unit -- --reporter=verbose
npm run test:integration -- --reporter=verbose
npm run build
```

### 7.2 CLI Regression

```
node dist/cli.js validate --help
node dist/cli.js validate --satellite --format=json
node dist/cli.js agent install --name=regression-test --dir=/tmp/test-agent
node dist/cli.js agent list
```

### 7.3 MCP Regression

```
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node dist/mcp-server.js
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/mcp-server.js
```

---

## 8. Release Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| SDK Owner | | | |
| CLI Owner | | | |
| MCP Owner | | | |
| Architecture Reviewer | | | |

---

## 9. References

- [Testing Strategy](./testing-strategy.md)
- [Implementation Roadmap](./sdk-cli-mcp-implementation-roadmap.md)
- [Gap Analysis](./sdk-cli-mcp-gap-analysis.md)