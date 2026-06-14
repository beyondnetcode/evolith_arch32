import { CommandHistoryService, HistoryEntry } from './command-history.service';

jest.mock('fs-extra');
import * as fs from 'fs-extra';
const mockFs = fs as jest.Mocked<typeof fs>;

// ── helpers ───────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'h-000001',
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    command: 'validate',
    args: ['--satellite', '.'],
    exitCode: 0,
    durationMs: 120,
    success: true,
    ...overrides,
  };
}

function makeService() {
  return new CommandHistoryService('/tmp/test-repo');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.ensureDir.mockResolvedValue(undefined as unknown);
  mockFs.pathExists.mockResolvedValue(false as unknown);
  mockFs.appendFile.mockResolvedValue(undefined as unknown);
  mockFs.remove.mockResolvedValue(undefined as unknown);
});

// ── initialize ────────────────────────────────────────────────────────────────

describe('initialize', () => {
  it('creates the .evolith directory', async () => {
    const svc = makeService();
    await svc.initialize();
    expect(mockFs.ensureDir).toHaveBeenCalledWith(
      expect.stringContaining('.evolith'),
    );
  });

  it('starts empty when history file does not exist', async () => {
    const svc = makeService();
    await svc.initialize();
    expect(await svc.list()).toEqual([]);
  });

  it('parses existing JSONL history file', async () => {
    const entry = makeEntry();
    mockFs.pathExists.mockResolvedValue(true as unknown);
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entry) + '\n');
    const svc = makeService();
    await svc.initialize();
    const entries = await svc.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('h-000001');
  });

  it('skips malformed lines in history file', async () => {
    mockFs.pathExists.mockResolvedValue(true as unknown);
    (mockFs.readFile as jest.Mock).mockResolvedValue('bad json\n' + JSON.stringify(makeEntry()) + '\n');
    const svc = makeService();
    await svc.initialize();
    expect(await svc.list()).toHaveLength(1);
  });

  it('keeps only the last 1000 entries', async () => {
    const lines = Array.from({ length: 1100 }, (_, i) =>
      JSON.stringify(makeEntry({ id: `h-${String(i + 1).padStart(6, '0')}` })),
    ).join('\n');
    mockFs.pathExists.mockResolvedValue(true as unknown);
    (mockFs.readFile as jest.Mock).mockResolvedValue(lines);
    const svc = makeService();
    await svc.initialize();
    expect((await svc.list(2000)).length).toBe(1000);
  });

  it('is idempotent — calling twice does not double entries', async () => {
    const entry = makeEntry();
    mockFs.pathExists.mockResolvedValue(true as unknown);
    (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(entry) + '\n');
    const svc = makeService();
    await svc.initialize();
    await svc.initialize();
    expect((await svc.list()).length).toBe(1);
  });
});

// ── record ────────────────────────────────────────────────────────────────────

describe('record', () => {
  it('returns an id in h-NNNNNN format', async () => {
    const id = await makeService().record('validate', [], 0, 100);
    expect(id).toMatch(/^h-\d{6}$/);
  });

  it('appends JSON line to the history file', async () => {
    await makeService().record('validate', ['--satellite', '.'], 0, 50);
    expect(mockFs.appendFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"validate"'),
    );
  });

  it('marks success=true when exitCode=0', async () => {
    const svc = makeService();
    await svc.record('validate', [], 0, 10);
    const [entry] = await svc.list();
    expect(entry.success).toBe(true);
  });

  it('marks success=false when exitCode≠0', async () => {
    const svc = makeService();
    await svc.record('validate', [], 1, 10);
    const [entry] = await svc.list();
    expect(entry.success).toBe(false);
  });

  it('increments id counter across multiple records', async () => {
    const svc = makeService();
    const id1 = await svc.record('cmd', [], 0, 1);
    const id2 = await svc.record('cmd', [], 0, 1);
    expect(id1).not.toBe(id2);
  });
});

// ── list ─────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('returns entries in reverse chronological order (newest first)', async () => {
    const svc = makeService();
    await svc.record('first', [], 0, 1);
    await svc.record('second', [], 0, 1);
    const entries = await svc.list();
    expect(entries[0].command).toBe('second');
    expect(entries[1].command).toBe('first');
  });

  it('respects limit parameter', async () => {
    const svc = makeService();
    for (let i = 0; i < 5; i++) await svc.record(`cmd${i}`, [], 0, 1);
    expect(await svc.list(3)).toHaveLength(3);
  });

  it('returns all entries when limit > total', async () => {
    const svc = makeService();
    await svc.record('only', [], 0, 1);
    expect(await svc.list(100)).toHaveLength(1);
  });
});

// ── get ───────────────────────────────────────────────────────────────────────

describe('get', () => {
  it('returns the entry with the matching id', async () => {
    const svc = makeService();
    const id = await svc.record('validate', ['--satellite', '.'], 0, 42);
    const entry = await svc.get(id);
    expect(entry).toBeDefined();
    expect(entry!.command).toBe('validate');
    expect(entry!.durationMs).toBe(42);
  });

  it('returns undefined for unknown id', async () => {
    expect(await makeService().get('h-999999')).toBeUndefined();
  });
});

// ── search ────────────────────────────────────────────────────────────────────

describe('search', () => {
  it('finds entries by command name', async () => {
    const svc = makeService();
    await svc.record('validate', [], 0, 1);
    await svc.record('gate-status', [], 0, 1);
    const results = await svc.search('validate');
    expect(results).toHaveLength(1);
    expect(results[0].command).toBe('validate');
  });

  it('finds entries by args substring', async () => {
    const svc = makeService();
    await svc.record('validate', ['--satellite', '/my/repo'], 0, 1);
    const results = await svc.search('my/repo');
    expect(results).toHaveLength(1);
  });

  it('is case-insensitive', async () => {
    const svc = makeService();
    await svc.record('Validate', [], 0, 1);
    expect(await svc.search('validate')).toHaveLength(1);
    expect(await svc.search('VALIDATE')).toHaveLength(1);
  });

  it('returns empty array when no match', async () => {
    const svc = makeService();
    await svc.record('gate-status', [], 0, 1);
    expect(await svc.search('nonexistent')).toHaveLength(0);
  });
});

// ── clear ─────────────────────────────────────────────────────────────────────

describe('clear', () => {
  it('empties the in-memory entries', async () => {
    const svc = makeService();
    await svc.record('validate', [], 0, 1);
    await svc.clear();
    expect(await svc.list()).toHaveLength(0);
  });

  it('removes the history file when it exists', async () => {
    mockFs.pathExists.mockResolvedValue(true as unknown);
    await makeService().clear();
    expect(mockFs.remove).toHaveBeenCalled();
  });

  it('does not call remove when file does not exist', async () => {
    mockFs.pathExists.mockResolvedValue(false as unknown);
    await makeService().clear();
    expect(mockFs.remove).not.toHaveBeenCalled();
  });
});

// ── stats ─────────────────────────────────────────────────────────────────────

describe('stats', () => {
  it('returns zero stats when history is empty', async () => {
    const result = await makeService().stats();
    expect(result.totalCommands).toBe(0);
    expect(result.successRate).toBe('0%');
    expect(result.mostUsed).toHaveLength(0);
  });

  it('calculates success rate correctly', async () => {
    const svc = makeService();
    await svc.record('cmd', [], 0, 1);
    await svc.record('cmd', [], 0, 1);
    await svc.record('cmd', [], 1, 1);
    const { successRate } = await svc.stats();
    expect(successRate).toBe('66.7%');
  });

  it('returns mostUsed sorted by frequency', async () => {
    const svc = makeService();
    await svc.record('validate', [], 0, 1);
    await svc.record('validate', [], 0, 1);
    await svc.record('gate-status', [], 0, 1);
    const { mostUsed } = await svc.stats();
    expect(mostUsed[0].command).toBe('validate');
    expect(mostUsed[0].count).toBe(2);
  });

  it('counts recentCommands in last 24h', async () => {
    const svc = makeService();
    await svc.record('recent', [], 0, 1);
    const { recentCommands } = await svc.stats();
    expect(recentCommands).toBe(1);
  });
});

// ── replay ────────────────────────────────────────────────────────────────────

describe('replay', () => {
  it('returns command and args for a valid id', async () => {
    const svc = makeService();
    const id = await svc.record('gate-status', ['--since', '30'], 0, 1);
    const result = await svc.replay(id);
    expect(result).toEqual({ command: 'gate-status', args: ['--since', '30'] });
  });

  it('returns undefined for unknown id', async () => {
    expect(await makeService().replay('h-999999')).toBeUndefined();
  });
});
