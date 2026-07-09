import { SatelliteContractRuleHandler } from './satellite-contract-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import * as yamlLib from 'yaml';
import * as path from 'path';

const SAT = '/sat';
const CORE = '/core';
const ctx = { satellitePath: SAT, corePath: CORE };

function fsMock(cfg: { existing?: string[]; files?: Record<string, string>; dirs?: Record<string, Array<{ name: string; dir?: boolean }>> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
    readdir: jest.fn(async (p: string) => {
      const entries = cfg.dirs?.[p] ?? [];
      return entries.map(e => ({ name: e.name, isDirectory: () => Boolean(e.dir), isFile: () => !e.dir }));
    }),
  } as unknown;
}

const yamlParser = { parse: (c: string) => yamlLib.parse(c), stringify: (d: unknown) => yamlLib.stringify(d) } as unknown;

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'satellite-contract', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

const yaml = path.join(SAT, 'evolith.yaml');

describe('SatelliteContractRuleHandler', () => {
  it('canHandle matches SVC-*', () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect(h.canHandle(rule('SVC-01'))).toBe(true);
    expect(h.canHandle(rule('SVC-05'))).toBe(true);
    expect(h.canHandle(rule('DOD-01'))).toBe(false);
  });

  it('SVC-01 fails without evolith.yaml', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-01'), ctx)).result).toBe('failed');
  });

  it('SVC-01 passes with evolith.yaml', async () => {
    const h = new SatelliteContractRuleHandler(fsMock({ existing: [yaml] }), yamlParser);
    expect((await h.evaluate(rule('SVC-01'), ctx)).result).toBe('passed');
  });

  it('SVC-02 always skips (registry check)', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-02'), ctx)).result).toBe('skipped');
  });

  it('SVC-03 checks ADR-0047 for F1 satellites', async () => {
    const compliant = `metadata:\n  phase: F1\nspec:\n  compliance:\n    adrRegistry:\n      - core/ADR-0047\n`;
    const h = new SatelliteContractRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: compliant } }), yamlParser);
    expect((await h.evaluate(rule('SVC-03'), ctx)).result).toBe('passed');

    const missing = `metadata:\n  phase: F1\nspec:\n  compliance:\n    adrRegistry: []\n`;
    const h2 = new SatelliteContractRuleHandler(fsMock({ existing: [yaml], files: { [yaml]: missing } }), yamlParser);
    expect((await h2.evaluate(rule('SVC-03'), ctx)).result).toBe('failed');
  });

  it('SVC-04 checks extraction readiness for F2', async () => {
    const f2yaml = `metadata:\n  phase: F2\n`;
    const h = new SatelliteContractRuleHandler(fsMock({
      existing: [yaml, path.join(SAT, 'docs', 'extraction-readiness.md')],
      files: { [yaml]: f2yaml },
    }), yamlParser);
    expect((await h.evaluate(rule('SVC-04'), ctx)).result).toBe('passed');
  });

  it('SVC-05 always skips (registry check)', async () => {
    const h = new SatelliteContractRuleHandler(fsMock(), yamlParser);
    expect((await h.evaluate(rule('SVC-05'), ctx)).result).toBe('skipped');
  });

  describe('SVC-06 workspace integrity (ADR-0109)', () => {
    const workspaceYaml = path.join(SAT, 'evolith.workspace.yaml');
    const descriptor = (projects: Array<{ name: string; path: string }>) =>
      `apiVersion: evolith.dev/v1\nkind: SatelliteWorkspace\nmetadata:\n  name: ws\nspec:\n  projects:\n${projects.map(p => `    - name: ${p.name}\n      path: ${p.path}`).join('\n')}\n`;

    it('skips when there is no evolith.workspace.yaml (single-project satellite)', async () => {
      const h = new SatelliteContractRuleHandler(fsMock({ existing: [yaml] }), yamlParser);
      expect((await h.evaluate(rule('SVC-06'), ctx)).result).toBe('skipped');
    });

    it('passes when declared projects and discovered manifests correspond one-to-one', async () => {
      const h = new SatelliteContractRuleHandler(fsMock({
        existing: [workspaceYaml, path.join(SAT, 'mms', 'evolith.yaml'), path.join(SAT, 'tracker', 'evolith.yaml')],
        files: { [workspaceYaml]: descriptor([{ name: 'mms', path: 'mms' }, { name: 'tracker', path: 'tracker' }]) },
        dirs: {
          [SAT]: [{ name: 'mms', dir: true }, { name: 'tracker', dir: true }, { name: 'evolith.workspace.yaml' }],
          [path.join(SAT, 'mms')]: [{ name: 'evolith.yaml' }],
          [path.join(SAT, 'tracker')]: [{ name: 'evolith.yaml' }],
        },
      }), yamlParser);
      expect((await h.evaluate(rule('SVC-06'), ctx)).result).toBe('passed');
    });

    it('fails when a declared project is missing its evolith.yaml', async () => {
      const h = new SatelliteContractRuleHandler(fsMock({
        existing: [workspaceYaml, path.join(SAT, 'mms', 'evolith.yaml')],
        files: { [workspaceYaml]: descriptor([{ name: 'mms', path: 'mms' }, { name: 'tracker', path: 'tracker' }]) },
        dirs: {
          [SAT]: [{ name: 'mms', dir: true }, { name: 'evolith.workspace.yaml' }],
          [path.join(SAT, 'mms')]: [{ name: 'evolith.yaml' }],
        },
      }), yamlParser);
      const res = await h.evaluate(rule('SVC-06'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('tracker');
    });

    it('fails when an undeclared (stray) evolith.yaml is discovered', async () => {
      const h = new SatelliteContractRuleHandler(fsMock({
        existing: [workspaceYaml, path.join(SAT, 'mms', 'evolith.yaml'), path.join(SAT, 'stray', 'evolith.yaml')],
        files: { [workspaceYaml]: descriptor([{ name: 'mms', path: 'mms' }]) },
        dirs: {
          [SAT]: [{ name: 'mms', dir: true }, { name: 'stray', dir: true }, { name: 'evolith.workspace.yaml' }],
          [path.join(SAT, 'mms')]: [{ name: 'evolith.yaml' }],
          [path.join(SAT, 'stray')]: [{ name: 'evolith.yaml' }],
        },
      }), yamlParser);
      const res = await h.evaluate(rule('SVC-06'), ctx);
      expect(res.result).toBe('failed');
      expect(res.message).toContain('stray');
    });
  });
});
