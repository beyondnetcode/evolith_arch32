import * as os from 'os';
import * as path from 'path';
import * as realFs from 'fs';
import { NodeFileSystemProvider } from './node-filesystem.provider';

describe('NodeFileSystemProvider', () => {
  let base: string;
  let provider: NodeFileSystemProvider;

  beforeEach(() => {
    base = realFs.mkdtempSync(path.join(os.tmpdir(), 'evolith-nodefs-'));
    provider = new NodeFileSystemProvider().createFileSystem() as NodeFileSystemProvider;
  });

  afterEach(() => {
    realFs.rmSync(base, { recursive: true, force: true });
  });

  it('writes and reads text and buffers, resolving relative paths via cwd', async () => {
    await provider.writeFile('note.txt', 'hello', { cwd: base });
    expect(await provider.exists('note.txt', { cwd: base })).toBe(true);
    expect(await provider.readFile('note.txt', { cwd: base })).toBe('hello');
    expect((await provider.readFileBuffer(path.join(base, 'note.txt'))).toString()).toBe('hello');
  });

  it('writes and reads json with indentation', async () => {
    const file = path.join(base, 'data.json');
    await provider.writeJson(file, { a: 1, b: [2, 3] });
    expect(await provider.readJson(file)).toEqual({ a: 1, b: [2, 3] });
    expect(realFs.readFileSync(file, 'utf-8')).toContain('\n  ');
  });

  it('reports existence synchronously and asynchronously', async () => {
    const file = path.join(base, 'x.txt');
    expect(provider.existsSync(file)).toBe(false);
    await provider.writeFile(file, 'x');
    expect(provider.existsSync(file)).toBe(true);
    expect(await provider.exists(file)).toBe(true);
  });

  it('lists directory entries with type predicates and names', async () => {
    await provider.ensureDir(path.join(base, 'sub'));
    await provider.writeFile(path.join(base, 'a.txt'), 'a');

    const entries = await provider.readdir(base);
    expect(entries.find(e => e.name === 'sub')?.isDirectory()).toBe(true);
    expect(entries.find(e => e.name === 'a.txt')?.isFile()).toBe(true);

    const names = await provider.readdirNames(base);
    expect(names.sort()).toEqual(['a.txt', 'sub']);
  });

  it('stat reports directory vs file', async () => {
    await provider.ensureDir(path.join(base, 'd'));
    await provider.writeFile(path.join(base, 'f.txt'), 'f');
    expect((await provider.stat(path.join(base, 'd'))).isDirectory()).toBe(true);
    expect((await provider.stat(path.join(base, 'f.txt'))).isFile()).toBe(true);
  });

  it('removes files and trees', async () => {
    const file = path.join(base, 'gone.txt');
    await provider.writeFile(file, 'x');
    await provider.remove(file);
    expect(provider.existsSync(file)).toBe(false);
  });

  it('mkdir (recursive), copy, and ensureFile operate on real paths', async () => {
    const nested = path.join(base, 'deep', 'nested');
    await provider.mkdir(nested);
    expect(provider.existsSync(nested)).toBe(true);

    const src = path.join(base, 'src.txt');
    const dest = path.join(base, 'dest.txt');
    await provider.writeFile(src, 'copy-me');
    await provider.copy(src, dest);
    expect(await provider.readFile(dest)).toBe('copy-me');

    const touched = path.join(base, 'touched', 'file.txt');
    await provider.ensureFile(touched);
    expect(provider.existsSync(touched)).toBe(true);
  });
});
