# Estrategia de Testing de SDK/CLI/MCP

> **Estado:** Borrador
> **Fecha:** 2026-06-06
> **Propietario:** Equipo SDK

---

## 1. Descripción General

Esta estrategia define los enfoques de testing para los componentes SDK (biblioteca TypeScript), CLI (Commander.js) y MCP (servidor de protocolo de contexto de modelo). Los tres comparten la misma capa de servicio en `sdk/cli/src/core/services/`.

### Principios Rectores

- **Cumplimiento de la pirámide:** Pruebas unitarias como base, pruebas de integración para límites de servicio, E2E para flujos de CLI/MCP
- **SDK como fuente única de verdad:** Los tests validan el comportamiento del SDK; CLI y MCP heredan tests exitosos
- **Cobertura incremental:** La Fase 1 apunta al 80% de cobertura unitaria; la Fase 2 agrega integración; la Fase 3 agrega E2E

---

## 2. Arquitectura de Testing

### 2.1 Pirámide de Testing

```
        ┌─────────────────┐
        │   E2E / CLI    │  ← 5% (CLI smoke tests, MCP integration)
        ├─────────────────┤
        │  Integration   │  ← 25% (Service-to-service, file I/O)
        ├─────────────────┤
        │     Unit       │  ← 70% (Services, validators, formatters)
        └─────────────────┘
```

### 2.2 Mapeo Módulo a Test

| Módulo | Archivo de Test | Tipo | Prioridad |
|--------|-----------------|------|-----------|
| `RulesetValidatorService` | `ruleset-validator.service.test.ts` | Unit | P0 |
| `EvolithYamlService` | `evolith-yaml.service.test.ts` | Unit | P0 |
| `BilingualValidationService` | `bilingual-validation.service.test.ts` | Unit | P0 |
| `ArchitectureValidationService` | `architecture-validation.service.test.ts` | Unit | P1 |
| `AgentInstallationService` | `agent-installation.service.test.ts` | Unit + Integration | P1 |
| `McpServerService` | `mcp-server.service.test.ts` | Unit | P1 |
| Comando `validate` de CLI | `validate.command.test.ts` | Integration | P1 |
| Comandos `agent` de CLI | `agent.commands.test.ts` | Integration | P2 |
| Manejador de herramientas MCP | `mcp-tools.handler.test.ts` | Unit | P1 |
| Manejador de recursos MCP | `mcp-resources.handler.test.ts` | Unit | P2 |

---

## 3. Estándares de Pruebas Unitarias

### 3.1 Framework y Configuración

```
Framework: Vitest
Location: sdk/cli/src/**/*.test.ts
Coverage: threshold 80% per service
Mocking: ts-mockito for service mocks
```

### 3.2 Patrón de Test de Servicios

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

### 3.3 Requisitos de Cobertura por Fase

| Fase | Cobertura Objetivo | Rutas Críticas |
|------|--------------------|----------------|
| Fase 1 | 80% unitaria | RulesetValidatorService, EvolithYamlService |
| Fase 2 | 85% unitaria + 60% integración | AgentInstallationService, Manejadores MCP |
| Fase 3 | 90% unitaria + 80% integración + E2E | Comandos CLI completos, flujo stdio MCP |

---

## 4. Pruebas de Integración

### 4.1 Pruebas de Integración de Servicios

Prueba de interacciones entre servicios y el sistema de archivos:

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

### 4.2 Pruebas de Integración de CLI

Uso de la API programática de Commander.js:

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

## 5. Pruebas E2E

### 5.1 Pruebas de Humo de CLI

Ubicación: `sdk/cli/test/e2e/cli-smoke.test.ts`

```typescript
describe('CLI E2E Smoke Tests', () => {
  it('smart-cli validate --help shows all flags', async () => {
    const result = await execAsync('node dist/cli.js validate --help');
    expect(result.stdout).toContain('--satellite');
    expect(result.stdout).toContain('--core');
    expect(result.stdout).toContain('--ruleset');
  });

  it('smart-cli agent install creates ruleset', async () => {
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

### 5.2 Pruebas de Integración de MCP

Prueba de JSON-RPC sobre stdio:

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

## 6. Fixtures de Datos de Test

### 6.1 Estructura del Directorio de Fixtures

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

### 6.2 Uso de Fixtures

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

## 7. Integración CI

### 7.1 Flujo de Trabajo de GitHub Actions

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

### 7.2 Compuertas de Cobertura

| Verificación | Umbral | Acción en Falla |
|--------------|--------|-----------------|
| Cobertura unitaria | 80% | Bloquear merge |
| Cobertura de integración | 60% | Bloquear merge |
| E2E exitoso | 100% | Bloquear merge |
| Cumplimiento del protocolo MCP | Todas las pruebas pasan | Bloquear merge |

---

## 8. Hoja de Ruta de Testing

| Fase | Enfoque | Criterios de Salida |
|------|---------|---------------------|
| Fase 1 | Pruebas unitarias para servicios core | 80% de cobertura, todos los tests P0 en verde |
| Fase 2 | Pruebas de integración, tests de manejadores MCP | 85% de cobertura, comandos CLI probados |
| Fase 3 | Pruebas de humo E2E, flujo stdio MCP | 90% de cobertura, pipeline completo en verde |

---

## 9. Referencias

- [SDK/CLI/MCP Target Architecture](./sdk-cli-mcp-target-architecture.md)
- [Gap Analysis](./sdk-cli-mcp-gap-analysis.md)
- [CLI Command Catalog](./cli-command-catalog.md)
- [MCP Capability Catalog](./mcp-capability-catalog.md)
