import { PatternCatalogService } from './pattern-catalog.service';

const ROOT = '/core/reference/core/architecture/patterns/pat';

const pattern = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: 'PAT-0001',
    name: 'Database per Service',
    kind: 'pattern',
    category: 'data-ownership',
    status: 'accepted',
    problem: 'Services that share a database couple their release cycles.',
    forces: ['Independent deployability pulls data apart.'],
    solution: 'Each service owns its data store exclusively.',
    appliesTo: [
      { topology: 'microservices', applicability: 'required', guidance: 'One store per service.' },
      { topology: 'modular-monolith', applicability: 'recommended', guidance: 'Schema granularity.' },
    ],
    enforcedBy: [{ ruleId: 'MS-R06', engine: 'topology-ruleset' }],
    ...over,
  });

const FILES: Record<string, string> = {
  'pat-0001-database-per-service.json': pattern(),
  'pat-0002-contract-testing.json': pattern({
    id: 'PAT-0002',
    name: 'Contract Testing',
    category: 'contracts',
    appliesTo: [
      { topology: 'microservices', applicability: 'optional', guidance: 'Consumer-driven contracts.' },
      { topology: 'modular-monolith', applicability: 'not-applicable', guidance: 'Single deployment unit.' },
    ],
    enforcedBy: [],
  }),
  'pat-0003-shared-database.json': pattern({
    id: 'PAT-0003',
    name: 'Shared Database',
    kind: 'anti-pattern',
    category: 'data-ownership',
    whyProhibited: 'It couples release cycles invisibly.',
    requiredCorrection: 'Split the store and publish an interface.',
    appliesTo: [{ topology: 'microservices', applicability: 'required', guidance: 'Never share a store.' }],
    enforcedBy: [],
  }),
};

const makeFs = (files: Record<string, string> = FILES, roots: string[] = [ROOT]): any => ({
  exists: jest.fn(async (dir: string) => roots.includes(dir)),
  readdir: jest.fn(async () =>
    Object.keys(files).map((name) => ({ name, isFile: () => true, isDirectory: () => false })),
  ),
  readFile: jest.fn(async (file: string) => files[file.split('/').pop() as string]),
});

const logger = { error: jest.fn() } as any;

describe('PatternCatalogService', () => {
  it('lists every PAT record sorted by id', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    const patterns = await service.list('/core');
    expect(patterns.map((p) => p.id)).toEqual(['PAT-0001', 'PAT-0002', 'PAT-0003']);
  });

  it('gets a pattern by id, case-insensitively', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    await expect(service.get('/core', 'pat-0002')).resolves.toMatchObject({ name: 'Contract Testing' });
  });

  it('returns undefined for an unknown id', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    await expect(service.get('/core', 'PAT-9999')).resolves.toBeUndefined();
  });

  it('filters by category, kind, topology and enforcement', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    await expect(service.list('/core', { category: 'contracts' })).resolves.toHaveLength(1);
    await expect(service.list('/core', { kind: 'anti-pattern' })).resolves.toMatchObject([{ id: 'PAT-0003' }]);
    // PAT-0002 declares modular-monolith as not-applicable, so it is excluded.
    await expect(service.list('/core', { topology: 'modular-monolith' })).resolves.toMatchObject([{ id: 'PAT-0001' }]);
    await expect(service.list('/core', { enforced: true })).resolves.toMatchObject([{ id: 'PAT-0001' }]);
    await expect(service.list('/core', { enforced: false })).resolves.toHaveLength(2);
  });

  it('returns an empty list when filters match nothing (a filtered miss is not a corpus failure)', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    await expect(service.list('/core', { category: 'ai-safety' })).resolves.toEqual([]);
  });

  it('lists patterns applying to a topology, ordered by applicability, with their rules', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    const applications = await service.listByTopology('/core', 'microservices');
    expect(applications.map((a) => [a.pattern.id, a.applicability])).toEqual([
      ['PAT-0001', 'required'],
      ['PAT-0003', 'required'],
      ['PAT-0002', 'optional'],
    ]);
    expect(applications[0].enforcedBy).toMatchObject([{ ruleId: 'MS-R06' }]);
  });

  it('excludes not-applicable topologies from listByTopology', async () => {
    const service = new PatternCatalogService(makeFs(), logger);
    const applications = await service.listByTopology('/core', 'modular-monolith');
    expect(applications.map((a) => a.pattern.id)).toEqual(['PAT-0001']);
  });

  it('throws when no pattern directory exists instead of returning an empty catalogue', async () => {
    const service = new PatternCatalogService(makeFs(FILES, []), logger);
    await expect(service.list('/core')).rejects.toThrow(/No canonical pattern directory found/);
    await expect(service.list('/core')).rejects.toThrow(/Refusing/);
  });

  it('throws when the directory exists but holds zero PAT records', async () => {
    const service = new PatternCatalogService(makeFs({}), logger);
    await expect(service.list('/core')).rejects.toThrow(/found zero PAT records/);
  });

  it('ignores non-PAT files in the directory', async () => {
    const fs = makeFs();
    fs.readdir = jest.fn(async () => [
      { name: 'README.md', isFile: () => true, isDirectory: () => false },
      { name: 'pat-0001-database-per-service.json', isFile: () => true, isDirectory: () => false },
      { name: 'index.json', isFile: () => true, isDirectory: () => false },
    ]);
    const service = new PatternCatalogService(fs, logger);
    await expect(service.list('/core')).resolves.toMatchObject([{ id: 'PAT-0001' }]);
  });

  it('fails loudly on a malformed pattern record', async () => {
    const service = new PatternCatalogService(
      makeFs({ 'pat-0001-broken.json': JSON.stringify({ name: 'no id' }) }),
      logger,
    );
    await expect(service.list('/core')).rejects.toThrow(/Canonical pattern error/);
  });
});
