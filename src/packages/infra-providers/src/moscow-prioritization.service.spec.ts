import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  MoscowPrioritizationService,
  MoscowAnalysis,
  MoscowItem,
} from './moscow-prioritization.service';

/** Minimal in-memory IFileSystem backing the service's JSON persistence. */
function makeMemoryFs(): IFileSystem {
  const files = new Map<string, string>();
  const norm = (p: string) => p.replace(/\\/g, '/');
  return {
    async readFile(p: string) {
      const v = files.get(norm(p));
      if (v === undefined) throw new Error(`ENOENT: ${p}`);
      return v;
    },
    async readFileBuffer(p: string) {
      return Buffer.from(await this.readFile(p), 'utf-8');
    },
    async writeFile(p: string, content: string) {
      files.set(norm(p), content);
    },
    async exists(p: string) {
      const target = norm(p);
      if (files.has(target)) return true;
      // treat a path that is a prefix of stored files as an existing directory
      return [...files.keys()].some((k) => k.startsWith(target + '/'));
    },
    existsSync(p: string) {
      return files.has(norm(p));
    },
    async readJson<T = unknown>(p: string) {
      return JSON.parse(await this.readFile(p)) as T;
    },
    async writeJson(p: string, content: unknown) {
      files.set(norm(p), JSON.stringify(content, null, 2));
    },
    async mkdir() {},
    async readdir(p: string) {
      const dir = norm(p) + '/';
      return [...files.keys()]
        .filter((k) => k.startsWith(dir))
        .map((k) => k.slice(dir.length).split('/')[0])
        .filter((name, i, arr) => arr.indexOf(name) === i)
        .map((name) => ({ name, isDirectory: () => false, isFile: () => true }));
    },
    async readdirNames(p: string) {
      return (await this.readdir(p)).map((e) => e.name);
    },
    async copy() {},
    async ensureDir() {},
    async ensureFile() {},
    async stat() {
      return { isDirectory: () => false, isFile: () => true };
    },
    async remove(p: string) {
      files.delete(norm(p));
    },
  };
}

const baseItems: Omit<MoscowItem, 'id'>[] = [
  { description: 'Auth', priority: 'MUST', category: 'security', rationale: 'required', phase: 'mvp' },
  { description: 'Theme', priority: 'SHOULD', category: 'ux', rationale: 'nice', phase: 'mvp' },
  { description: 'Plugins', priority: 'COULD', category: 'ext', rationale: 'later', phase: 'mvp' },
  { description: 'Legacy', priority: 'WONT', category: 'tech', rationale: 'out', phase: 'mvp' },
];

describe('MoscowPrioritizationService', () => {
  let svc: MoscowPrioritizationService;

  beforeEach(() => {
    svc = new MoscowPrioritizationService({ fileSystem: makeMemoryFs() });
  });

  it('createAnalysis assigns ids, computes the summary and persists it', async () => {
    const analysis = await svc.createAnalysis('/repo', 'mvp', baseItems);
    expect(analysis.items.map((i) => i.id)).toEqual([
      'MVP-001',
      'MVP-002',
      'MVP-003',
      'MVP-004',
    ]);
    expect(analysis.summary).toEqual({ must: 1, should: 1, could: 1, wont: 1, total: 4 });

    const reloaded = await svc.loadAnalysis('/repo', 'mvp');
    expect(reloaded?.items).toHaveLength(4);
  });

  it('loadAnalysis returns null when nothing was saved', async () => {
    expect(await svc.loadAnalysis('/repo', 'missing')).toBeNull();
  });

  it('updateItem mutates the item and recomputes the summary', async () => {
    await svc.createAnalysis('/repo', 'mvp', baseItems);
    const updated = await svc.updateItem('/repo', 'mvp', 'MVP-002', { priority: 'MUST' });
    expect(updated?.summary.must).toBe(2);
    expect(updated?.summary.should).toBe(0);
    expect(updated?.items.find((i) => i.id === 'MVP-002')?.priority).toBe('MUST');
  });

  it('updateItem returns null for unknown analysis or item', async () => {
    expect(await svc.updateItem('/repo', 'nope', 'X', {})).toBeNull();
    await svc.createAnalysis('/repo', 'mvp', baseItems);
    expect(await svc.updateItem('/repo', 'mvp', 'MVP-999', {})).toBeNull();
  });

  it('removeItem drops the item and updates totals', async () => {
    await svc.createAnalysis('/repo', 'mvp', baseItems);
    const after = await svc.removeItem('/repo', 'mvp', 'MVP-004');
    expect(after?.summary.total).toBe(3);
    expect(after?.summary.wont).toBe(0);
    expect(after?.items.find((i) => i.id === 'MVP-004')).toBeUndefined();
  });

  it('removeItem returns null when the analysis is absent', async () => {
    expect(await svc.removeItem('/repo', 'nope', 'X')).toBeNull();
  });

  it('listAnalyses enumerates saved phases', async () => {
    await svc.createAnalysis('/repo', 'mvp', baseItems);
    await svc.createAnalysis('/repo', 'beta', baseItems);
    const list = await svc.listAnalyses('/repo');
    expect(list.map((l) => l.phase).sort()).toEqual(['beta', 'mvp']);
  });

  it('listAnalyses returns empty when the moscow dir does not exist', async () => {
    expect(await svc.listAnalyses('/repo')).toEqual([]);
  });

  it('validateAnalysis flags empty, no-MUST, too-many-MUST, bad priorities and dup ids', () => {
    expect(
      svc.validateAnalysis({ items: [] } as unknown as MoscowAnalysis).issues,
    ).toContain('No items in analysis');

    const noMust = {
      items: [{ id: 'A', priority: 'SHOULD' }],
    } as unknown as MoscowAnalysis;
    expect(svc.validateAnalysis(noMust).issues).toContain(
      'No MUST items defined - at least one is required',
    );

    const tooMany = {
      items: [
        { id: 'A', priority: 'MUST' },
        { id: 'B', priority: 'MUST' },
        { id: 'C', priority: 'SHOULD' },
      ],
    } as unknown as MoscowAnalysis;
    expect(
      svc.validateAnalysis(tooMany).issues.some((i) => i.includes('Too many MUST')),
    ).toBe(true);

    const bad = {
      items: [
        { id: 'A', priority: 'MUST' },
        { id: 'B', priority: 'NOPE' },
      ],
    } as unknown as MoscowAnalysis;
    expect(svc.validateAnalysis(bad).issues.some((i) => i.includes('Invalid priorities'))).toBe(
      true,
    );

    const dup = {
      items: [
        { id: 'A', priority: 'MUST' },
        { id: 'A', priority: 'SHOULD' },
      ],
    } as unknown as MoscowAnalysis;
    expect(svc.validateAnalysis(dup).issues.some((i) => i.includes('Duplicate IDs'))).toBe(true);
  });

  it('validateAnalysis passes a healthy analysis', async () => {
    const analysis = await svc.createAnalysis('/repo', 'mvp', baseItems);
    const result = svc.validateAnalysis(analysis);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('generateReport renders a markdown summary plus validation issues', async () => {
    const analysis = await svc.createAnalysis('/repo', 'mvp', baseItems);
    const report = svc.generateReport(analysis);
    expect(report).toContain('# MoSCoW Prioritization Report');
    expect(report).toContain('| MUST | 1 | 25% |');
    expect(report).toContain('### MUST');
    expect(report).toContain('Auth');

    const onlyShould = {
      repository: '/r',
      phase: 'mvp',
      items: [
        {
          id: 'A',
          description: 'd',
          priority: 'SHOULD',
          category: 'c',
          rationale: 'r',
          phase: 'mvp',
        },
      ],
      summary: { must: 0, should: 1, could: 0, wont: 0, total: 1 },
      createdAt: 'x',
      updatedAt: 'y',
    } as MoscowAnalysis;
    expect(svc.generateReport(onlyShould)).toContain('Validation Issues');
  });

  it('defaults to a Node filesystem when no fileSystem is injected', () => {
    const fallback = new MoscowPrioritizationService();
    expect(fallback).toBeInstanceOf(MoscowPrioritizationService);
  });
});
