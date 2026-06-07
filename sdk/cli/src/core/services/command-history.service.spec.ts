import { CommandHistoryService } from './command-history.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readFile: jest.fn().mockResolvedValue(''),
  appendFile: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));

const mockedFs = fs as unknown as {
  ensureDir: jest.Mock;
  pathExists: jest.Mock;
  readFile: jest.Mock;
  appendFile: jest.Mock;
  writeFile: jest.Mock;
  remove: jest.Mock;
};

describe('CommandHistoryService', () => {
  let service: CommandHistoryService;
  let counter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.pathExists.mockResolvedValue(false);
    mockedFs.readFile.mockResolvedValue('');
    mockedFs.appendFile.mockResolvedValue(undefined);
    mockedFs.remove.mockResolvedValue(undefined);
    service = new CommandHistoryService(`/tmp/test-repo-${Date.now()}-${++counter}`);
  });

  describe('initialize', () => {
    it('should create history directory', async () => {
      await service.initialize();
      expect(mockedFs.ensureDir).toHaveBeenCalled();
    });

    it('should load existing history from file', async () => {
      const mockHistory = [
        JSON.stringify({ id: 'h-000001', timestamp: '2026-01-01', command: 'validate', args: [], exitCode: 0, durationMs: 100, success: true }),
        JSON.stringify({ id: 'h-000002', timestamp: '2026-01-02', command: 'init', args: ['--name', 'test'], exitCode: 0, durationMs: 200, success: true }),
      ].join('\n');

      let readCount = 0;
      mockedFs.pathExists.mockImplementation(async () => true);
      mockedFs.readFile.mockImplementation(async () => {
        readCount++;
        return readCount === 1 ? mockHistory : '';
      });

      const newService = new CommandHistoryService(`/tmp/test-repo-load-${Date.now()}-${++counter}`);
      await newService.initialize();
      const entries = await newService.list();

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip malformed lines', async () => {
      const mockContent = 'invalid json\n{"id":"h-000001","timestamp":"2026-01-01","command":"test","args":[],"exitCode":0,"durationMs":100,"success":true}\n';

      let readCount = 0;
      mockedFs.pathExists.mockImplementation(async () => true);
      mockedFs.readFile.mockImplementation(async () => {
        readCount++;
        return readCount === 1 ? mockContent : '';
      });

      const newService = new CommandHistoryService(`/tmp/test-repo-malformed-${Date.now()}-${++counter}`);
      await newService.initialize();
      const entries = await newService.list();

      expect(entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('record', () => {
    it('should record a successful command', async () => {
      const id = await service.record('validate', [], 0, 150);
      expect(id).toMatch(/^h-\d{6}$/);
      expect(mockedFs.appendFile).toHaveBeenCalled();
    });

    it('should record a failed command', async () => {
      const id = await service.record('validate', ['--arch'], 1, 50);
      expect(id).toMatch(/^h-\d{6}$/);
    });

    it('should increment entry counter', async () => {
      const id1 = await service.record('cmd1', [], 0, 100);
      const id2 = await service.record('cmd2', [], 0, 100);
      expect(id2).not.toBe(id1);
    });
  });

  describe('list', () => {
    it('should return all history entries', async () => {
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd2', ['--flag'], 0, 200);
      const entries = await service.list();
      expect(entries.length).toBe(2);
    });

    it('should limit results when limit provided', async () => {
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd2', [], 0, 100);
      await service.record('cmd3', [], 0, 100);
      const entries = await service.list(2);
      expect(entries.length).toBe(2);
    });
  });

  describe('search', () => {
    it('should search by command name', async () => {
      await service.record('validate', [], 0, 100);
      await service.record('init', ['--name', 'test'], 0, 200);
      await service.record('validate', ['--arch'], 0, 150);
      const results = await service.search('validate');
      expect(results.length).toBe(2);
    });

    it('should return empty array for no matches', async () => {
      await service.record('validate', [], 0, 100);
      const results = await service.search('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('stats', () => {
    it('should return command statistics', async () => {
      await service.record('validate', [], 0, 100);
      await service.record('validate', [], 0, 200);
      await service.record('init', [], 1, 50);
      const stats = await service.stats();
      expect(stats.totalCommands).toBe(3);
      expect(stats.successRate).toContain('66.7');
    });

    it('should return 0 success rate with no commands', async () => {
      const newService = new CommandHistoryService(`/tmp/test-repo-empty-${Date.now()}-${++counter}`);
      const stats = await newService.stats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.successRate).toBe('0%');
    });
  });

  describe('clear', () => {
    it('should clear all history', async () => {
      await service.record('cmd1', [], 0, 100);
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('');
      await service.clear();
      mockedFs.pathExists.mockResolvedValue(false);
      const entries = await service.list();
      expect(entries.length).toBe(0);
    });
  });
});
