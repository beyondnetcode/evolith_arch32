import { createPatternTools } from './pattern.tools';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core';

/**
 * The tools read the corpus exclusively through `PatternCatalogService`, so the
 * fixtures below mock the filesystem the service walks
 * (`<core>/reference/core/architecture/patterns/pat/pat-NNNN-*.json`) rather than
 * stubbing the service — that keeps the "one reader" contract under test.
 */
function patRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'PAT-0001',
    name: 'Database per Service',
    kind: 'pattern',
    category: 'data-ownership',
    status: 'accepted',
    problem: 'Shared schemas couple services.',
    forces: ['autonomy'],
    solution: 'Each service owns its schema.',
    appliesTo: [
      { topology: 'microservices', applicability: 'required', guidance: 'Mandatory.' },
      { topology: 'modular-monolith', applicability: 'not-applicable', guidance: 'n/a' },
    ],
    enforcedBy: [{ ruleId: 'TOPO-MS-01', engine: 'topology-ruleset' }],
    ...overrides,
  };
}

describe('createPatternTools', () => {
  let fsMock: jest.Mocked<IFileSystem>;
  let loggerMock: jest.Mocked<ILogger>;

  /** Makes the service resolve exactly `files` under the first candidate root. */
  function mockCorpus(files: Record<string, unknown>) {
    const names = Object.keys(files);
    fsMock.exists.mockImplementation(async (p: string) =>
      p.includes(['reference', 'core', 'architecture', 'patterns', 'pat'].join(require('path').sep)),
    );
    fsMock.readdir.mockResolvedValue(
      names.map((name) => ({ name, isDirectory: () => false, isFile: () => true })) as never,
    );
    fsMock.readFile.mockImplementation(async (p: string) => {
      const name = names.find((n) => p.endsWith(n));
      return JSON.stringify(files[name!]);
    });
  }

  beforeEach(() => {
    fsMock = {
      exists: jest.fn(),
      readFile: jest.fn(),
      readJson: jest.fn(),
      readdir: jest.fn(),
      readdirNames: jest.fn(),
      writeFile: jest.fn(),
      writeJson: jest.fn(),
      mkdir: jest.fn(),
      remove: jest.fn(),
      stat: jest.fn(),
    } as any;
    loggerMock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() } as any;
  });

  it('returns 3 tools with the canonical names', () => {
    const tools = createPatternTools(fsMock, loggerMock);
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.schema.name)).toEqual([
      'evolith-pattern-list',
      'evolith-pattern-get',
      'evolith-pattern-list-by-topology',
    ]);
  });

  describe('evolith-pattern-list', () => {
    it('lists every pattern in a success envelope', async () => {
      mockCorpus({
        'pat-0001-database-per-service.json': patRecord(),
        'pat-0002-shared-database.json': patRecord({ id: 'PAT-0002', kind: 'anti-pattern', category: 'contracts' }),
      });
      const [listTool] = createPatternTools(fsMock, loggerMock);
      const result = await listTool.execute({ corePath: '/core' });

      expect(result).toMatchObject({
        success: true,
        data: { count: 2 },
        meta: { command: 'evolith-pattern-list', schemaVersion: '1.0.0' },
      });
      expect(result.data.patterns.map((p: any) => p.id)).toEqual(['PAT-0001', 'PAT-0002']);
    });

    it('applies the kind filter through the service', async () => {
      mockCorpus({
        'pat-0001-database-per-service.json': patRecord(),
        'pat-0002-shared-database.json': patRecord({ id: 'PAT-0002', kind: 'anti-pattern' }),
      });
      const [listTool] = createPatternTools(fsMock, loggerMock);
      const result = await listTool.execute({ corePath: '/core', kind: 'anti-pattern' });

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(1);
      expect(result.data.patterns[0].id).toBe('PAT-0002');
      expect(result.data.filters).toEqual({ kind: 'anti-pattern' });
    });

    it('rejects an unknown kind before touching the corpus', async () => {
      const [listTool] = createPatternTools(fsMock, loggerMock);
      await expect(listTool.execute({ corePath: '/core', kind: 'nonsense' })).rejects.toThrow(
        /kind must be one of/,
      );
      expect(fsMock.readdir).not.toHaveBeenCalled();
    });

    it("surfaces the service's anti-empty guard as a readable tool error", async () => {
      fsMock.exists.mockResolvedValue(false);
      const [listTool] = createPatternTools(fsMock, loggerMock);
      const error = await listTool.execute({ corePath: '/core' }).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('IO_ERROR');
      expect(error.message).toContain('No canonical pattern directory found');
      // Readable message, not a raw stack dump.
      expect(error.message).not.toContain('at Object.');
    });
  });

  describe('evolith-pattern-get', () => {
    it('returns the record for a known id (case-insensitively)', async () => {
      mockCorpus({ 'pat-0001-database-per-service.json': patRecord() });
      const [, getTool] = createPatternTools(fsMock, loggerMock);
      const result = await getTool.execute({ corePath: '/core', id: 'pat-0001' });

      expect(result).toMatchObject({
        success: true,
        data: { id: 'PAT-0001', pattern: expect.objectContaining({ name: 'Database per Service' }) },
        meta: { command: 'evolith-pattern-get' },
      });
    });

    it('throws a not-found error (never a success envelope) for an unknown id', async () => {
      mockCorpus({ 'pat-0001-database-per-service.json': patRecord() });
      const [, getTool] = createPatternTools(fsMock, loggerMock);
      const error = await getTool.execute({ corePath: '/core', id: 'PAT-9999' }).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('PATH_NOT_FOUND');
      expect(error.message).toContain('PAT-9999');
    });

    it('requires an id', async () => {
      const [, getTool] = createPatternTools(fsMock, loggerMock);
      await expect(getTool.execute({ corePath: '/core' })).rejects.toThrow(/id is required/);
    });
  });

  describe('evolith-pattern-list-by-topology', () => {
    it('returns applicable patterns with the rules they impose, ordered by strength', async () => {
      mockCorpus({
        'pat-0001-database-per-service.json': patRecord(),
        'pat-0002-api-versioning.json': patRecord({
          id: 'PAT-0002',
          appliesTo: [{ topology: 'microservices', applicability: 'recommended', guidance: 'Version contracts.' }],
          enforcedBy: [{ ruleId: 'CONTRACT-01', engine: 'acl-ruleset' }],
        }),
        'pat-0003-irrelevant.json': patRecord({
          id: 'PAT-0003',
          appliesTo: [{ topology: 'microservices', applicability: 'not-applicable', guidance: 'n/a' }],
        }),
      });
      const [, , byTopology] = createPatternTools(fsMock, loggerMock);
      const result = await byTopology.execute({ corePath: '/core', topology: 'microservices' });

      expect(result).toMatchObject({
        success: true,
        data: { topology: 'microservices', count: 2 },
        meta: { command: 'evolith-pattern-list-by-topology' },
      });
      // required before recommended; not-applicable excluded.
      expect(result.data.applications.map((a: any) => [a.pattern.id, a.applicability])).toEqual([
        ['PAT-0001', 'required'],
        ['PAT-0002', 'recommended'],
      ]);
      expect(result.data.applications[0].enforcedBy).toEqual([
        { ruleId: 'TOPO-MS-01', engine: 'topology-ruleset' },
      ]);
    });

    it('returns an empty application list for a topology no pattern targets', async () => {
      mockCorpus({ 'pat-0001-database-per-service.json': patRecord() });
      const [, , byTopology] = createPatternTools(fsMock, loggerMock);
      const result = await byTopology.execute({ corePath: '/core', topology: 'serverless' });

      expect(result).toMatchObject({ success: true, data: { topology: 'serverless', count: 0, applications: [] } });
    });

    it('requires a topology', async () => {
      const [, , byTopology] = createPatternTools(fsMock, loggerMock);
      await expect(byTopology.execute({ corePath: '/core' })).rejects.toThrow(/topology is required/);
    });
  });
});
