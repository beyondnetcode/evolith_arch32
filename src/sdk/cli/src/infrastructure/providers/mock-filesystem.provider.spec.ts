import { MockFileSystemProvider } from './mock-filesystem.provider';

describe('MockFileSystemProvider', () => {
  let fs: MockFileSystemProvider;

  beforeEach(() => {
    fs = new MockFileSystemProvider();
  });

  it('stores and reads text files', async () => {
    fs.setFile('/a/b.txt', 'hello');
    expect(await fs.exists('/a/b.txt')).toBe(true);
    expect(fs.existsSync('/a/b.txt')).toBe(true);
    expect(await fs.readFile('/a/b.txt')).toBe('hello');
    expect((await fs.readFileBuffer('/a/b.txt')).toString()).toBe('hello');
  });

  it('stores and reads json (object and serialized content)', async () => {
    fs.setJson('/a/data.json', { x: 1 });
    expect(await fs.readJson('/a/data.json')).toEqual({ x: 1 });

    fs.setFile('/a/raw.json', JSON.stringify({ y: 2 }));
    expect(await fs.readJson('/a/raw.json')).toEqual({ y: 2 });
  });

  it('reports existence of children under a registered directory', async () => {
    fs.setDirectory('/dir');
    expect(await fs.exists('/dir/child/deep.txt')).toBe(true);
  });

  it('throws when reading missing or directory paths', async () => {
    await expect(fs.readFile('/missing')).rejects.toThrow('File not found');
    fs.setDirectory('/d');
    await expect(fs.readFile('/d')).rejects.toThrow('Path is directory');
    await expect(fs.readJson('/missing')).rejects.toThrow('File not found');
  });

  it('writes files and json', async () => {
    await fs.writeFile('/w.txt', 'data');
    expect(await fs.readFile('/w.txt')).toBe('data');
    await fs.writeJson('/w.json', { a: 1 });
    expect(await fs.readJson('/w.json')).toEqual({ a: 1 });
  });

  it('lists immediate directory entries by name and DirEntry', async () => {
    fs.setFile('/root/a.txt', 'a');
    fs.setDirectory('/root/sub');
    fs.setFile('/root/sub/nested.txt', 'n');

    const names = await fs.readdirNames('/root');
    expect(names.sort()).toEqual(['a.txt', 'sub']);

    const entries = await fs.readdir('/root');
    const sub = entries.find(e => e.name === 'sub');
    expect(sub?.isDirectory()).toBe(true);
  });

  it('removes files and subtrees', async () => {
    fs.setDirectory('/x');
    fs.setFile('/x/a.txt', 'a');
    await fs.remove('/x');
    expect(await fs.exists('/x/a.txt')).toBe(false);
  });

  it('ensureDir registers a directory and stat reflects it', async () => {
    await fs.ensureDir('/created');
    const st = await fs.stat('/created');
    expect(st.isDirectory()).toBe(true);
    await expect(fs.stat('/none')).rejects.toThrow('Path not found');
  });

  it('clear resets the store', async () => {
    fs.setFile('/a.txt', 'x');
    fs.clear();
    expect(await fs.exists('/a.txt')).toBe(false);
  });

  it('exposes no-op fs-extra shims', async () => {
    await expect(fs.mkdir('/p')).resolves.toBeUndefined();
    await expect(fs.copy('/a', '/b')).resolves.toBeUndefined();
    await expect(fs.ensureFile('/f')).resolves.toBeUndefined();
  });
});
