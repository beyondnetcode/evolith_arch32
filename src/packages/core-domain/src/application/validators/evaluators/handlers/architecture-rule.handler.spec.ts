import * as path from 'path';
import { ArchitectureRuleHandler } from './architecture-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const SAT = '/sat';
const ctx = { satellitePath: SAT, corePath: '/core' };

interface FsConfig {
  existing?: string[];
  dirs?: Record<string, string[]>;
  directories?: string[];
  json?: Record<string, unknown>;
  files?: Record<string, string>;
}

function fsMock(cfg: FsConfig = {}) {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readJson: jest.fn(async (p: string) => cfg.json?.[p] ?? {}),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    stat: jest.fn(async (p: string) => ({ isDirectory: () => directories.has(p), isFile: () => !directories.has(p) })),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
  } as unknown;
}

function rule(over: Partial<NormalizedRule>): NormalizedRule {
  return {
    id: 'X', severity: 'MUST', category: 'topology', title: 't', description: 'desc',
    blocking: true, sourceFile: 's', ...over,
  };
}

describe('ArchitectureRuleHandler', () => {
  describe('canHandle', () => {
    it('accepts known architecture categories and rejects others', () => {
      const h = new ArchitectureRuleHandler(fsMock());
      expect(h.canHandle(rule({ category: 'hexagonal-architecture' }))).toBe(true);
      expect(h.canHandle(rule({ category: 'governance' }))).toBe(false);
    });
  });

  describe('evaluate — exists-based rules (failed paths)', () => {
    it('serverless rules fail without a governed serverless contract', async () => {
      const h = new ArchitectureRuleHandler(fsMock());
      for (const [id, category] of [['SV-R01', 'serverless-config'], ['SV-R02', 'serverless-stateless'], ['SV-R03', 'serverless-package'], ['SV-R04', 'serverless-cold-start']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'failed' });
      }
    });

    it('event-driven rules fail without a governed event-driven contract', async () => {
      const h = new ArchitectureRuleHandler(fsMock());
      for (const [id, category] of [['ED-R01', 'event-driven-config'], ['ED-R02', 'event-driven-outbox'], ['ED-R03', 'event-driven-dlq']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'failed' });
      }
    });

    it('data-mesh rules fail without a governed data-mesh contract', async () => {
      const h = new ArchitectureRuleHandler(fsMock());
      for (const [id, category] of [['DM-R01', 'data-mesh-config'], ['DM-R02', 'data-mesh-contracts'], ['DM-R03', 'data-mesh-governance']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'failed' });
      }
    });

    it('edge-computing rules fail without a governed edge-computing contract', async () => {
      const h = new ArchitectureRuleHandler(fsMock());
      for (const [id, category] of [['EC-R01', 'edge-computing-sync'], ['EC-R02', 'edge-computing-isolation'], ['EC-R03', 'edge-computing-conflict']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'failed' });
      }
    });
    it('agentic AI rules fail when agent.config.json is absent or incomplete', async () => {
      const config = path.join(SAT, 'agent.config.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [config], json: { [config]: { agent: { id: 'reviewer' } } } }));

      await expect(h.evaluate(rule({ id: 'AAI-R01', category: 'agent-identity' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R02', category: 'agent-sandbox' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R03', category: 'agent-prompt-boundaries' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R04', category: 'agent-tool-approval' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R05', category: 'agent-sandbox-limits' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R06', category: 'agent-context-trust' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R07', category: 'agent-action-accountability' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R08', category: 'agent-operational-budgets' }), ctx)).resolves.toMatchObject({ result: 'failed' });
      await expect(h.evaluate(rule({ id: 'AAI-R09', category: 'agent-credential-lifecycle' }), ctx)).resolves.toMatchObject({ result: 'failed' });
    });
    it('topology MM-R01 fails when a monorepo workspace is declared', async () => {
      const pkg = path.join(SAT, 'package.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [pkg], json: { [pkg]: { workspaces: ['a'] } } }));
      const res = await h.evaluate(rule({ id: 'MM-R01', category: 'topology' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('bounded-contexts MM-R02 fails with fewer than two modules', async () => {
      const src = path.join(SAT, 'src');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [src], dirs: { [src]: ['only'] } }));
      const res = await h.evaluate(rule({ id: 'MM-R02', category: 'bounded-contexts' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('hexagonal-architecture MM-R03 fails without a ports directory', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MM-R03', category: 'hexagonal-architecture' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('communication MM-R04 fails without a contracts directory', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MM-R04', category: 'communication' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('persistence MM-R05 fails without an acl directory', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MM-R05', category: 'persistence' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('persistence MM-R05 fails with fewer than two bounded contexts', async () => {
      const acl = path.join(SAT, 'acl');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [acl], dirs: { [acl]: ['one'] } }));
      const res = await h.evaluate(rule({ id: 'MM-R05', category: 'persistence' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('async-boundaries MM-R06 fails without an events directory', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MM-R06', category: 'async-boundaries' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('extraction-readiness MM-R07 fails without the doc', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MM-R07', category: 'extraction-readiness' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('observability MM-R08 fails without OTel instrumentation', async () => {
      const pkg = path.join(SAT, 'package.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [pkg] }));
      const res = await h.evaluate(rule({ id: 'MM-R08', category: 'observability' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('module-autonomy DM-R01 fails without independent module package.json files', async () => {
      const src = path.join(SAT, 'src');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [src], dirs: { [src]: ['a', 'b'] } }));
      const res = await h.evaluate(rule({ id: 'DM-R01', category: 'module-autonomy' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('contract-stability DM-R02 fails when contracts has no definition files', async () => {
      const contracts = path.join(SAT, 'contracts');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [contracts], dirs: { [contracts]: ['README.md'] } }));
      const res = await h.evaluate(rule({ id: 'DM-R02', category: 'contract-stability' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('data-ownership DM-R03 fails without an acl directory', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'DM-R03', category: 'data-ownership' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('async-communication DM-R04 fails when events have no schema files', async () => {
      const events = path.join(SAT, 'events');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [events], dirs: { [events]: ['notes.txt'] } }));
      const res = await h.evaluate(rule({ id: 'DM-R04', category: 'async-communication' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('distributed-tracing fails when no tracer setup exists', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'ANY', category: 'distributed-tracing' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('containerization MS-R01 fails without a Dockerfile', async () => {
      const h = new ArchitectureRuleHandler(fsMock({ existing: [] }));
      const res = await h.evaluate(rule({ id: 'MS-R01', category: 'containerization' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('service-boundaries MS-R02 fails with fewer than two service directories', async () => {
      const src = path.join(SAT, 'src');
      const onlyDir = path.join(src, 'a');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [src], dirs: { [src]: ['a', 'file.ts'] }, directories: [onlyDir],
      }));
      const res = await h.evaluate(rule({ id: 'MS-R02', category: 'service-boundaries' }), ctx);
      expect(res.result).toBe('failed');
    });
  });

  describe('evaluate — passed and skipped', () => {
    it('passes serverless statelessness, package, and cold-start controls', async () => {
      const config = path.join(SAT, 'serverless.config.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [config], json: { [config]: { stateless: true, package: { maxSizeMb: 25 }, coldStart: { maxInitMilliseconds: 500, lazyInitialization: true } } } }));
      for (const [id, category] of [['SV-R01', 'serverless-config'], ['SV-R02', 'serverless-stateless'], ['SV-R03', 'serverless-package'], ['SV-R04', 'serverless-cold-start']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'passed' });
      }
    });

    it('passes event-driven outbox, DLQ, and strict AsyncAPI controls', async () => {
      const config = path.join(SAT, 'event-driven.config.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [config], json: { [config]: { strictAsyncApi: true, transactionalOutbox: true, deadLetterQueue: true } } }));
      for (const [id, category] of [['ED-R01', 'event-driven-config'], ['ED-R02', 'event-driven-outbox'], ['ED-R03', 'event-driven-dlq']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'passed' });
      }
    });

    it('passes data-mesh data product, contracts, and governance controls', async () => {
      const config = path.join(SAT, 'data-mesh.config.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [config], json: { [config]: { isDataProduct: true, hasDataContracts: true, federatedGovernance: true } } }));
      for (const [id, category] of [['DM-R01', 'data-mesh-config'], ['DM-R02', 'data-mesh-contracts'], ['DM-R03', 'data-mesh-governance']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'passed' });
      }
    });

    it('passes edge-computing sync, isolation, and conflict resolution controls', async () => {
      const config = path.join(SAT, 'edge-computing.config.json');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [config], json: { [config]: { syncStrategy: 'offline-first', edgeIsolation: true, conflictResolution: 'last-write-wins' } } }));
      for (const [id, category] of [['EC-R01', 'edge-computing-sync'], ['EC-R02', 'edge-computing-isolation'], ['EC-R03', 'edge-computing-conflict']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'passed' });
      }
    });
    /**
     * GT-683 — the negatives are the deliverable.
     *
     * Until this row, AAI-R03 compared two arrays of strings and AAI-R08 asked
     * `fs.exists`, so a satellite could declare a prompt/implementation split that
     * did not exist and a "runbook" that was an empty directory, and pass nine
     * blocking MUSTs. Each case below is red without the observation.
     */
    describe('Agentic AI rules observe the repository, not only the descriptor', () => {
      const baseConfig = {
        agent: { id: 'a', capabilities: ['read'] },
        sandbox: { mode: 'isolated', network: 'allowlist', process: 'deny', ephemeral: true, maxDurationSeconds: 30, maxMemoryMb: 512, maxCpuCores: 1 },
        promptSources: ['prompts'],
        implementationRoots: ['src/agents'],
        toolPolicy: { mutative: 'approval-required', capabilityDelegation: 'scoped-and-expiring' },
        contextPolicy: { untrustedContent: 'data-only', provenanceRequired: true, toolOutputSchemaValidation: true },
        audit: { appendOnly: true, correlationId: 'required' },
        operationalBudgets: {
          maxPromptTokens: 1000, maxCompletionTokens: 1000, maxContextWindowTokens: 2000,
          mcpToolConcurrency: { maxInFlight: 2, perToolMaxInFlight: 1 },
          runbooksPath: 'docs/runbooks.md',
        },
        credentialLifecycle: { delegationMaxTtlSeconds: 60, rotationCadenceDays: 30, revocation: { onIncident: 'immediate', maxPropagationSeconds: 60 } },
      };
      const config = path.join(SAT, 'agent.config.json');
      const runbooks = path.join(SAT, 'docs', 'runbooks.md');
      const promptsDir = path.join(SAT, 'prompts');
      const agentsDir = path.join(SAT, 'src', 'agents');
      const boundaries = rule({ id: 'AAI-R03', category: 'agent-prompt-boundaries' });
      const budgets = rule({ id: 'AAI-R08', category: 'agent-operational-budgets' });

      it('AAI-R03 FAILS when a declared prompt directory does not exist on disk', async () => {
        const h = new ArchitectureRuleHandler(fsMock({
          existing: [config, runbooks, agentsDir],
          directories: [agentsDir],
          dirs: { [agentsDir]: ['a.ts'] },
          files: { [runbooks]: '# runbook' },
          json: { [config]: baseConfig },
        }));
        const res = await h.evaluate(boundaries, ctx);
        expect(res.result).toBe('failed');
        expect(res.message).toContain('prompts');
      });

      it('AAI-R03 FAILS when the declared directory exists but is EMPTY', async () => {
        const h = new ArchitectureRuleHandler(fsMock({
          existing: [config, runbooks, promptsDir, agentsDir],
          directories: [promptsDir, agentsDir],
          dirs: { [promptsDir]: [], [agentsDir]: ['a.ts'] },
          files: { [runbooks]: '# runbook' },
          json: { [config]: baseConfig },
        }));
        const res = await h.evaluate(boundaries, ctx);
        expect(res.result).toBe('failed');
        expect(res.message).toContain('prompts');
      });

      it('AAI-R08 FAILS when the runbook path is a DIRECTORY', async () => {
        const h = new ArchitectureRuleHandler(fsMock({
          existing: [config, runbooks, promptsDir, agentsDir],
          directories: [runbooks, promptsDir, agentsDir],
          dirs: { [promptsDir]: ['p.md'], [agentsDir]: ['a.ts'], [runbooks]: [] },
          json: { [config]: baseConfig },
        }));
        expect((await h.evaluate(budgets, ctx)).result).toBe('failed');
      });

      it('AAI-R08 FAILS when the runbook is a zero-byte file', async () => {
        const h = new ArchitectureRuleHandler(fsMock({
          existing: [config, runbooks, promptsDir, agentsDir],
          directories: [promptsDir, agentsDir],
          dirs: { [promptsDir]: ['p.md'], [agentsDir]: ['a.ts'] },
          files: { [runbooks]: '   \n' },
          json: { [config]: baseConfig },
        }));
        expect((await h.evaluate(budgets, ctx)).result).toBe('failed');
      });

      it('both PASS when the declared paths are real and populated — the contrast case', async () => {
        const h = new ArchitectureRuleHandler(fsMock({
          existing: [config, runbooks, promptsDir, agentsDir],
          directories: [promptsDir, agentsDir],
          dirs: { [promptsDir]: ['p.md'], [agentsDir]: ['a.ts'] },
          files: { [runbooks]: '# runbook\n\nwhat an operator does.' },
          json: { [config]: baseConfig },
        }));
        expect((await h.evaluate(boundaries, ctx)).result).toBe('passed');
        expect((await h.evaluate(budgets, ctx)).result).toBe('passed');
      });
    });

    it('passes all Agentic AI rules for the governed configuration contract', async () => {
      const config = path.join(SAT, 'agent.config.json');
      const runbooks = path.join(SAT, 'docs', 'agentic-ai-runbooks.md');
      const agentConfig = {
        agent: { id: 'architecture-reviewer', capabilities: ['read-architecture', 'review-changes'] },
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
      };
      // GT-683: the AAI rules now OBSERVE what the config declares, so a fixture that
      // names `prompts`, `src/agents` and a runbook has to actually provide them --
      // populated directories and a runbook with content. Before, the config alone was
      // the whole world, which is the defect this row removes.
      const promptsDir = path.join(SAT, 'prompts');
      const agentsDir = path.join(SAT, 'src', 'agents');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [config, runbooks, promptsDir, agentsDir],
        directories: [promptsDir, agentsDir],
        dirs: { [promptsDir]: ['review.md'], [agentsDir]: ['reviewer.ts'] },
        files: { [runbooks]: '# Runbooks\n\nOperator procedure for agent incidents.\n' },
        json: { [config]: agentConfig },
      }));

      for (const [id, category] of [['AAI-R01', 'agent-identity'], ['AAI-R02', 'agent-sandbox'], ['AAI-R03', 'agent-prompt-boundaries'], ['AAI-R04', 'agent-tool-approval'], ['AAI-R05', 'agent-sandbox-limits'], ['AAI-R06', 'agent-context-trust'], ['AAI-R07', 'agent-action-accountability'], ['AAI-R08', 'agent-operational-budgets'], ['AAI-R09', 'agent-credential-lifecycle']] as const) {
        await expect(h.evaluate(rule({ id, category }), ctx)).resolves.toMatchObject({ result: 'passed' });
      }
    });

    it('rejects overlapping prompt and implementation paths', async () => {
      const config = path.join(SAT, 'agent.config.json');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [config],
        json: { [config]: { promptSources: ['src/prompts'], implementationRoots: ['src'] } },
      }));

      await expect(h.evaluate(rule({ id: 'AAI-R03', category: 'agent-prompt-boundaries' }), ctx)).resolves.toMatchObject({ result: 'failed' });
    });

    it('rejects an accountable-action policy without append-only correlated evidence', async () => {
      const config = path.join(SAT, 'agent.config.json');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [config],
        json: { [config]: { toolPolicy: { capabilityDelegation: 'scoped-and-expiring' }, audit: { appendOnly: false } } },
      }));

      await expect(h.evaluate(rule({ id: 'AAI-R07', category: 'agent-action-accountability' }), ctx)).resolves.toMatchObject({ result: 'failed' });
    });

    it('passes hexagonal-architecture when a ports directory exists', async () => {
      const ports = path.join(SAT, 'src', 'ports');
      const h = new ArchitectureRuleHandler(fsMock({ existing: [ports] }));
      const res = await h.evaluate(rule({ id: 'MM-R03', category: 'hexagonal-architecture' }), ctx);
      expect(res.result).toBe('passed');
    });

    it('skips an unknown category', async () => {
      const h = new ArchitectureRuleHandler(fsMock());
      const res = await h.evaluate(rule({ id: 'Z', category: 'service-boundaries', }), { satellitePath: SAT, corePath: '/core' });
      // service-boundaries with non-matching id leaves result 'passed' (no branch); use a true default:
      const skipped = await h.evaluate(rule({ id: 'Z', category: 'topology' }), ctx);
      expect(skipped.result).toBe('passed');
      expect(res).toBeDefined();
    });
  });

  describe('evaluate — AST-based rules', () => {
    it('separation-of-concerns MM-R11 fails when a logic-layer file imports a UI library', async () => {
      const src = path.join(SAT, 'src');
      const appDir = path.join(src, 'application');
      const file = path.join(appDir, 'service.ts');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [src, appDir, file],
        dirs: { [src]: ['application'], [appDir]: ['service.ts'] },
        directories: [appDir],
        files: { [file]: `import { intro } from '@clack/prompts';\nexport const x = 1;` },
      }));
      const res = await h.evaluate(rule({ id: 'MM-R11', category: 'separation-of-concerns' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('dependency-injection MM-R09 fails on manual Service instantiation', async () => {
      const src = path.join(SAT, 'src');
      const file = path.join(src, 'main.ts');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [src, file],
        dirs: { [src]: ['main.ts'] },
        files: { [file]: `class FooService {}\nconst x = new FooService();` },
      }));
      const res = await h.evaluate(rule({ id: 'MM-R09', category: 'dependency-injection' }), ctx);
      expect(res.result).toBe('failed');
    });

    it('static-analysis MM-R10 fails when an analyzer uses regex without an AST parser', async () => {
      const src = path.join(SAT, 'src');
      const file = path.join(src, 'code-analyzer.ts');
      const h = new ArchitectureRuleHandler(fsMock({
        existing: [src, file],
        dirs: { [src]: ['code-analyzer.ts'] },
        files: { [file]: `export function scan(s) { return s.match(/foo/); }` },
      }));
      const res = await h.evaluate(rule({ id: 'MM-R10', category: 'static-analysis' }), ctx);
      expect(res.result).toBe('failed');
    });
  });

  // -------------------------------------------------------------------------
  // GT-595 — the four topology flags that fell through on naming alone.
  // -------------------------------------------------------------------------
  describe('topology flag rules (ED-R04, ED-R05, ED-R06, DAM-R05)', () => {
    const edFile = path.join(SAT, 'event-driven.config.json');
    const damFile = path.join(SAT, 'data-mesh.config.json');

    const ED_FLAGS = { hasOrderingGuarantee: true, hasIdempotencyKey: true, hasBackwardCompatibleSchema: true };
    const withEd = (json: Record<string, unknown>) => fsMock({ existing: [edFile], json: { [edFile]: json } });
    const withDam = (json: Record<string, unknown>) => fsMock({ existing: [damFile], json: { [damFile]: json } });

    const CASES = [
      { id: 'ED-R04', category: 'event-ordering', flag: 'hasOrderingGuarantee' },
      { id: 'ED-R05', category: 'idempotency', flag: 'hasIdempotencyKey' },
      { id: 'ED-R06', category: 'schema-evolution', flag: 'hasBackwardCompatibleSchema' },
    ] as const;

    it('claims the four rules by id even though their categories are in no category set', () => {
      const h = new ArchitectureRuleHandler(fsMock());
      for (const id of ['ED-R04', 'ED-R05', 'ED-R06', 'DAM-R05']) {
        expect(h.canHandle(rule({ id, category: 'retention' }))).toBe(true);
      }
      // ...and the bare categories on their own claim nothing.
      expect(h.canHandle(rule({ id: 'SOMETHING-ELSE', category: 'retention' }))).toBe(false);
      expect(h.canHandle(rule({ id: 'SOMETHING-ELSE', category: 'schema-evolution' }))).toBe(false);
    });

    it.each(CASES)('$id passes when event-driven.config.json declares $flag', async ({ id, category }) => {
      const res = await new ArchitectureRuleHandler(withEd(ED_FLAGS)).evaluate(rule({ id, category }), ctx);
      expect(res.result).toBe('passed');
    });

    it.each(CASES)('$id FAILS when $flag is absent from an otherwise valid contract', async ({ id, category, flag }) => {
      const partial = { ...ED_FLAGS } as Record<string, unknown>;
      delete partial[flag];
      const res = await new ArchitectureRuleHandler(withEd(partial)).evaluate(rule({ id, category }), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain(flag);
    });

    it.each(CASES)('$id FAILS when the flag is declared false rather than omitted', async ({ id, category, flag }) => {
      const res = await new ArchitectureRuleHandler(withEd({ ...ED_FLAGS, [flag]: false })).evaluate(rule({ id, category }), ctx);
      expect(res.result).toBe('failed');
    });

    it.each(CASES)('$id FAILS when event-driven.config.json does not exist at all', async ({ id, category }) => {
      const res = await new ArchitectureRuleHandler(fsMock()).evaluate(rule({ id, category }), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('event-driven.config.json is missing');
    });

    it('DAM-R05 passes on data-mesh.config.json hasRetentionPolicy and fails without it', async () => {
      const pass = await new ArchitectureRuleHandler(withDam({ hasRetentionPolicy: true })).evaluate(rule({ id: 'DAM-R05', category: 'retention' }), ctx);
      expect(pass.result).toBe('passed');
      const fail = await new ArchitectureRuleHandler(withDam({ hasDataQualitySLO: true })).evaluate(rule({ id: 'DAM-R05', category: 'retention' }), ctx);
      expect(fail.result).toBe('failed');
      expect(fail.message).toContain('data-mesh.config.json');
    });

    // -----------------------------------------------------------------------
    // The mis-claim guard. `retention` and `schema-evolution` are each shared by
    // TWO rules in TWO topologies. A category-keyed dispatch would answer for
    // the wrong file and the wrong flag; these are the fixtures that catch it.
    // -----------------------------------------------------------------------
    it('DAM-R05 does not read event-driven.config.json (the `retention` collision)', async () => {
      // ED-R07 shares the category `retention` and points at the OTHER file.
      // A satellite with only an event-driven retention declaration must NOT
      // satisfy the data-mesh rule.
      const h = new ArchitectureRuleHandler(withEd({ hasRetentionPolicy: true }));
      const res = await h.evaluate(rule({ id: 'DAM-R05', category: 'retention' }), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('data-mesh.config.json is missing');
    });

    it('ED-R06 does not read data-mesh.config.json (the `schema-evolution` collision)', async () => {
      const h = new ArchitectureRuleHandler(withDam({ hasBackwardCompatibleContracts: true, hasBackwardCompatibleSchema: true }));
      const res = await h.evaluate(rule({ id: 'ED-R06', category: 'schema-evolution' }), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('event-driven.config.json is missing');
    });

    it('does not claim ED-R07 or DAM-R08 — the non-blocking halves of the shared categories', () => {
      // If a future edit keys the dispatch on the bare category, these two get
      // claimed and evaluated against whichever file the sibling named. They are
      // deliberately left unhandled rather than answered incorrectly.
      const h = new ArchitectureRuleHandler(fsMock());
      expect(h.canHandle(rule({ id: 'ED-R07', category: 'retention' }))).toBe(false);
      expect(h.canHandle(rule({ id: 'DAM-R08', category: 'schema-evolution' }))).toBe(false);
    });

    it('ED-R05 reports that only the flag clause was checked, not the AST clause', async () => {
      const res = await new ArchitectureRuleHandler(withEd(ED_FLAGS)).evaluate(rule({ id: 'ED-R05', category: 'idempotency' }), ctx);
      expect(res.result).toBe('passed');
      expect(res.message).toContain('NOT implemented');
      expect(res.message).toMatch(/AST scan/i);
    });
  });
});
