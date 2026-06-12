import { MoscowPrioritizationService, MoscowItem, MoscowAnalysis } from './moscow-prioritization.service';

jest.mock('../../core/abstractions', () => ({
  getContainer: jest.fn(),
}));

import { getContainer } from '../../core/abstractions';

const mockFileSystem = {
  exists: jest.fn(),
  readFile: jest.fn(),
  readdirNames: jest.fn(),
  stat: jest.fn(),
  ensureDir: jest.fn(),
  writeJson: jest.fn(),
};

const mockContainer = {
  createFileSystem: jest.fn().mockReturnValue(mockFileSystem),
  createConfigParser: jest.fn(),
};

describe.skip('MoscowPrioritizationService', () => {
  let service: MoscowPrioritizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getContainer as jest.Mock).mockReturnValue(mockContainer);
    service = new MoscowPrioritizationService();
  });

  describe.skip('createAnalysis', () => {
    it('should create a new MoSCoW analysis', async () => {
      const items = [
        { description: 'Setup repository', priority: 'MUST' as const, category: 'Foundation', rationale: 'Required for all projects', phase: 'phase-0' },
        { description: 'Add documentation', priority: 'SHOULD' as const, category: 'Documentation', rationale: 'Important but not critical', phase: 'phase-0' },
      ];

      const result = await service.createAnalysis('/test/repo', 'phase-0', items);

      expect(result.repository).toBe('/test/repo');
      expect(result.phase).toBe('phase-0');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('PHASE-0-001');
      expect(result.items[1].id).toBe('PHASE-0-002');
      expect(result.summary.must).toBe(1);
      expect(result.summary.should).toBe(1);
      expect(result.summary.total).toBe(2);
    });

    it('should save analysis to disk', async () => {
      const items = [
        { description: 'Test item', priority: 'MUST' as const, category: 'Test', rationale: 'Testing', phase: 'phase-0' },
      ];

      await service.createAnalysis('/test/repo', 'phase-0', items);

      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });
  });

  describe('loadAnalysis', () => {
    it('should return null when analysis not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.loadAnalysis('/test/repo', 'phase-0');

      expect(result).toBeNull();
    });

    it('should load analysis from disk', async () => {
      const mockAnalysis = {
        repository: '/test/repo',
        phase: 'phase-0',
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await service.loadAnalysis('/test/repo', 'phase-0');

      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('updateItem', () => {
    it('should return null when analysis not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.updateItem('/test/repo', 'phase-0', 'PHASE-0-001', { priority: 'SHOULD' });

      expect(result).toBeNull();
    });

    it('should return null when item not found', async () => {
      const mockAnalysis = {
        repository: '/test/repo',
        phase: 'phase-0',
        items: [{ id: 'PHASE-0-001', description: 'Test', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' }],
        summary: { must: 1, should: 0, could: 0, wont: 0, total: 1 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await service.updateItem('/test/repo', 'phase-0', 'PHASE-0-999', { priority: 'SHOULD' });

      expect(result).toBeNull();
    });

    it('should update item and recalculate summary', async () => {
      const mockAnalysis = {
        repository: '/test/repo',
        phase: 'phase-0',
        items: [{ id: 'PHASE-0-001', description: 'Test', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' }],
        summary: { must: 1, should: 0, could: 0, wont: 0, total: 1 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await service.updateItem('/test/repo', 'phase-0', 'PHASE-0-001', { priority: 'SHOULD' });

      expect(result).not.toBeNull();
      expect(result?.summary.must).toBe(0);
      expect(result?.summary.should).toBe(1);
    });
  });

  describe('removeItem', () => {
    it('should return null when analysis not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.removeItem('/test/repo', 'phase-0', 'PHASE-0-001');

      expect(result).toBeNull();
    });

    it('should remove item and recalculate summary', async () => {
      const mockAnalysis = {
        repository: '/test/repo',
        phase: 'phase-0',
        items: [
          { id: 'PHASE-0-001', description: 'Test 1', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'PHASE-0-002', description: 'Test 2', priority: 'SHOULD', category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 1, should: 1, could: 0, wont: 0, total: 2 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockAnalysis));

      const result = await service.removeItem('/test/repo', 'phase-0', 'PHASE-0-001');

      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1);
      expect(result?.summary.total).toBe(1);
      expect(result?.summary.must).toBe(0);
    });
  });

  describe('listAnalyses', () => {
    it('should return empty list when moscow directory not found', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.listAnalyses('/test/repo');

      expect(result).toEqual([]);
    });

    it('should list all analysis files', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['phase-0.json', 'phase-1.json']);
      mockFileSystem.stat.mockResolvedValue({ mtime: new Date('2026-01-01') });

      const result = await service.listAnalyses('/test/repo');

      expect(result).toHaveLength(2);
      expect(result[0].phase).toBe('phase-0');
      expect(result[1].phase).toBe('phase-1');
    });
  });

  describe('validateAnalysis', () => {
    it('should detect empty analysis', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No items in analysis');
    });

    it('should detect missing MUST items', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Test', priority: 'SHOULD', category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 0, should: 1, could: 0, wont: 0, total: 1 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('No MUST items defined - at least one is required');
    });

    it('should detect too many MUST items', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Test 1', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'P-002', description: 'Test 2', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'P-003', description: 'Test 3', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 3, should: 0, could: 0, wont: 0, total: 3 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Too many MUST items'))).toBe(true);
    });

    it('should detect invalid priorities', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Test', priority: 'INVALID' as any, category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 1 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Invalid priorities found'))).toBe(true);
    });

    it('should detect duplicate IDs', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Test 1', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'P-001', description: 'Test 2', priority: 'SHOULD', category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 1, should: 1, could: 0, wont: 0, total: 2 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Duplicate IDs found'))).toBe(true);
    });

    it('should return valid for correct analysis', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Test 1', priority: 'MUST', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'P-002', description: 'Test 2', priority: 'SHOULD', category: 'Test', rationale: 'Test', phase: 'phase-0' },
          { id: 'P-003', description: 'Test 3', priority: 'COULD', category: 'Test', rationale: 'Test', phase: 'phase-0' },
        ],
        summary: { must: 1, should: 1, could: 1, wont: 0, total: 3 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const result = service.validateAnalysis(analysis);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test/repo',
        phase: 'phase-0',
        items: [
          { id: 'P-001', description: 'Setup repository', priority: 'MUST', category: 'Foundation', rationale: 'Required', phase: 'phase-0' },
          { id: 'P-002', description: 'Add docs', priority: 'SHOULD', category: 'Documentation', rationale: 'Important', phase: 'phase-0' },
        ],
        summary: { must: 1, should: 1, could: 0, wont: 0, total: 2 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const report = service.generateReport(analysis);

      expect(report).toContain('# MoSCoW Prioritization Report');
      expect(report).toContain('/test/repo');
      expect(report).toContain('phase-0');
      expect(report).toContain('| MUST | 1 | 50% |');
      expect(report).toContain('| SHOULD | 1 | 50% |');
      expect(report).toContain('Setup repository');
      expect(report).toContain('Add docs');
    });

    it('should include validation issues in report', () => {
      const analysis: MoscowAnalysis = {
        repository: '/test',
        phase: 'phase-0',
        items: [],
        summary: { must: 0, should: 0, could: 0, wont: 0, total: 0 },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const report = service.generateReport(analysis);

      expect(report).toContain('## Validation Issues');
      expect(report).toContain('No items in analysis');
    });
  });
});
