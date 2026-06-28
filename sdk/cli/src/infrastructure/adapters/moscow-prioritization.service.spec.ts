import { MoscowPrioritizationService, MoscowAnalysis } from '@evolith/infra-providers';

function createMockFs() {
  const store = new Map<string, string>();
  return {
    store,
    exists: jest.fn(async (p: string) => store.has(p)),
    readFile: jest.fn(async (p: string) => {
      if (!store.has(p)) throw new Error(`ENOENT: ${p}`);
      return store.get(p) as string;
    }),
    readdirNames: jest.fn(async () => [] as string[]),
    stat: jest.fn(async () => ({ isDirectory: () => false, isFile: () => true })),
    ensureDir: jest.fn(async () => undefined),
    writeJson: jest.fn(async (p: string, data: unknown) => {
      store.set(p, JSON.stringify(data));
    }),
  };
}

describe('MoscowPrioritizationService', () => {
  let mockFs: ReturnType<typeof createMockFs>;
  let service: MoscowPrioritizationService;

  beforeEach(() => {
    mockFs = createMockFs();
    service = new MoscowPrioritizationService({ fileSystem: mockFs as any });
  });

  const sampleItems = [
    { description: 'Setup repository', priority: 'MUST' as const, category: 'Foundation', rationale: 'Required', phase: 'phase-0' },
    { description: 'Add documentation', priority: 'SHOULD' as const, category: 'Docs', rationale: 'Important', phase: 'phase-0' },
    { description: 'Nice to have', priority: 'COULD' as const, category: 'Extra', rationale: 'Optional', phase: 'phase-0' },
    { description: 'Skip for now', priority: 'WONT' as const, category: 'Future', rationale: 'Deferred', phase: 'phase-0' },
  ];

  describe('createAnalysis', () => {
    it('creates an analysis with sequential ids and a correct summary', async () => {
      const result = await service.createAnalysis('/repo', 'phase-0', sampleItems);

      expect(result.repository).toBe('/repo');
      expect(result.phase).toBe('phase-0');
      expect(result.items).toHaveLength(4);
      expect(result.items[0].id).toBe('PHASE-0-001');
      expect(result.items[3].id).toBe('PHASE-0-004');
      expect(result.summary).toMatchObject({ must: 1, should: 1, could: 1, wont: 1, total: 4 });
    });

    it('persists the analysis to disk', async () => {
      await service.createAnalysis('/repo', 'phase-0', sampleItems);
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('moscow'),
        expect.objectContaining({ phase: 'phase-0' }),
      );
    });
  });

  describe('loadAnalysis', () => {
    it('returns null when no analysis exists', async () => {
      expect(await service.loadAnalysis('/repo', 'phase-9')).toBeNull();
    });

    it('returns the persisted analysis', async () => {
      const created = await service.createAnalysis('/repo', 'phase-0', sampleItems);
      const loaded = await service.loadAnalysis('/repo', 'phase-0');
      expect(loaded?.items).toHaveLength(created.items.length);
    });
  });

  describe('updateItem', () => {
    it('returns null when the analysis is missing', async () => {
      expect(await service.updateItem('/repo', 'missing', 'X-001', { priority: 'MUST' })).toBeNull();
    });

    it('returns null when the item id is unknown', async () => {
      await service.createAnalysis('/repo', 'phase-0', sampleItems);
      expect(await service.updateItem('/repo', 'phase-0', 'UNKNOWN', { priority: 'MUST' })).toBeNull();
    });

    it('updates an item and recomputes the summary', async () => {
      await service.createAnalysis('/repo', 'phase-0', sampleItems);
      const updated = await service.updateItem('/repo', 'phase-0', 'PHASE-0-002', { priority: 'MUST' });
      expect(updated?.summary.must).toBe(2);
      expect(updated?.summary.should).toBe(0);
    });
  });

  describe('removeItem', () => {
    it('returns null when the analysis is missing', async () => {
      expect(await service.removeItem('/repo', 'missing', 'X-001')).toBeNull();
    });

    it('removes an item and recomputes totals', async () => {
      await service.createAnalysis('/repo', 'phase-0', sampleItems);
      const result = await service.removeItem('/repo', 'phase-0', 'PHASE-0-004');
      expect(result?.items).toHaveLength(3);
      expect(result?.summary.total).toBe(3);
      expect(result?.summary.wont).toBe(0);
    });
  });

  describe('listAnalyses', () => {
    it('returns an empty list when no moscow directory exists', async () => {
      mockFs.exists.mockResolvedValue(false);
      expect(await service.listAnalyses('/repo')).toEqual([]);
    });

    it('lists json analyses only', async () => {
      mockFs.exists.mockResolvedValue(true);
      mockFs.readdirNames.mockResolvedValue(['phase-0.json', 'phase-1.json', 'README.md']);
      const result = await service.listAnalyses('/repo');
      expect(result.map(r => r.phase).sort()).toEqual(['phase-0', 'phase-1']);
    });
  });

  describe('validateAnalysis', () => {
    const baseAnalysis = (items: MoscowAnalysis['items']): MoscowAnalysis => ({
      repository: '/repo',
      phase: 'phase-0',
      items,
      summary: { must: 0, should: 0, could: 0, wont: 0, total: items.length },
      createdAt: 'now',
      updatedAt: 'now',
    });

    it('flags an empty analysis and a missing MUST', () => {
      const result = service.validateAnalysis(baseAnalysis([]));
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No items in analysis');
      expect(result.issues.some(i => i.includes('No MUST'))).toBe(true);
    });

    it('flags too many MUST items', () => {
      const items = [
        { id: 'A', description: 'a', priority: 'MUST' as const, category: 'c', rationale: 'r', phase: 'p' },
        { id: 'B', description: 'b', priority: 'MUST' as const, category: 'c', rationale: 'r', phase: 'p' },
        { id: 'C', description: 'c', priority: 'SHOULD' as const, category: 'c', rationale: 'r', phase: 'p' },
      ];
      const result = service.validateAnalysis(baseAnalysis(items));
      expect(result.issues.some(i => i.includes('Too many MUST'))).toBe(true);
    });

    it('flags duplicate ids', () => {
      const items = [
        { id: 'DUP', description: 'a', priority: 'MUST' as const, category: 'c', rationale: 'r', phase: 'p' },
        { id: 'DUP', description: 'b', priority: 'SHOULD' as const, category: 'c', rationale: 'r', phase: 'p' },
      ];
      const result = service.validateAnalysis(baseAnalysis(items));
      expect(result.issues.some(i => i.includes('Duplicate IDs'))).toBe(true);
    });

    it('accepts a well-formed analysis', () => {
      const items = [
        { id: 'A', description: 'a', priority: 'MUST' as const, category: 'c', rationale: 'r', phase: 'p' },
        { id: 'B', description: 'b', priority: 'SHOULD' as const, category: 'c', rationale: 'r', phase: 'p' },
        { id: 'C', description: 'c', priority: 'COULD' as const, category: 'c', rationale: 'r', phase: 'p' },
      ];
      expect(service.validateAnalysis(baseAnalysis(items)).valid).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('renders a markdown report with the summary table and items', async () => {
      const analysis = await service.createAnalysis('/repo', 'phase-0', sampleItems);
      const report = service.generateReport(analysis);
      expect(report).toContain('# MoSCoW Prioritization Report');
      expect(report).toContain('**Repository:** /repo');
      expect(report).toContain('### MUST');
      expect(report).toContain('PHASE-0-001');
    });

    it('renders validation issues when the analysis is invalid', () => {
      const analysis: MoscowAnalysis = {
        repository: '/repo',
        phase: 'phase-0',
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: 'now',
        updatedAt: 'now',
      };
      const report = service.generateReport(analysis);
      expect(report).toContain('## Validation Issues');
    });
  });
});
