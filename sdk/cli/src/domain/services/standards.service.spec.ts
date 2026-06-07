import { StandardsService, Standard } from './standards.service';

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
  });

  describe('validate', () => {
    it('should return validation result', async () => {
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
    });
  });
});
