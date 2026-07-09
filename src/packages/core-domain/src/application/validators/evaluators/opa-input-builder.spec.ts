import * as path from 'path';
import { OpaInputBuilder } from './opa-input-builder';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; directories?: string[]; json?: Record<string, unknown>; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readJson: jest.fn(async (p: string) => {
      if (cfg.json && p in cfg.json) return cfg.json[p];
      throw new Error(`no json: ${p}`);
    }),
    readFile: jest.fn(async (p: string) => {
      if (cfg.files && p in cfg.files) return cfg.files[p];
      throw new Error(`no file: ${p}`);
    }),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
  } as unknown;
}

describe('OpaInputBuilder', () => {
  it('builds a minimal input when nothing exists', async () => {
    const input = await new OpaInputBuilder(fsMock()).build(ctx);

    expect(input.satellitePath).toBe(SAT);
    expect(input.corePath).toBe(CORE);
    expect(input.satellite.packageJson).toBeNull();
    expect(input.satellite.hasPackageLock).toBe(false);
    expect(input.satellite.directories).toEqual([]);
    expect(input.satellite.workflows).toEqual({});
    expect(input.satellite.sourceFiles).toEqual([]);
    expect(input.core.adrs).toEqual([]);
    expect(input.core.cli.hasMainJs).toBe(false);
    expect(input.core.cli.mcpServerSource).toBeNull();
  });

  it('omits context/gate/evidence when ctx.facts is undefined (GT-380 byte-for-byte fallback)', async () => {
    const input = await new OpaInputBuilder(fsMock()).build(ctx) as any;
    expect(input.context).toBeUndefined();
    expect(input.gate).toBeUndefined();
    expect(input.evidence).toBeUndefined();
    expect(input.waiver).toBeUndefined();
    expect(input.tenantId).toBeUndefined();
    expect(input.evaluationDate).toBeUndefined();
  });

  it('merges declared facts into input.gate/evidence/context/tenantId without touching satellite/core (GT-380)', async () => {
    const facts = {
      context: { tenant: { tenantId: 't1' }, dod: { coveragePercent: 90 } },
      gate: { phase: 1, mandatoryEvidence: [{ artifact: 'adr.md' }] },
      evidence: [{ artifact: 'adr.md', status: 'present' }],
      tenantId: 't1',
    };
    const input = await new OpaInputBuilder(fsMock()).build({ ...ctx, facts }) as any;
    expect(input.gate.mandatoryEvidence[0].artifact).toBe('adr.md');
    expect(input.evidence[0].artifact).toBe('adr.md');
    expect(input.context.tenant.tenantId).toBe('t1');
    expect(input.context.dod.coveragePercent).toBe(90);
    expect(input.tenantId).toBe('t1');
    // FS-scanned surfaces remain intact (not overwritten).
    expect(input.satellitePath).toBe(SAT);
    expect(input.satellite.directories).toEqual([]);
    expect(input.core.adrs).toEqual([]);
  });

  it('builds a populated input across satellite and core surfaces', async () => {
    const satPkg = path.join(SAT, 'package.json');
    const satLock = path.join(SAT, 'package-lock.json');
    const wfDir = path.join(SAT, '.github', 'workflows');
    const wfFile = path.join(wfDir, 'ci.yml');
    const contracts = path.join(SAT, 'contracts');
    const srcDir = path.join(SAT, 'src');
    const srcFile = path.join(srcDir, 'main.ts');
    const specFile = path.join(srcDir, 'main.spec.ts');

    const coreEvDir = path.join(CORE, '.harness', 'evidence');
    const coreEvFile = path.join(coreEvDir, 'gate.json');
    const adrDir = path.join(CORE, 'reference', 'core', 'architecture', 'adrs');
    const adrFile = path.join(adrDir, '0001-foo.md');
    const mcpServer = path.join(CORE, 'sdk', 'cli', 'src', 'core', 'mcp', 'server.ts');
    const distDir = path.join(CORE, 'sdk', 'cli', 'dist');
    const distSpec = path.join(distDir, 'x.spec.js');
    const wsBase = path.join(SAT, 'packages');
    const wsPkg = path.join(wsBase, 'a', 'package.json');

    const fs = fsMock({
      existing: [
        SAT, CORE, satPkg, satLock, wfDir, wfFile, contracts, srcDir, srcFile, specFile,
        coreEvDir, coreEvFile, adrDir, adrFile, mcpServer, distDir, distSpec, wsBase, wsPkg,
      ],
      directories: [SAT, CORE, wfDir, contracts, srcDir, coreEvDir, adrDir, distDir, wsBase],
      dirs: {
        [SAT]: ['src', 'contracts', 'package.json'],
        [wfDir]: ['ci.yml'],
        [srcDir]: ['main.ts', 'main.spec.ts'],
        [coreEvDir]: ['gate.json'],
        [adrDir]: ['0001-foo.md'],
        [distDir]: ['x.spec.js'],
        [wsBase]: ['a'],
      },
      json: {
        [satPkg]: { name: 'sat', workspaces: ['packages/*'] },
        [wsPkg]: { name: 'sat-a' },
        [coreEvFile]: { id: 'gate', status: 'passed' },
      },
      files: {
        [wfFile]: 'jobs:\n  build:\n    steps: [npm ci]',
        [srcFile]: `import { intro } from '@clack/prompts';\nclass FooService {}\nconst s = new FooService();\nconst m = 'x'.match(/y/);`,
        [specFile]: `describe('x', () => {});`,
        [mcpServer]: 'const apiKey = 1;',
      },
    });

    const input = await new OpaInputBuilder(fs).build(ctx);

    expect(input.satellite.packageJson).toEqual({ name: 'sat', workspaces: ['packages/*'] });
    expect(input.satellite.hasPackageLock).toBe(true);
    expect(input.satellite.hasContracts).toBe(true);
    expect(input.satellite.directories.sort()).toEqual(['contracts', 'src']);
    expect(Object.keys(input.satellite.workflows)).toEqual(['ci.yml']);
    expect(input.satellite.workspacePackageJsons[0].content.name).toBe('sat');
    expect(input.satellite.workspacePackageJsons.some((p: unknown) => p.content.name === 'sat-a')).toBe(true);

    const mainInfo = input.satellite.sourceFiles.find((f: unknown) => f.path.endsWith('main.ts'));
    expect(mainInfo.hasUiImport).toBe(true);
    expect(mainInfo.hasManualInstantiation).toBe(true);
    expect(mainInfo.usesRegexForCode).toBe(true);

    expect(input.core.adrs).toContain(adrFile);
    expect(input.core.evidence['gate.json']).toEqual({ id: 'gate', status: 'passed' });
    expect(input.core.cli.hasMainJs).toBe(false);
    expect(input.core.cli.hasTests).toBe(true);
    expect(input.core.cli.mcpServerSource).toContain('apiKey');
  });

  it('derives Agentic AI policy inputs from agent.config.json', async () => {
    const agentConfig = path.join(SAT, 'agent.config.json');
    const runbooks = path.join(SAT, 'docs', 'agentic-ai-runbooks.md');
    const input = await new OpaInputBuilder(fsMock({
      existing: [agentConfig, runbooks],
      json: {
        [agentConfig]: {
          agent: { id: 'architecture-reviewer', capabilities: ['read-architecture'] },
          sandbox: { mode: 'isolated', network: 'allowlist', process: 'deny', ephemeral: true, maxDurationSeconds: 30, maxMemoryMb: 512, maxCpuCores: 1 },
          promptSources: ['prompts'],
          implementationRoots: ['src/agents'],
          contextPolicy: { untrustedContent: 'data-only', provenanceRequired: true, toolOutputSchemaValidation: true },
          toolPolicy: { mutative: 'approval-required', capabilityDelegation: 'scoped-and-expiring' },
          audit: { appendOnly: true, correlationId: 'required' },
          operationalBudgets: {
            maxPromptTokens: 16000,
            maxCompletionTokens: 4000,
            maxContextWindowTokens: 128000,
            mcpToolConcurrency: { maxInFlight: 4, perToolMaxInFlight: 2 },
            runbooksPath: 'docs/agentic-ai-runbooks.md',
          },
          credentialLifecycle: {
            delegationMaxTtlSeconds: 900,
            rotationCadenceDays: 30,
            revocation: { onIncident: 'immediate', maxPropagationSeconds: 60 },
          },
        },
      },
    })).build(ctx);

    expect(input.satellite.agenticAi).toEqual({
      hasIdentity: true,
      hasIsolatedSandbox: true,
      hasSeparatedPromptAndImplementation: true,
      requiresApprovalForMutativeTools: true,
      hasEphemeralSandboxLimits: true,
      hasTrustedContextPolicy: true,
      hasAccountableActions: true,
      hasOperationalBudgets: true,
      hasCredentialLifecycle: true,
    });
  });
});
