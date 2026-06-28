import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { NodeFileSystemProvider } from './node-filesystem.provider';

describe('NodeFileSystemProvider', () => {
  let dir: string;
  let provider: NodeFileSystemProvider;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'infra-fs-'));
    provider = new NodeFileSystemProvider();
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('createFileSystem returns the provider itself (IFileSystem)', () => {
    expect(provider.createFileSystem()).toBe(provider);
  });

  it('writeFile/readFile round-trips text', async () => {
    const file = path.join(dir, 'a.txt');
    await provider.writeFile(file, 'hello');
    expect(await provider.readFile(file)).toBe('hello');
  });

  it('exists and existsSync reflect presence', async () => {
    const file = path.join(dir, 'present.txt');
    expect(await provider.exists(file)).toBe(false);
    expect(provider.existsSync(file)).toBe(false);
    await provider.writeFile(file, 'x');
    expect(await provider.exists(file)).toBe(true);
    expect(provider.existsSync(file)).toBe(true);
  });

  it('writeJson/readJson round-trips structured data', async () => {
    const file = path.join(dir, 'data.json');
    const value = { n: 1, list: ['a', 'b'] };
    await provider.writeJson(file, value);
    expect(await provider.readJson(file)).toEqual(value);
  });

  it('readFileBuffer returns a Buffer', async () => {
    const file = path.join(dir, 'bin.dat');
    await provider.writeFile(file, 'bytes');
    const buf = await provider.readFileBuffer(file);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf-8')).toBe('bytes');
  });

  it('readdir returns DirEntry objects with type predicates', async () => {
    await provider.writeFile(path.join(dir, 'f.txt'), '1');
    await provider.ensureDir(path.join(dir, 'sub'));
    const entries = await provider.readdir(dir);
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(['f.txt', 'sub']);
    const sub = entries.find((e) => e.name === 'sub');
    const file = entries.find((e) => e.name === 'f.txt');
    expect(sub?.isDirectory()).toBe(true);
    expect(file?.isFile()).toBe(true);
  });

  it('readdirNames returns plain names', async () => {
    await provider.writeFile(path.join(dir, 'only.txt'), '1');
    expect(await provider.readdirNames(dir)).toEqual(['only.txt']);
  });

  it('stat exposes isDirectory/isFile predicates', async () => {
    const file = path.join(dir, 's.txt');
    await provider.writeFile(file, '1');
    const stat = await provider.stat(file);
    expect(stat.isFile()).toBe(true);
    expect(stat.isDirectory()).toBe(false);
  });

  it('ensureDir, mkdir, ensureFile create paths', async () => {
    const nested = path.join(dir, 'x', 'y');
    await provider.ensureDir(nested);
    expect(await provider.exists(nested)).toBe(true);

    const deeper = path.join(dir, 'p', 'q', 'r');
    await provider.mkdir(deeper);
    expect(await provider.exists(deeper)).toBe(true);

    const file = path.join(dir, 'touch', 'new.txt');
    await provider.ensureFile(file);
    expect(await provider.exists(file)).toBe(true);
  });

  it('copy duplicates a file', async () => {
    const src = path.join(dir, 'src.txt');
    const dest = path.join(dir, 'dest.txt');
    await provider.writeFile(src, 'copied');
    await provider.copy(src, dest);
    expect(await provider.readFile(dest)).toBe('copied');
  });

  it('remove deletes a file', async () => {
    const file = path.join(dir, 'gone.txt');
    await provider.writeFile(file, '1');
    await provider.remove(file);
    expect(await provider.exists(file)).toBe(false);
  });

  it('resolves relative paths against an explicit cwd', async () => {
    await provider.writeFile('rel.txt', 'viacwd', { cwd: dir });
    expect(await provider.readFile('rel.txt', { cwd: dir })).toBe('viacwd');
    expect(await provider.exists('rel.txt', { cwd: dir })).toBe(true);
  });
});
