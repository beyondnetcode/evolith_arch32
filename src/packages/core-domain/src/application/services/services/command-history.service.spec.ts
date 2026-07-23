import { CommandHistoryService, HistoryEntry } from './command-history.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('CommandHistoryService', () => {
  let tmpDir: string;
  let service: CommandHistoryService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cmd-history-'));
    service = new CommandHistoryService(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('record', () => {
    it('records a command entry with generated id', async () => {
      const id = await service.record('evolith validate', ['--topology', 'modular-monolith'], 0, 150);
      expect(id).toMatch(/^h-\d{6}$/);
    });

    it('increments id counter', async () => {
      const id1 = await service.record('cmd1', [], 0, 100);
      const id2 = await service.record('cmd2', [], 0, 100);
      expect(id2).not.toBe(id1);
    });

    it('marks entry as success when exitCode is 0', async () => {
      await service.record('cmd', [], 0, 100);
      const entries = await service.list(1);
      expect(entries[0].success).toBe(true);
    });

    it('marks entry as failure when exitCode is non-zero', async () => {
      await service.record('cmd', [], 1, 100);
      const entries = await service.list(1);
      expect(entries[0].success).toBe(false);
    });
  });

  describe('list', () => {
    it('returns entries in reverse chronological order', async () => {
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd2', [], 0, 100);
      await service.record('cmd3', [], 0, 100);

      const entries = await service.list(3);
      expect(entries[0].command).toBe('cmd3');
      expect(entries[1].command).toBe('cmd2');
      expect(entries[2].command).toBe('cmd1');
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await service.record(`cmd${i}`, [], 0, 100);
      }
      const entries = await service.list(3);
      expect(entries).toHaveLength(3);
    });

    it('returns empty array when no entries', async () => {
      const entries = await service.list(10);
      expect(entries).toEqual([]);
    });
  });

  describe('get', () => {
    it('retrieves entry by id', async () => {
      const id = await service.record('test-cmd', ['arg1'], 0, 100);
      const entry = await service.get(id);
      expect(entry).toBeDefined();
      expect(entry!.command).toBe('test-cmd');
      expect(entry!.args).toEqual(['arg1']);
    });

    it('returns undefined for non-existent id', async () => {
      const entry = await service.get('h-999999');
      expect(entry).toBeUndefined();
    });
  });

  describe('search', () => {
    it('finds entries by command name', async () => {
      await service.record('evolith validate', [], 0, 100);
      await service.record('evolith scaffold', [], 0, 100);
      await service.record('npm install', [], 0, 100);

      const results = await service.search('evolith');
      expect(results).toHaveLength(2);
    });

    it('finds entries by argument', async () => {
      await service.record('cmd', ['--topology', 'modular-monolith'], 0, 100);
      const results = await service.search('modular');
      expect(results).toHaveLength(1);
    });

    it('returns empty when no match', async () => {
      await service.record('cmd', [], 0, 100);
      const results = await service.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd2', [], 0, 100);
      await service.clear();
      const entries = await service.list(10);
      expect(entries).toEqual([]);
    });
  });

  describe('stats', () => {
    it('calculates statistics', async () => {
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd1', [], 0, 100);
      await service.record('cmd2', [], 1, 100);

      const stats = await service.stats();
      expect(stats.totalCommands).toBe(3);
      expect(stats.successRate).toBe('66.7%');
      expect(stats.mostUsed[0].command).toBe('cmd1');
      expect(stats.mostUsed[0].count).toBe(2);
    });

    it('handles empty history', async () => {
      const stats = await service.stats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.successRate).toBe('0%');
    });
  });

  describe('replay', () => {
    it('returns command and args for valid id', async () => {
      const id = await service.record('evolith validate', ['--topology', 'modular-monolith'], 0, 100);
      const replay = await service.replay(id);
      expect(replay).toEqual({
        command: 'evolith validate',
        args: ['--topology', 'modular-monolith'],
      });
    });

    it('returns undefined for non-existent id', async () => {
      const replay = await service.replay('h-999999');
      expect(replay).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('persists entries to file', async () => {
      await service.record('test-cmd', [], 0, 100);
      const historyFile = path.join(tmpDir, '.evolith', 'history.jsonl');
      const exists = await fs.pathExists(historyFile);
      expect(exists).toBe(true);
    });

    it('loads entries from existing file', async () => {
      // Record with first service
      await service.record('cmd1', [], 0, 100);

      // Create new service instance (simulates restart)
      const newService = new CommandHistoryService(tmpDir);
      const entries = await newService.list(10);
      expect(entries).toHaveLength(1);
      expect(entries[0].command).toBe('cmd1');
    });
  });
});
