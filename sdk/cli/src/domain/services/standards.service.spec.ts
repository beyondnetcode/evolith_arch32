import { StandardsService, Standard, ValidationResult, RuleResult } from './standards.service';

const mockFileSystem = {
  exists: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  readJson: jest.fn(),
  readdirNames: jest.fn(),
  writeFile: jest.fn(),
  writeJson: jest.fn(),
  ensureDir: jest.fn(),
  remove: jest.fn(),
  stat: jest.fn(),
};

describe('StandardsService', () => {
  let service: StandardsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StandardsService(mockFileSystem as any, '/test');
  });

  describe('constructor', () => {
    it('should use default standards directory', () => {
      const svc = new StandardsService(mockFileSystem as any, '/base');
      expect(svc).toBeDefined();
    });

    it('should use custom standards directory when provided', () => {
      const svc = new StandardsService(mockFileSystem as any, '/base', '/custom/standards');
      expect(svc).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should create required directories', async () => {
      await service.initialize();

      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/test/reference/standards');
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/test/reference/standards/rulesets');
      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/test/reference/standards/templates');
    });

    it('should create index file if not exists', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      await service.initialize();

      expect(mockFileSystem.writeJson).toHaveBeenCalledWith(
        '/test/reference/standards/standards-index.json',
        expect.objectContaining({ standards: [] }),
      );
    });

    it('should not overwrite existing index', async () => {
      mockFileSystem.exists.mockResolvedValue(true);

      await service.initialize();

      expect(mockFileSystem.writeJson).not.toHaveBeenCalledWith(
        '/test/reference/standards/standards-index.json',
        expect.anything(),
      );
    });

    it('should include lastUpdated timestamp when creating index', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      await service.initialize();

      const writeCall = mockFileSystem.writeJson.mock.calls[0];
      const data = writeCall[1];
      expect(data.lastUpdated).toBeDefined();
      expect(new Date(data.lastUpdated).getTime()).not.toBeNaN();
    });
  });

  describe('register', () => {
    it('should register a new standard', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const standard: Standard = {
        id: 'STD-001',
        name: 'Test Standard',
        version: '1.0.0',
        category: 'architecture',
        description: 'A test standard',
        rules: [],
      };

      await service.register(standard);

      expect(mockFileSystem.ensureDir).toHaveBeenCalledWith('/test/reference/standards/architecture');
      expect(mockFileSystem.writeJson).toHaveBeenCalledWith(
        '/test/reference/standards/architecture/STD-001.json',
        standard,
      );
    });

    it('should update index after registration', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const standard: Standard = {
        id: 'STD-002',
        name: 'Another Standard',
        version: '1.0.0',
        category: 'governance',
        description: 'Another test standard',
        rules: [],
      };

      await service.register(standard);

      expect(mockFileSystem.writeJson).toHaveBeenCalled();
    });

    it('should register standard for all categories', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const categories: Array<'architecture' | 'governance' | 'operations' | 'infrastructure'> = [
        'architecture',
        'governance',
        'operations',
        'infrastructure',
      ];

      for (const category of categories) {
        jest.clearAllMocks();
        mockFileSystem.exists.mockResolvedValue(false);

        const standard: Standard = {
          id: `STD-${category}`,
          name: `${category} Standard`,
          version: '1.0.0',
          category,
          description: `A ${category} standard`,
          rules: [],
        };

        await service.register(standard);

        expect(mockFileSystem.ensureDir).toHaveBeenCalledWith(`/test/reference/standards/${category}`);
        expect(mockFileSystem.writeJson).toHaveBeenCalledWith(
          `/test/reference/standards/${category}/STD-${category}.json`,
          standard,
        );
      }
    });

    it('should register standard with rules', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const standard: Standard = {
        id: 'STD-RULES',
        name: 'Standard with Rules',
        version: '2.0.0',
        category: 'operations',
        description: 'Standard with validation rules',
        rules: [
          {
            id: 'R1',
            name: 'Rule 1',
            severity: 'error',
            description: 'First rule',
            check: 'code.includes("test")',
            remediation: 'Add test',
          },
        ],
      };

      await service.register(standard);

      expect(mockFileSystem.writeJson).toHaveBeenCalledWith(
        '/test/reference/standards/operations/STD-RULES.json',
        standard,
      );
    });

    it('should register standard with metadata', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const standard: Standard = {
        id: 'STD-META',
        name: 'Standard with Metadata',
        version: '1.0.0',
        category: 'infrastructure',
        description: 'Standard with metadata',
        rules: [],
        metadata: { author: 'test', tags: ['infra', 'core'] },
      };

      await service.register(standard);

      expect(mockFileSystem.writeJson).toHaveBeenCalledWith(
        '/test/reference/standards/infrastructure/STD-META.json',
        standard,
      );
    });
  });

  describe('list', () => {
    it('should return empty array when index does not exist', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return all standards from index', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', name: 'Standard 1', category: 'architecture' },
          { id: 'STD-002', name: 'Standard 2', category: 'governance' },
        ],
      });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', name: 'Standard 1', category: 'architecture' },
          { id: 'STD-002', name: 'Standard 2', category: 'governance' },
        ],
      });

      const result = await service.list('architecture');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('STD-001');
    });

    it('should return empty array when filtering by non-existent category', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', name: 'Standard 1', category: 'architecture' },
        ],
      });

      const result = await service.list('infrastructure');

      expect(result).toHaveLength(0);
    });

    it('should handle empty standards array in index', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [],
      });

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should handle index with missing standards property', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({});

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should filter by governance category', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', category: 'architecture' },
          { id: 'STD-002', category: 'governance' },
          { id: 'STD-003', category: 'governance' },
        ],
      });

      const result = await service.list('governance');

      expect(result).toHaveLength(2);
    });

    it('should filter by operations category', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', category: 'operations' },
          { id: 'STD-002', category: 'architecture' },
        ],
      });

      const result = await service.list('operations');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('operations');
    });

    it('should filter by infrastructure category', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', category: 'infrastructure' },
          { id: 'STD-002', category: 'architecture' },
        ],
      });

      const result = await service.list('infrastructure');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('infrastructure');
    });
  });

  describe('get', () => {
    it('should return standard by id', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', name: 'Standard 1', category: 'architecture' },
        ],
      });

      const result = await service.get('STD-001');

      expect(result).toBeDefined();
      expect(result?.id).toBe('STD-001');
    });

    it('should return undefined for non-existent standard', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [],
      });

      const result = await service.get('NONEXISTENT');

      expect(result).toBeUndefined();
    });

    it('should return undefined when searching in populated list', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          { id: 'STD-001', name: 'Standard 1', category: 'architecture' },
          { id: 'STD-002', name: 'Standard 2', category: 'governance' },
        ],
      });

      const result = await service.get('STD-999');

      expect(result).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should return validation result with no rules that have checks', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'Test rule' },
            ],
          },
        ],
      });

      const result = await service.validate('test code');

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('results');
      expect(result.totalRules).toBe(0);
    });

    it('should evaluate passing rule checks', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              {
                id: 'R1',
                name: 'Has function',
                severity: 'error',
                description: 'Code must have a function',
                check: 'code.includes("function")',
              },
            ],
          },
        ],
      });

      const result = await service.validate('function test() {}');

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].passed).toBe(true);
      expect(result.results[0].message).toBe('OK');
    });

    it('should evaluate failing rule checks', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              {
                id: 'R1',
                name: 'Has function',
                severity: 'error',
                description: 'Code must have a function',
                check: 'code.includes("function")',
              },
            ],
          },
        ],
      });

      const result = await service.validate('const x = 1;');

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[0].message).toBe('Code must have a function');
    });

    it('should handle multiple standards with multiple rules', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Standard 1',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'Rule 1 desc', check: 'true' },
              { id: 'R2', name: 'Rule 2', severity: 'warning', description: 'Rule 2 desc', check: 'false' },
            ],
          },
          {
            id: 'STD-002',
            name: 'Standard 2',
            rules: [
              { id: 'R3', name: 'Rule 3', severity: 'info', description: 'Rule 3 desc', check: 'true' },
            ],
          },
        ],
      });

      const result = await service.validate('any code');

      expect(result.totalRules).toBe(3);
      expect(result.passed).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should skip rules without check function', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'No check' },
              { id: 'R2', name: 'Rule 2', severity: 'warning', description: 'Has check', check: 'true' },
            ],
          },
        ],
      });

      const result = await service.validate('code');

      expect(result.totalRules).toBe(1);
      expect(result.results[0].ruleId).toBe('R2');
    });

    it('should handle invalid check expressions gracefully', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              { id: 'R1', name: 'Invalid Rule', severity: 'error', description: 'Bad check', check: 'invalid syntax!!!' },
            ],
          },
        ],
      });

      const result = await service.validate('code');

      expect(result.totalRules).toBe(1);
      expect(result.results[0].passed).toBe(true);
    });

    it('should return correct severity in results', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-001',
            name: 'Test Standard',
            rules: [
              { id: 'R1', name: 'Error Rule', severity: 'error', description: 'Error', check: 'true' },
              { id: 'R2', name: 'Warning Rule', severity: 'warning', description: 'Warning', check: 'true' },
              { id: 'R3', name: 'Info Rule', severity: 'info', description: 'Info', check: 'true' },
            ],
          },
        ],
      });

      const result = await service.validate('code');

      expect(result.results[0].severity).toBe('error');
      expect(result.results[1].severity).toBe('warning');
      expect(result.results[2].severity).toBe('info');
    });

    it('should include standardId and ruleName in results', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-VALIDATE',
            name: 'Validation Standard',
            rules: [
              { id: 'RULE-1', name: 'Check Name', severity: 'error', description: 'Desc', check: 'true' },
            ],
          },
        ],
      });

      const result = await service.validate('code');

      expect(result.results[0].standardId).toBe('STD-VALIDATE');
      expect(result.results[0].ruleName).toBe('Check Name');
    });
  });

  describe('export', () => {
    it('should export standard as JSON', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-EXP',
            name: 'Export Standard',
            version: '1.0.0',
            category: 'architecture',
            description: 'Export test',
            rules: [],
          },
        ],
      });

      const result = await service.export('STD-EXP', 'json');

      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('STD-EXP');
      expect(parsed.name).toBe('Export Standard');
    });

    it('should export standard as markdown', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-MD',
            name: 'Markdown Standard',
            version: '2.0.0',
            category: 'governance',
            description: 'Markdown export test',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'Rule desc' },
            ],
          },
        ],
      });

      const result = await service.export('STD-MD', 'markdown');

      expect(result).toContain('# Standard: Markdown Standard');
      expect(result).toContain('**ID:** STD-MD');
      expect(result).toContain('**Version:** 2.0.0');
      expect(result).toContain('**Category:** governance');
      expect(result).toContain('Markdown export test');
      expect(result).toContain('| R1 | Rule 1 | error | Rule desc |');
    });

    it('should throw error for non-existent standard', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [],
      });

      await expect(service.export('NONEXISTENT', 'json')).rejects.toThrow('Standard NONEXISTENT not found');
    });

    it('should include remediation section in markdown when rules have remediation', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-REM',
            name: 'Remediation Standard',
            version: '1.0.0',
            category: 'operations',
            description: 'Test remediation',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'Desc', remediation: 'Fix it this way' },
              { id: 'R2', name: 'Rule 2', severity: 'warning', description: 'Desc 2' },
            ],
          },
        ],
      });

      const result = await service.export('STD-REM', 'markdown');

      expect(result).toContain('## Remediation');
      expect(result).toContain('### R1: Rule 1');
      expect(result).toContain('Fix it this way');
      expect(result).not.toContain('### R2: Rule 2');
    });

    it('should not include remediation section when no rules have remediation', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-NOREM',
            name: 'No Remediation Standard',
            version: '1.0.0',
            category: 'infrastructure',
            description: 'No remediation test',
            rules: [
              { id: 'R1', name: 'Rule 1', severity: 'error', description: 'Desc' },
            ],
          },
        ],
      });

      const result = await service.export('STD-NOREM', 'markdown');

      expect(result).not.toContain('## Remediation');
    });

    it('should include all rule fields in markdown table', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [
          {
            id: 'STD-TABLE',
            name: 'Table Standard',
            version: '1.0.0',
            category: 'architecture',
            description: 'Table test',
            rules: [
              { id: 'R1', name: 'First Rule', severity: 'error', description: 'First desc' },
              { id: 'R2', name: 'Second Rule', severity: 'info', description: 'Second desc' },
            ],
          },
        ],
      });

      const result = await service.export('STD-TABLE', 'markdown');

      expect(result).toContain('| R1 | First Rule | error | First desc |');
      expect(result).toContain('| R2 | Second Rule | info | Second desc |');
    });
  });

  describe('updateIndex (private method)', () => {
    it('should add new standard to index', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const standard: Standard = {
        id: 'STD-NEW',
        name: 'New Standard',
        version: '1.0.0',
        category: 'architecture',
        description: 'New',
        rules: [],
      };

      await service.register(standard);

      const writeCalls = mockFileSystem.writeJson.mock.calls.filter(
        (call: any[]) => call[0].includes('standards-index.json'),
      );
      expect(writeCalls.length).toBeGreaterThan(0);
    });

    it('should update existing standard in index', async () => {
      mockFileSystem.exists.mockResolvedValueOnce(false);

      const standard1: Standard = {
        id: 'STD-UPDATE',
        name: 'Original',
        version: '1.0.0',
        category: 'architecture',
        description: 'Original',
        rules: [],
      };

      await service.register(standard1);

      jest.clearAllMocks();
      mockFileSystem.exists.mockResolvedValueOnce(true);
      mockFileSystem.readJson.mockResolvedValue({
        standards: [standard1],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      });

      const standard2: Standard = {
        id: 'STD-UPDATE',
        name: 'Updated',
        version: '2.0.0',
        category: 'architecture',
        description: 'Updated',
        rules: [],
      };

      await service.register(standard2);

      const indexWriteCall = mockFileSystem.writeJson.mock.calls.find(
        (call: any[]) => call[0].includes('standards-index.json'),
      );
      expect(indexWriteCall).toBeDefined();
      expect(indexWriteCall[1].standards).toHaveLength(1);
      expect(indexWriteCall[1].standards[0].name).toBe('Updated');
    });
  });
});
