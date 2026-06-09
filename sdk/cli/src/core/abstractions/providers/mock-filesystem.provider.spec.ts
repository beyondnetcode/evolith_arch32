import { MockFileSystemProvider } from './mock-filesystem.provider';

describe('MockFileSystemProvider', () => {
  let fs: MockFileSystemProvider;

  beforeEach(() => {
    fs = new MockFileSystemProvider();
  });

  it('stores, reads, and removes files', async () => {
    fs.setFile('/repo/README.md', 'hello');

    await expect(fs.exists('/repo/README.md')).resolves.toBe(true);
    expect(fs.existsSync('/repo/README.md')).toBe(true);
    await expect(fs.readFile('/repo/README.md')).resolves.toBe('hello');

    await fs.remove('/repo/README.md');
    await expect(fs.exists('/repo/README.md')).resolves.toBe(false);
  });

  it('stores and parses JSON content', async () => {
    fs.setJson('/repo/evolith.json', { name: 'demo' });
    fs.setFile('/repo/from-content.json', '{"enabled":true}');

    await expect(fs.readJson('/repo/evolith.json')).resolves.toEqual({ name: 'demo' });
    await expect(fs.readJson('/repo/from-content.json')).resolves.toEqual({ enabled: true });
  });

  it('handles directories, listings, and recursive removal', async () => {
    await fs.ensureDir('/repo');
    await fs.ensureDir('/repo/docs');
    await fs.writeFile('/repo/docs/a.md', 'A');
    await fs.writeJson('/repo/docs/b.json', { b: true });

    await expect(fs.exists('/repo')).resolves.toBe(true);
    const entries = await fs.readdir('/repo/docs');

    expect(entries.map(e => e.name).sort()).toEqual(['a.md', 'b.json']);
    expect(await fs.readdirNames('/repo/docs')).toEqual(['a.md', 'b.json']);
    await expect(fs.stat('/repo/docs')).resolves.toMatchObject({
      isDirectory: expect.any(Function),
      isFile: expect.any(Function),
    });

    await fs.remove('/repo/docs');
    expect(fs.existsSync('/repo/docs/a.md')).toBe(false);
  });

  it('throws for missing files, directories read as files, and missing JSON content', async () => {
    await fs.ensureDir('/repo/docs');
    await fs.writeFile('/repo/empty.json', '');

    await expect(fs.readFile('/repo/missing.md')).rejects.toThrow('File not found');
    await expect(fs.readFile('/repo/docs')).rejects.toThrow('Path is directory');
    await expect(fs.readJson('/repo/missing.json')).rejects.toThrow('File not found');
    await expect(fs.readJson('/repo/empty.json')).rejects.toThrow('No JSON content');
    await expect(fs.stat('/repo/missing')).rejects.toThrow('Path not found');
  });

  it('normalizes repeated slashes and backslashes', async () => {
    fs.setFile('/repo/docs/a.md', 'A');

    await expect(fs.exists('/repo//docs\\a.md')).resolves.toBe(true);
    await expect(fs.readFile('/repo//docs\\a.md')).resolves.toBe('A');

    fs.clear();
    await expect(fs.exists('/repo/docs/a.md')).resolves.toBe(false);
  });
});
