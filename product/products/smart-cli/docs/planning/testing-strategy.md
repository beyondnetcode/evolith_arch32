# SDK/CLI/MCP Testing Strategy

> **Status:** Draft
> **Date:** 2026-06-06
> **Owner:** SDK Team

---

## 1. Overview

This strategy defines testing approaches for SDK (TypeScript library), CLI (Commander.js), and MCP (Model Context Protocol server) components. All three share the same service layer under `sdk/cli/src/core/services/`.

### Guiding Principles

- **Pyramid compliance:** Unit tests as foundation, integration tests for service boundaries, E2E for CLI/MCP flows
- **SDK as single source of truth:** Tests validate SDK behavior; CLI and MCP inherit passing tests
- **Incremental coverage:** Phase 1 targets 80% unit coverage; Phase 2 adds integration; Phase 3 adds E2E

---

## 2. Test Architecture

### 2.1 Test Pyramid

```
        ┌─────────────────┐
        │   E2E / CLI    │  ← 5% (CLI smoke tests, MCP integration)
        ├─────────────────┤
        │  Integration   │  ← 25% (Service-to-service, file I/O)
        ├─────────────────┤
        │     Unit       │  ← 70% (Services, validators, formatters)
        └─────────────────┘
```

### 2.2 Module-to-Test Mapping

| Module | Test File | Type | Priority |
|--------|-----------|------|----------|
| `RulesetValidatorService` | `ruleset-validator.service.test.ts` | Unit | P0 |
| `EvolithYamlService` | `evolith-yaml.service.test.ts` | Unit | P0 |
| `BilingualValidationService` | `bilingual-validation.service.test.ts` | Unit | P0 |
| `ArchitectureValidationService` | `architecture-validation.service.test.ts` | Unit | P1 |
| `AgentInstallationService` | `agent-installation.service.test.ts` | Unit + Integration | P1 |
| `McpServerService` | `mcp-server.service.test.ts` | Unit | P1 |
| CLI `validate` command | `validate.command.test.ts` | Integration | P1 |
| CLI `agent` commands | `agent.commands.test.ts` | Integration | P2 |
| MCP tools handler | `mcp-tools.handler.test.ts` | Unit | P1 |
| MCP resources handler | `mcp-resources.handler.test.ts` | Unit | P2 |

---

## 3. Unit Testing Standards

### 3.1 Framework & Setup

```
Framework: Vitest
Location: sdk/cli/src/**/*.test.ts
Coverage: threshold 80% per service
Mocking: ts-mockito for service mocks
```

### 3.2 Service Test Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RulesetValidatorService } from './ruleset-validator.service';

describe('RulesetValidatorService', () => {
  let service: RulesetValidatorService;
  let mockFileSystem: FileSystemMock;

  beforeEach(() => {
    mockFileSystem = new FileSystemMock();
    service = new RulesetValidatorService(mockFileSystem);
  });

  it('should pass when evolith.yaml exists and is valid', async () => {
    mockFileSystem.exists.mockReturnValue(true);
    mockFileSystem.readJson.mockReturnValue({ coreRef: { version: '1.0.0' } });
    const result = await service.validate('/repo');
    expect(result.valid).toBe(true);
  });

  it('should fail when evolith.yaml is missing', async () => {
    mockFileSystem.exists.mockReturnValue(false);
    const result = await service.validate('/repo');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'GOV-01' }));
  });
});
```

### 3.3 Coverage Requirements by Phase

| Phase | Target Coverage | Critical Paths |
|-------|----------------|----------------|
| Phase 1 | 80% unit | RulesetValidatorService, EvolithYamlService |
| Phase 2 | 85% unit + 60% integration | AgentInstallationService, MCP handlers |
| Phase 3 | 90% unit + 80% integration + E2E | Full CLI commands, MCP stdio flow |

---

## 4. Integration Testing

### 4.1 Service Integration Tests

Test interactions between services and file system:

```typescript
describe('AgentInstallationService Integration', () => {
  it('should install agent and validate ruleset structure', async () => {
    const tempDir = await createTempRepo();
    const service = new AgentInstallationService(new NodeFileSystem());
    
    await service.installAgent({ name: 'test-agent', template: 'standard' });
    
    const rulesetPath = join(tempDir, 'rulesets', 'test-agent', 'agent.rules.json');
    expect(await fileExists(rulesetPath)).toBe(true);
    expect(await readJson(rulesetPath)).toMatchObject({
      ruleset: { version: '1.0', rules: expect.any(Array) }
    });
  });
});
```

### 4.2 CLI Integration Tests

Use Commander.js programmatic API:

```typescript
describe('Validate Command Integration', () => {
  it('should validate repository and output JSON', async () => {
    const output = await runCommand(['validate', '--output=json', '--format=summary']);
    expect(output).toContain('"valid":true');
    expect(output).toContain('"rulesPassed"');
  });
});
```

---

## 5. E2E Testing

### 5.1 CLI Smoke Tests

Location: `sdk/cli/test/e2e/cli-smoke.test.ts`

```typescript
describe('CLI E2E Smoke Tests', () => {
  it('evolith-cli validate --help shows all flags', async () => {
    const result = await execAsync('node dist/cli.js validate --help');
    expect(result.stdout).toContain('--satellite');
    expect(result.stdout).toContain('--core');
    expect(result.stdout).toContain('--ruleset');
  });

  it('evolith-cli agent install creates ruleset', async () => {
    const tempDir = await mkdtemp();
    const result = await execAsync(
      `node dist/cli.js agent install --name=e2e-agent --dir=${tempDir}`,
      { cwd: tempDir }
    );
    expect(result.exitCode).toBe(0);
    expect(await fileExists(join(tempDir, 'rulesets', 'e2e-agent'))).toBe(true);
  });
});
```

### 5.2 MCP Integration Tests

Test JSON-RPC over stdio:

```typescript
describe('MCP Server Integration', () => {
  let mcpProcess: ChildProcess;
  
  beforeEach(async () => {
    mcpProcess = spawn('node', ['dist/mcp-server.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
    await waitForServerReady(mcpProcess);
  });

  afterEach(() => {
    mcpProcess.kill();
  });

  it('should respond to tools/list', async () => {
    const response = await sendJsonRpc(mcpProcess, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    expect(response.result.tools).toBeDefined();
    expect(Array.isArray(response.result.tools)).toBe(true);
  });

  it('should execute validate tool and return results', async () => {
    const response = await sendJsonRpc(mcpProcess, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'evolith-validate', arguments: { path: '/test/repo' } }
    });
    expect(response.result).toMatchObject({
      content: expect.arrayContaining([{ type: 'text', text: expect.any(String) }])
    });
  });
});
```

---

## 6. Test Data Fixtures

### 6.1 Fixture Directory Structure

```
sdk/cli/test/fixtures/
├── valid-repo/
│   ├── evolith.yaml
│   ├── rulesets/acl/anti-corruption-layer.rules.json
│   └── .harness/
└── invalid-repo/
    ├── evolith.yaml (missing coreRef)
    └── rulesets/ (empty)
```

### 6.2 Fixture Usage

```typescript
import { loadFixture } from '../helpers/fixture-loader';

it('should validate valid repository', async () => {
  const fixture = loadFixture('valid-repo');
  const service = new RulesetValidatorService(fixture.fileSystem);
  const result = await service.validate(fixture.path);
  expect(result.valid).toBe(true);
});
```

---

## 7. CI Integration

### 7.1 GitHub Actions Workflow

```yaml
name: SDK/CLI/MCP Tests

on:
  push:
    paths: ['sdk/cli/**']
  pull_request:
    paths: ['sdk/cli/**']

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: sdk/cli/package-lock.json
      - run: npm ci
        working-directory: sdk/cli
      - run: npm run test:unit
      - name: Coverage
        uses: codecov/codecov-action@v4

  integration:
    needs: unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:integration
        working-directory: sdk/cli

  e2e:
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:e2e
        working-directory: sdk/cli
```

### 7.2 Coverage Gates

| Check | Threshold | Action on Failure |
|-------|-----------|-------------------|
| Unit coverage | 80% | Block merge |
| Integration coverage | 60% | Block merge |
| E2E passing | 100% | Block merge |
| MCP protocol compliance | All tests pass | Block merge |

---

## 8. Testing Roadmap

| Phase | Focus | Exit Criteria |
|-------|-------|---------------|
| Phase 1 | Unit tests for core services | 80% coverage, all P0 tests green |
| Phase 2 | Integration tests, MCP handler tests | 85% coverage, CLI commands tested |
| Phase 3 | E2E smoke tests, MCP stdio flow | 90% coverage, full pipeline green |

---

## 9. References

- [SDK/CLI/MCP Target Architecture](./sdk-cli-mcp-target-architecture.md)
- [Gap Analysis](./sdk-cli-mcp-gap-analysis.md)
- [CLI Command Catalog](./cli-command-catalog.md)
- [MCP Capability Catalog](./mcp-capability-catalog.md)