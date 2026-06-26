import * as path from 'path';
import { NodeFileSystemProvider } from './node-filesystem.provider';

const TEST_DIR = path.join(__dirname, '__test_fs__');
const TEST_FILE = path.join(TEST_DIR, 'test.txt');
const TEST_JSON = path.join(TEST_DIR, 'test.json');

describe('NodeFileSystemProvider', () => {
  let provider: NodeFileSystemProvider;

  beforeAll(async () => {
    provider = new NodeFileSystemProvider();
    await provider.ensureDir(TEST_DIR);
  });

  afterAll(async () => {
    try { await provider.remove(TEST_DIR); } catch {}
  });

  describe('createFileSystem', () => {
    it('should return itself as IFileSystem', () => {
      const fs = provider.createFileSystem();
      expect(fs).toBe(provider);
    });
  });

  describe('exists / existsSync', () => {
    it('should return true for existing file', async () => {
      await provider.writeFile(TEST_FILE, 'data');
      expect(await provider.exists(TEST_FILE)).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      expect(await provider.exists('/nonexistent/path')).toBe(false);
    });

    it('should check existence synchronously', () => {
      expect(provider.existsSync(__filename)).toBe(true);
      expect(provider.existsSync('/nonexistent')).toBe(false);
    });
  });

  describe('readFile / writeFile', () => {
    it('should write and read a file', async () => {
      await provider.writeFile(TEST_FILE, 'hello world');
      const content = await provider.readFile(TEST_FILE);
      expect(content).toBe('hello world');
    });

    it('should read a file with encoding option', async () => {
      await provider.writeFile(TEST_FILE, 'encoded');
      const content = await provider.readFile(TEST_FILE, { encoding: 'utf-8' });
      expect(content).toBe('encoded');
    });

    it('should read file buffer', async () => {
      await provider.writeFile(TEST_FILE, 'buffer test');
      const buf = await provider.readFileBuffer(TEST_FILE);
      expect(Buffer.isBuffer(buf)).toBe(true);
    });
  });

  describe('readJson / writeJson', () => {
    it('should write and read JSON', async () => {
      const data = { key: 'value', num: 42 };
      await provider.writeJson(TEST_JSON, data);
      const result = await provider.readJson(TEST_JSON);
      expect(result).toEqual(data);
    });
  });

  describe('readdir / readdirNames', () => {
    it('should list directory entries with types', async () => {
      await provider.writeFile(TEST_FILE, 'data');
      const entries = await provider.readdir(TEST_DIR);
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should list directory names', async () => {
      const names = await provider.readdirNames(TEST_DIR);
      expect(names.length).toBeGreaterThan(0);
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      await provider.writeFile(TEST_FILE, 'data');
      const stats = await provider.stat(TEST_FILE);
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
    });
  });

  describe('mkdir / remove', () => {
    it('should create and remove directories', async () => {
      const tmpDir = path.join(TEST_DIR, 'subdir');
      await provider.mkdir(tmpDir);
      expect(await provider.exists(tmpDir)).toBe(true);
      await provider.remove(tmpDir);
      expect(await provider.exists(tmpDir)).toBe(false);
    });
  });

  describe('copy', () => {
    it('should copy a file', async () => {
      const src = path.join(TEST_DIR, 'src.txt');
      const dest = path.join(TEST_DIR, 'dest.txt');
      await provider.writeFile(src, 'copy me');
      await provider.copy(src, dest);
      expect(await provider.exists(dest)).toBe(true);
      expect(await provider.readFile(dest)).toBe('copy me');
    });
  });
});

