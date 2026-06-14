import { ADRService, CreateADRInput } from './adr.service';

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

describe('ADRService', () => {
  let service: ADRService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ADRService(mockFileSystem as unknown, '/test');
  });

  describe('create', () => {
    it('should create a new ADR', async () => {
      mockFileSystem.exists.mockResolvedValue(false);
      mockFileSystem.readdirNames.mockResolvedValue([]);

      const input: CreateADRInput = {
        title: 'Use Hexagonal Architecture',
        context: 'We need clean separation of concerns',
        decision: 'Adopt hexagonal architecture pattern',
        consequences: {
          positive: ['Better testability', 'Clear boundaries'],
          negative: ['Initial complexity'],
        },
      };

      const result = await service.create(input);

      expect(result.id).toBe('ADR-0001');
      expect(result.title).toBe(input.title);
      expect(result.status).toBe('Proposed');
      expect(mockFileSystem.writeJson).toHaveBeenCalled();
      expect(mockFileSystem.writeFile).toHaveBeenCalled();
    });

    it('should increment ADR number', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json', 'ADR-0002.json']);
      const fullAdr1 = { id: 'ADR-0001', number: 1, title: 'First', status: 'Proposed', date: '2026-01-01', context: '', decision: '', consequences: { positive: [], negative: [] } };
      const fullAdr2 = { id: 'ADR-0002', number: 2, title: 'Second', status: 'Accepted', date: '2026-01-02', context: '', decision: '', consequences: { positive: [], negative: [] } };
      mockFileSystem.readJson
        .mockResolvedValueOnce(fullAdr1)
        .mockResolvedValueOnce(fullAdr2)
        .mockResolvedValueOnce(fullAdr1)
        .mockResolvedValueOnce(fullAdr2);

      const input: CreateADRInput = {
        title: 'New ADR',
        context: 'Context',
        decision: 'Decision',
        consequences: { positive: ['Good'], negative: ['Bad'] },
      };

      const result = await service.create(input);

      expect(result.number).toBe(3);
      expect(result.id).toBe('ADR-0003');
    });
  });

  describe('list', () => {
    it('should return empty array when directory does not exist', async () => {
      mockFileSystem.exists.mockResolvedValue(false);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return ADRs sorted by number descending', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json', 'ADR-0002.json']);
      mockFileSystem.readJson
        .mockResolvedValueOnce({ id: 'ADR-0001', number: 1, title: 'First', status: 'Proposed', date: '2026-01-01', context: '', decision: '', consequences: { positive: [], negative: [] } })
        .mockResolvedValueOnce({ id: 'ADR-0002', number: 2, title: 'Second', status: 'Accepted', date: '2026-01-02', context: '', decision: '', consequences: { positive: [], negative: [] } });

      const result = await service.list();

      expect(result[0].number).toBe(2);
      expect(result[1].number).toBe(1);
    });
  });

  describe('get', () => {
    it('should return ADR by id', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json']);
      mockFileSystem.readJson.mockResolvedValue({ id: 'ADR-0001', number: 1, title: 'Test', status: 'Proposed', date: '2026-01-01', context: '', decision: '', consequences: { positive: [], negative: [] } });

      const result = await service.get('ADR-0001');

      expect(result?.id).toBe('ADR-0001');
    });

    it('should return ADR by number', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json']);
      mockFileSystem.readJson.mockResolvedValue({ id: 'ADR-0001', number: 1, title: 'Test', status: 'Proposed', date: '2026-01-01', context: '', decision: '', consequences: { positive: [], negative: [] } });

      const result = await service.get('ADR-0001');

      expect(result?.id).toBe('ADR-0001');
    });

    it('should return undefined for non-existent ADR', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue([]);

      const result = await service.get('ADR-9999');

      expect(result).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update ADR status', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json']);
      mockFileSystem.readJson.mockResolvedValue({
        id: 'ADR-0001',
        number: 1,
        title: 'Test',
        status: 'Proposed',
        date: '2026-01-01',
        context: '',
        decision: '',
        consequences: { positive: [], negative: [] },
      });

      const result = await service.updateStatus('ADR-0001', 'Accepted', 'Approved by board');

      expect(result?.status).toBe('Accepted');
    });

    it('should return undefined for non-existent ADR', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue([]);

      const result = await service.updateStatus('ADR-9999', 'Accepted');

      expect(result).toBeUndefined();
    });
  });

  describe('getMatrix', () => {
    it('should return ADR matrix with summary', async () => {
      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readdirNames.mockResolvedValue(['ADR-0001.json', 'ADR-0002.json']);
      mockFileSystem.readJson
        .mockResolvedValueOnce({ id: 'ADR-0001', number: 1, status: 'Accepted', title: '', date: '', context: '', decision: '', consequences: { positive: [], negative: [] } })
        .mockResolvedValueOnce({ id: 'ADR-0002', number: 2, status: 'Proposed', title: '', date: '', context: '', decision: '', consequences: { positive: [], negative: [] } });

      const matrix = await service.getMatrix();

      expect(matrix.summary.total).toBe(2);
      expect(matrix.summary.accepted).toBe(1);
      expect(matrix.summary.proposed).toBe(1);
      expect(matrix.adrs).toHaveLength(2);
    });
  });
});
