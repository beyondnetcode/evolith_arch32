import { TargetDirectoryFileSystem } from './target-file-system';

/**
 * GT-571: every write the scaffolder makes must land in the directory the user
 * asked for. A method that forgets to remap is a file silently written into a
 * phantom subdirectory, which is the exact defect this class exists to kill.
 */
describe('TargetDirectoryFileSystem', () => {
  const ROOT = '/repo/my-sat';
  const TARGET = '/repo';

  const makeInner = () => ({
    readFile: jest.fn().mockResolvedValue(''),
    readFileBuffer: jest.fn().mockResolvedValue(Buffer.from('')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    existsSync: jest.fn().mockReturnValue(true),
    readJson: jest.fn().mockResolvedValue({}),
    writeJson: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    readdirNames: jest.fn().mockResolvedValue([]),
    copy: jest.fn().mockResolvedValue(undefined),
    ensureDir: jest.fn().mockResolvedValue(undefined),
    ensureFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => true, isFile: () => false }),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  let inner: ReturnType<typeof makeInner>;
  let fs: TargetDirectoryFileSystem;

  beforeEach(() => {
    inner = makeInner();
    fs = new TargetDirectoryFileSystem(inner, ROOT, TARGET);
  });

  const singlePathMethods = [
    'readFile',
    'readFileBuffer',
    'exists',
    'existsSync',
    'readJson',
    'mkdir',
    'readdir',
    'readdirNames',
    'ensureDir',
    'ensureFile',
    'stat',
    'remove',
  ] as const;

  it.each(singlePathMethods)('%s remaps the scaffold root onto the target', async (method) => {
    await (fs as unknown as Record<string, (p: string) => unknown>)[method](`${ROOT}/reference/adr.md`);
    expect(inner[method]).toHaveBeenCalledWith(`${TARGET}/reference/adr.md`);
  });

  it('writeFile remaps the path and forwards the content', async () => {
    await fs.writeFile(`${ROOT}/README.md`, 'body');
    expect(inner.writeFile).toHaveBeenCalledWith(`${TARGET}/README.md`, 'body');
  });

  it('writeJson remaps the path and forwards the document', async () => {
    await fs.writeJson(`${ROOT}/evolith.yaml`, { product: 'x' });
    expect(inner.writeJson).toHaveBeenCalledWith(`${TARGET}/evolith.yaml`, { product: 'x' });
  });

  it('copy remaps both ends', async () => {
    await fs.copy(`${ROOT}/a`, `${ROOT}/b`);
    expect(inner.copy).toHaveBeenCalledWith(`${TARGET}/a`, `${TARGET}/b`);
  });

  it('remaps the scaffold root itself, not only its children', async () => {
    await fs.ensureDir(ROOT);
    expect(inner.ensureDir).toHaveBeenCalledWith(TARGET);
  });

  it('leaves paths outside the scaffold root untouched', async () => {
    await fs.readFile('/etc/evolith/rulesets.json');
    expect(inner.readFile).toHaveBeenCalledWith('/etc/evolith/rulesets.json');
  });

  it('does not remap a sibling directory that merely shares the prefix', async () => {
    await fs.readFile(`${ROOT}-backup/README.md`);
    expect(inner.readFile).toHaveBeenCalledWith(`${ROOT}-backup/README.md`);
  });

  it('is a pass-through when the scaffold root already is the target', async () => {
    const identity = new TargetDirectoryFileSystem(inner, ROOT, ROOT);
    expect(identity.isIdentity).toBe(true);
    await identity.writeFile(`${ROOT}/README.md`, 'body');
    expect(inner.writeFile).toHaveBeenCalledWith(`${ROOT}/README.md`, 'body');
  });
});
