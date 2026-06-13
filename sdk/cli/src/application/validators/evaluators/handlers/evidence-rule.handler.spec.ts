import * as path from 'path';
import { EvidenceRuleHandler } from './evidence-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const CORE = '/core';
const ctx = { satellitePath: '/sat', corePath: CORE };
const evDir = path.join(CORE, '.harness', 'evidence');

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
  } as any;
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'evidence', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

function withManifest(id: string, manifest: unknown) {
  const file = path.join(evDir, 'm.json');
  return new EvidenceRuleHandler(fsMock({
    existing: [evDir],
    dirs: { [evDir]: ['m.json'] },
    files: { [file]: JSON.stringify(manifest) },
  })).evaluate(rule(id), ctx);
}

describe('EvidenceRuleHandler', () => {
  it('canHandle matches EVD- prefix', () => {
    expect(new EvidenceRuleHandler(fsMock()).canHandle(rule('EVD-01'))).toBe(true);
    expect(new EvidenceRuleHandler(fsMock()).canHandle(rule('GOV-01'))).toBe(false);
  });

  it('fails when the evidence directory is missing', async () => {
    expect((await new EvidenceRuleHandler(fsMock()).evaluate(rule('EVD-01'), ctx)).result).toBe('failed');
  });

  it('fails when there are no JSON manifests', async () => {
    const h = new EvidenceRuleHandler(fsMock({ existing: [evDir], dirs: { [evDir]: ['readme.txt'] } }));
    expect((await h.evaluate(rule('EVD-01'), ctx)).result).toBe('failed');
  });

  it('fails on invalid JSON', async () => {
    const file = path.join(evDir, 'm.json');
    const h = new EvidenceRuleHandler(fsMock({ existing: [evDir], dirs: { [evDir]: ['m.json'] }, files: { [file]: '{bad' } }));
    expect((await h.evaluate(rule('EVD-01'), ctx)).result).toBe('failed');
  });

  it('EVD-01 enforces required fields and rule linkage', async () => {
    expect((await withManifest('EVD-01', { id: 'x', source: 's', generatedAt: 't' })).result).toBe('failed');
    expect((await withManifest('EVD-01', { id: 'x', source: 's', generatedAt: 't', producer: 'p', relatedGateId: 'g' })).result).toBe('passed');
  });

  it('EVD-02 requires sourceRef', async () => {
    expect((await withManifest('EVD-02', { id: 'x' })).result).toBe('failed');
    expect((await withManifest('EVD-02', { sourceRef: 'ref' })).result).toBe('passed');
  });

  it('EVD-03 requires status/evaluatedRules/blockingFailures', async () => {
    expect((await withManifest('EVD-03', { status: 'ok' })).result).toBe('failed');
    expect((await withManifest('EVD-03', { status: 'ok', evaluatedRules: 3, blockingFailures: 1 })).result).toBe('passed');
  });

  it('EVD-04 requires retentionPeriod and owner', async () => {
    expect((await withManifest('EVD-04', { owner: 'o' })).result).toBe('failed');
    expect((await withManifest('EVD-04', { owner: 'o', retentionPeriod: '90d' })).result).toBe('passed');
  });
});
