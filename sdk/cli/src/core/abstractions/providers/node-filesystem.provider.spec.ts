import { NodeFileSystemProvider } from './node-filesystem.provider';

// ── mock fs-extra ─────────────────────────────────────────────────────────────

jest.mock('fs-extra');
import * as fs from 'fs-extra';
const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => jest.clearAllMocks());

function make() { return new NodeFileSystemProvider(); }

// ── createFileSystem ──────────────────────────────────────────────────────────

describe('createFileSystem', () => {
  it('returns itself', () => {
    const p = make();
    expect(p.createFileSystem()).toBe(p);
  });
});

// ── exists ────────────────────────────────────────────────────────────────────

describe('exists', () => {
  it('returns true when file is found', async () => {
    mockFs.pathExists.mockResolvedValue(true as any);
    expect(await make().exists('/some/file.txt')).toBe(true);
  });

  it('returns false when file not found', async () => {
    mockFs.pathExists.mockResolvedValue(false as any);
    expect(await make().exists('/no/file.txt')).toBe(false);
  });

  it('resolves relative path using cwd option', async () => {
    mockFs.pathExists.mockResolvedValue(true as any);
    await make().exists('file.txt', { cwd: '/base' });
    expect(mockFs.pathExists).toHaveBeenCalledWith('/base/file.txt');
  });
});

// ── existsSync ────────────────────────────────────────────────────────────────

describe('existsSync', () => {
  it('returns true synchronously', () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(make().existsSync('/some/file.txt')).toBe(true);
  });

  it('returns false synchronously', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(make().existsSync('/no/file.txt')).toBe(false);
  });
});

// ── readFile ──────────────────────────────────────────────────────────────────

describe('readFile', () => {
  it('returns file content', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue('hello world');
    expect(await make().readFile('/file.txt')).toBe('hello world');
  });

  it('uses utf-8 encoding by default', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue('');
    await make().readFile('/file.txt');
    expect(mockFs.readFile).toHaveBeenCalledWith('/file.txt', 'utf-8');
  });

  it('uses cwd to resolve relative path', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue('content');
    await make().readFile('rel.txt', { cwd: '/base' });
    expect(mockFs.readFile).toHaveBeenCalledWith('/base/rel.txt', 'utf-8');
  });
});

// ── readJson ──────────────────────────────────────────────────────────────────

describe('readJson', () => {
  it('parses JSON content', async () => {
    (mockFs.readFile as jest.Mock).mockResolvedValue('{"key":"val"}');
    const result = await make().readJson('/data.json');
    expect(result).toEqual({ key: 'val' });
  });
});

// ── writeFile ─────────────────────────────────────────────────────────────────

describe('writeFile', () => {
  it('calls fs.writeFile with content', async () => {
    mockFs.writeFile.mockResolvedValue(undefined as any);
    await make().writeFile('/out.txt', 'data');
    expect(mockFs.writeFile).toHaveBeenCalledWith('/out.txt', 'data', 'utf-8');
  });
});

// ── writeJson ─────────────────────────────────────────────────────────────────

describe('writeJson', () => {
  it('calls fs.writeJson with spaces: 2', async () => {
    mockFs.writeJson.mockResolvedValue(undefined as any);
    await make().writeJson('/out.json', { a: 1 });
    expect(mockFs.writeJson).toHaveBeenCalledWith(
      '/out.json',
      { a: 1 },
      expect.objectContaining({ spaces: 2 }),
    );
  });
});

// ── readdir ───────────────────────────────────────────────────────────────────

describe('readdir', () => {
  it('maps fs entries to DirEntry objects', async () => {
    const fakeEntries = [
      { name: 'a.txt', isDirectory: () => false, isFile: () => true },
      { name: 'subdir', isDirectory: () => true,  isFile: () => false },
    ];
    (mockFs.readdir as jest.Mock).mockResolvedValue(fakeEntries as any);
    const result = await make().readdir('/dir');
    expect(result[0].name).toBe('a.txt');
    expect(result[0].isFile()).toBe(true);
    expect(result[1].isDirectory()).toBe(true);
  });
});

// ── readdirNames ──────────────────────────────────────────────────────────────

describe('readdirNames', () => {
  it('returns string array from fs.readdir', async () => {
    (mockFs.readdir as jest.Mock).mockResolvedValue(['a.txt', 'b.txt'] as any);
    expect(await make().readdirNames('/dir')).toEqual(['a.txt', 'b.txt']);
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('calls fs.remove with resolved path', async () => {
    mockFs.remove.mockResolvedValue(undefined as any);
    await make().remove('/target');
    expect(mockFs.remove).toHaveBeenCalledWith('/target');
  });
});

// ── ensureDir ─────────────────────────────────────────────────────────────────

describe('ensureDir', () => {
  it('calls fs.ensureDir with resolved path', async () => {
    mockFs.ensureDir.mockResolvedValue(undefined as any);
    await make().ensureDir('/newdir');
    expect(mockFs.ensureDir).toHaveBeenCalledWith('/newdir');
  });
});

// ── stat ──────────────────────────────────────────────────────────────────────

describe('stat', () => {
  it('returns isDirectory and isFile callables', async () => {
    (mockFs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
      isFile:      () => false,
    });
    const result = await make().stat('/dir');
    expect(result.isDirectory()).toBe(true);
    expect(result.isFile()).toBe(false);
  });
});
