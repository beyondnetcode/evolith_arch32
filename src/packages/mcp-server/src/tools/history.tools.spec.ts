import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CommandHistoryService } from '@beyondnet/evolith-core-domain/application/services/services/command-history.service';
import { createHistoryTools, HISTORY_DEFAULT_LIMIT } from './history.tools';

/**
 * GT-682 (#759). The tool reads through the CLI's own `CommandHistoryService`,
 * so the fixture is the FILE that service parses (`<base>/.evolith/history.jsonl`),
 * not a stubbed service — that keeps the "one reader" contract under test.
 */
function entry(n: number, command: string, args: string[] = [], exitCode = 0) {
  return {
    id: `h-${String(n).padStart(6, '0')}`,
    timestamp: new Date(Date.now() - (100 - n) * 1000).toISOString(),
    command,
    args,
    exitCode,
    durationMs: 10 * n,
    success: exitCode === 0,
  };
}

describe('createHistoryTools (GT-682 #759)', () => {
  let base: string;
  const factory = () => new CommandHistoryService(base);

  beforeEach(() => {
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-history-tool-'));
  });
  afterEach(() => fs.rmSync(base, { recursive: true, force: true }));

  function seed(entries: ReturnType<typeof entry>[]) {
    fs.mkdirSync(path.join(base, '.evolith'), { recursive: true });
    fs.writeFileSync(
      path.join(base, '.evolith', 'history.jsonl'),
      entries.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );
  }

  it('registers exactly one read-only tool named evolith-history', () => {
    const tools = createHistoryTools(factory);
    expect(tools).toHaveLength(1);
    expect(tools[0].schema.name).toBe('evolith-history');
    expect(tools[0].mutative).toBeFalsy();
    expect(tools[0].scope).toBe('read');
    expect(tools[0].schema.inputSchema.properties.action).toMatchObject({ enum: ['list', 'get', 'search', 'stats'] });
  });

  describe('list (default action)', () => {
    it('returns the most recent entries newest-first in a success envelope with a correlationId', async () => {
      seed([entry(1, 'validate'), entry(2, 'gate', ['evaluate']), entry(3, 'history')]);
      const [tool] = createHistoryTools(factory);
      const result: any = await tool.execute({});

      expect(result).toMatchObject({ success: true, meta: { command: 'evolith-history', schemaVersion: '1.0.0' } });
      expect(typeof result.meta.correlationId).toBe('string');
      expect(result.meta.correlationId.length).toBeGreaterThan(0);
      expect(result.data.map((e: any) => e.id)).toEqual(['h-000003', 'h-000002', 'h-000001']);
    });

    it(`defaults the limit to the CLI's ${HISTORY_DEFAULT_LIMIT} and honours an explicit one`, async () => {
      seed(Array.from({ length: 25 }, (_, i) => entry(i + 1, 'validate')));
      const [tool] = createHistoryTools(factory);

      const byDefault: any = await tool.execute({ action: 'list' });
      expect(byDefault.data).toHaveLength(HISTORY_DEFAULT_LIMIT);
      expect(byDefault.data[0].id).toBe('h-000025');

      const two: any = await tool.execute({ action: 'list', limit: 2 });
      expect(two.data.map((e: any) => e.id)).toEqual(['h-000025', 'h-000024']);
    });

    it('an absent history file is an empty listing, not an error', async () => {
      const [tool] = createHistoryTools(factory);
      const result: any = await tool.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('rejects a non-positive or non-integer limit before touching the store', async () => {
      const spy = jest.fn(factory);
      const [tool] = createHistoryTools(spy);
      const error: any = await tool.execute({ limit: 0 }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toMatch(/limit must be a positive integer/);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns the entry by id', async () => {
      seed([entry(1, 'validate'), entry(2, 'gate', ['evaluate', '--phase', 'design'], 2)]);
      const [tool] = createHistoryTools(factory);
      const result: any = await tool.execute({ action: 'get', id: 'h-000002' });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ id: 'h-000002', command: 'gate', exitCode: 2, success: false });
    });

    it('throws PATH_NOT_FOUND for an unknown id (the dispatcher turns it into an error envelope)', async () => {
      seed([entry(1, 'validate')]);
      const [tool] = createHistoryTools(factory);
      const error: any = await tool.execute({ action: 'get', id: 'h-999999' }).catch((e) => e);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('PATH_NOT_FOUND');
      expect(error.message).toContain('Entry not found: h-999999');
    });

    it('requires an id', async () => {
      const [tool] = createHistoryTools(factory);
      const error: any = await tool.execute({ action: 'get' }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('search', () => {
    it('matches command or arguments case-insensitively, newest first', async () => {
      seed([entry(1, 'validate', ['--satellite', 'Tracker']), entry(2, 'gate'), entry(3, 'tracker-sync')]);
      const [tool] = createHistoryTools(factory);
      const result: any = await tool.execute({ action: 'search', query: 'tracker' });
      expect(result.success).toBe(true);
      expect(result.data.map((e: any) => e.id)).toEqual(['h-000003', 'h-000001']);
    });

    it('requires a query', async () => {
      const [tool] = createHistoryTools(factory);
      const error: any = await tool.execute({ action: 'search', query: '  ' }).catch((e) => e);
      expect(error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('stats', () => {
    it('returns totals, success rate and most-used commands', async () => {
      seed([entry(1, 'validate'), entry(2, 'validate', [], 1), entry(3, 'gate')]);
      const [tool] = createHistoryTools(factory);
      const result: any = await tool.execute({ action: 'stats' });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ totalCommands: 3, successRate: '66.7%' });
      expect(result.data.mostUsed[0]).toEqual({ command: 'validate', count: 2 });
    });
  });

  it('rejects an unknown action', async () => {
    const [tool] = createHistoryTools(factory);
    const error: any = await tool.execute({ action: 'clear' }).catch((e) => e);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toMatch(/action must be one of: list, get, search, stats/);
  });

  it('wraps a reader failure as IO_ERROR instead of returning an error envelope', async () => {
    const broken = () =>
      ({ list: async () => { throw new Error('disk on fire'); } }) as unknown as CommandHistoryService;
    const [tool] = createHistoryTools(broken);
    const error: any = await tool.execute({}).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('IO_ERROR');
    expect(error.message).toContain('evolith-history failed: disk on fire');
  });
});
