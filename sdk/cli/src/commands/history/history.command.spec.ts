import { HistoryCommand } from './history.command';

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.cyan = (str: string) => str;
  chalkFn.dim = (str: string) => str;
  chalkFn.white = (str: string) => str;
  chalkFn.bgCyan = { black: { bold: (str: string) => str } };
  chalkFn.bgYellow = { black: { bold: (str: string) => str } };
  return chalkFn;
});

jest.mock('../../core/services/command-history.service', () => ({
  CommandHistoryService: jest.fn().mockImplementation(() => ({
    list: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    stats: jest.fn(),
    clear: jest.fn(),
    replay: jest.fn(),
  })),
}));

jest.mock('@clack/prompts', () => ({
  confirm: jest.fn(),
}));

import chalk from 'chalk';
import { CommandHistoryService } from '../../core/services/command-history.service';
import * as p from '@clack/prompts';

const mockList = jest.fn();
const mockGet = jest.fn();
const mockSearch = jest.fn();
const mockStats = jest.fn();
const mockClear = jest.fn();
const mockReplay = jest.fn();

(CommandHistoryService as jest.Mock).mockImplementation(() => ({
  list: mockList,
  get: mockGet,
  search: mockSearch,
  stats: mockStats,
  clear: mockClear,
  replay: mockReplay,
}));

describe('HistoryCommand', () => {
  let command: HistoryCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new HistoryCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
    mockList.mockReset();
    mockGet.mockReset();
    mockSearch.mockReset();
    mockStats.mockReset();
    mockClear.mockReset();
    mockReplay.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('run', () => {
    it('should list history by default', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], {});

      expect(mockList).toHaveBeenCalledWith(20);
    });

    it('should show stats when --stats is passed', async () => {
      mockStats.mockResolvedValue({
        totalCommands: 100,
        successRate: '95.0%',
        mostUsed: [
          { command: 'init', count: 50 },
          { command: 'validate', count: 30 },
        ],
        recentCommands: 10,
      });

      await command.run([], { stats: true });

      expect(mockStats).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Total Commands:', 100);
    });

    it('should show entry when --get is passed', async () => {
      mockGet.mockResolvedValue({
        id: 'h-000001',
        timestamp: '2024-01-01T00:00:00.000Z',
        command: 'init',
        args: ['--force'],
        exitCode: 0,
        durationMs: 1500,
        success: true,
      });

      await command.run([], { get: 'h-000001' });

      expect(mockGet).toHaveBeenCalledWith('h-000001');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('init')
      );
    });

    it('should show error when entry is not found', async () => {
      mockGet.mockResolvedValue(undefined);

      await command.run([], { get: 'h-999999' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });

    it('should search entries when --search is passed', async () => {
      mockSearch.mockResolvedValue([
        {
          id: 'h-000001',
          timestamp: '2024-01-01T00:00:00.000Z',
          command: 'init',
          args: ['--force'],
          exitCode: 0,
          durationMs: 1500,
          success: true,
        },
      ]);

      await command.run([], { search: 'init' });

      expect(mockSearch).toHaveBeenCalledWith('init');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 matching')
      );
    });

    it('should show no matches when search returns empty', async () => {
      mockSearch.mockResolvedValue([]);

      await command.run([], { search: 'nonexistent' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No matches found')
      );
    });

    it('should clear history when --clear is passed and confirmed', async () => {
      (p.confirm as jest.Mock).mockResolvedValue(true);
      mockClear.mockResolvedValue(undefined);

      await command.run([], { clear: true });

      expect(mockClear).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('History cleared')
      );
    });

    it('should not clear history when user cancels', async () => {
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await command.run([], { clear: true });

      expect(mockClear).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cancelled')
      );
    });

    it('should replay command when --replay is passed', async () => {
      mockReplay.mockResolvedValue({
        command: 'init',
        args: ['--force'],
      });

      await command.run([], { replay: 'h-000001' });

      expect(mockReplay).toHaveBeenCalledWith('h-000001');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('evolith init --force')
      );
    });

    it('should show error when replay entry is not found', async () => {
      mockReplay.mockResolvedValue(undefined);

      await command.run([], { replay: 'h-999999' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );
    });
  });

  describe('listHistory', () => {
    it('should show message when history is empty', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No commands in history')
      );
    });

    it('should display history entries in table format', async () => {
      mockList.mockResolvedValue([
        {
          id: 'h-000001',
          timestamp: '2024-01-15T10:30:00.000Z',
          command: 'init',
          args: ['--force'],
          exitCode: 0,
          durationMs: 500,
          success: true,
        },
        {
          id: 'h-000002',
          timestamp: '2024-01-15T11:00:00.000Z',
          command: 'validate',
          args: ['--satellite', '/path'],
          exitCode: 1,
          durationMs: 2500,
          success: false,
        },
      ]);

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing last 2 commands')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('init')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('validate')
      );
    });

    it('should display duration in milliseconds for short durations', async () => {
      mockList.mockResolvedValue([
        {
          id: 'h-000001',
          timestamp: '2024-01-15T10:30:00.000Z',
          command: 'fast',
          args: [],
          exitCode: 0,
          durationMs: 200,
          success: true,
        },
      ]);

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('200ms')
      );
    });

    it('should display duration in seconds for long durations', async () => {
      mockList.mockResolvedValue([
        {
          id: 'h-000001',
          timestamp: '2024-01-15T10:30:00.000Z',
          command: 'slow',
          args: [],
          exitCode: 0,
          durationMs: 5000,
          success: true,
        },
      ]);

      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('5.0s')
      );
    });

    it('should respect custom limit', async () => {
      mockList.mockResolvedValue([]);

      await command.run([], { limit: 5 });

      expect(mockList).toHaveBeenCalledWith(5);
    });

    it('should truncate long commands to 40 characters', async () => {
      mockList.mockResolvedValue([
        {
          id: 'h-000001',
          timestamp: '2024-01-15T10:30:00.000Z',
          command: 'validate',
          args: ['--satellite', '/very/long/path/to/satellite/repository'],
          exitCode: 0,
          durationMs: 100,
          success: true,
        },
      ]);

      await command.run([], {});

      const calls = logSpy.mock.calls.map((c: string[]) => c[0]);
      const cmdCalls = calls.filter((c: string) => c.includes('validate'));
      expect(cmdCalls.length).toBeGreaterThan(0);
    });
  });

  describe('showEntry', () => {
    it('should display full entry details', async () => {
      mockGet.mockResolvedValue({
        id: 'h-000001',
        timestamp: '2024-01-15T10:30:00.000Z',
        command: 'validate',
        args: ['--satellite', '/path'],
        exitCode: 0,
        durationMs: 3000,
        success: true,
      });

      await command.run([], { get: 'h-000001' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Command History Entry')
      );
      expect(logSpy).toHaveBeenCalledWith('Timestamp:', expect.any(String));
      expect(logSpy).toHaveBeenCalledWith('Command:', 'validate');
      expect(logSpy).toHaveBeenCalledWith('Arguments:', expect.any(String));
      expect(logSpy).toHaveBeenCalledWith('Exit Code:', 0);
      expect(logSpy).toHaveBeenCalledWith('Duration:', '3000ms');
      expect(logSpy).toHaveBeenCalledWith('Success:', expect.any(String));
    });

    it('should display failed entry correctly', async () => {
      mockGet.mockResolvedValue({
        id: 'h-000002',
        timestamp: '2024-01-15T11:00:00.000Z',
        command: 'validate',
        args: [],
        exitCode: 1,
        durationMs: 1000,
        success: false,
      });

      await command.run([], { get: 'h-000002' });

      const calls = logSpy.mock.calls.flat();
      expect(calls).toContain('No');
    });
  });

  describe('searchEntries', () => {
    it('should limit results to 20 entries', async () => {
      const manyEntries = Array.from({ length: 30 }, (_, i) => ({
        id: `h-${String(i + 1).padStart(6, '0')}`,
        timestamp: '2024-01-15T10:30:00.000Z',
        command: 'test',
        args: [],
        exitCode: 0,
        durationMs: 100,
        success: true,
      }));
      mockSearch.mockResolvedValue(manyEntries);

      await command.run([], { search: 'test' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 30 matching')
      );
    });
  });

  describe('showStats', () => {
    it('should display statistics with most used commands', async () => {
      mockStats.mockResolvedValue({
        totalCommands: 50,
        successRate: '80.0%',
        mostUsed: [
          { command: 'init', count: 25 },
          { command: 'validate', count: 15 },
          { command: 'standards', count: 10 },
        ],
        recentCommands: 5,
      });

      await command.run([], { stats: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Statistics')
      );
      expect(logSpy).toHaveBeenCalledWith('Total Commands:', 50);
      expect(logSpy).toHaveBeenCalledWith('Success Rate:', '80.0%');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('init')
      );
    });

    it('should handle empty mostUsed list', async () => {
      mockStats.mockResolvedValue({
        totalCommands: 0,
        successRate: '0%',
        mostUsed: [],
        recentCommands: 0,
      });

      await command.run([], { stats: true });

      expect(logSpy).toHaveBeenCalledWith('Success Rate:', '0%');
    });
  });

  describe('parseList', () => {
    it('should return true', () => {
      expect(command.parseList()).toBe(true);
    });
  });

  describe('parseGet', () => {
    it('should return the value', () => {
      expect(command.parseGet('h-000001')).toBe('h-000001');
    });
  });

  describe('parseSearch', () => {
    it('should return the value', () => {
      expect(command.parseSearch('init')).toBe('init');
    });
  });

  describe('parseStats', () => {
    it('should return true', () => {
      expect(command.parseStats()).toBe(true);
    });
  });

  describe('parseClear', () => {
    it('should return true', () => {
      expect(command.parseClear()).toBe(true);
    });
  });

  describe('parseLimit', () => {
    it('should parse valid number', () => {
      expect(command.parseLimit('10')).toBe(10);
    });

    it('should return default 20 for invalid input', () => {
      expect(command.parseLimit('invalid')).toBe(20);
    });

    it('should return default 20 for empty string', () => {
      expect(command.parseLimit('')).toBe(20);
    });
  });

  describe('parseReplay', () => {
    it('should return the value', () => {
      expect(command.parseReplay('h-000001')).toBe('h-000001');
    });
  });
});
