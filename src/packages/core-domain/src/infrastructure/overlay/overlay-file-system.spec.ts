import { OverlayFileSystem } from './overlay-file-system';
import { DirEntry, IFileSystem } from '../../domain/interfaces';

/** Minimal fake fallback that records the paths it was asked for. */
function makeFallback(): IFileSystem & { calls: string[] } {
  const calls: string[] = [];
  const rec = (name: string, p: string) => calls.push(`${name}:${p}`);
  return {
    calls,
    async readFile(p: string) { rec('readFile', p); return `disk:${p}`; },
    async readFileBuffer(p: string) { rec('readFileBuffer', p); return Buffer.from(`disk:${p}`); },
    async writeFile(p: string) { rec('writeFile', p); },
    async exists(p: string) { rec('exists', p); return true; },
    existsSync(p: string) { rec('existsSync', p); return true; },
    async readJson<T>(p: string) { rec('readJson', p); return { disk: p } as unknown as T; },
    async writeJson(p: string) { rec('writeJson', p); },
    async mkdir(p: string) { rec('mkdir', p); },
    async readdir(p: string): Promise<DirEntry[]> { rec('readdir', p); return []; },
    async readdirNames(p: string) { rec('readdirNames', p); return []; },
    async copy(s: string, d: string) { rec('copy', `${s}->${d}`); },
    async ensureDir(p: string) { rec('ensureDir', p); },
    async ensureFile(p: string) { rec('ensureFile', p); },
    async stat(p: string) { rec('stat', p); return { isDirectory: () => true, isFile: () => false }; },
    async remove(p: string) { rec('remove', p); },
  };
}

const ROOT = '/inmem/satellite';

describe('OverlayFileSystem', () => {
  describe('overlay subtree reads (in memory, no disk)', () => {
    it('reads a file stored under the synthetic root', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, { 'evolith.yaml': 'coreRef: {}' }, fallback);

      await expect(fs.readFile(`${ROOT}/evolith.yaml`)).resolves.toBe('coreRef: {}');
      expect(fallback.calls).toHaveLength(0);
    });

    it('reads nested files and buffers/json from memory', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(
        ROOT,
        { 'docs/prd.md': '# PRD', 'topology.manifest.json': '{"metadata":{"id":"mono"}}' },
        fallback,
      );

      await expect(fs.readFile(`${ROOT}/docs/prd.md`)).resolves.toBe('# PRD');
      await expect(fs.readFileBuffer(`${ROOT}/docs/prd.md`)).resolves.toEqual(Buffer.from('# PRD'));
      await expect(fs.readJson(`${ROOT}/topology.manifest.json`)).resolves.toEqual({ metadata: { id: 'mono' } });
      expect(fallback.calls).toHaveLength(0);
    });

    it('reports existence for stored files and derived directories', async () => {
      const fs = new OverlayFileSystem(ROOT, { 'docs/prd.md': '# PRD' }, makeFallback());

      await expect(fs.exists(`${ROOT}/docs/prd.md`)).resolves.toBe(true);
      await expect(fs.exists(`${ROOT}/docs`)).resolves.toBe(true); // derived dir
      await expect(fs.exists(ROOT)).resolves.toBe(true); // root
      await expect(fs.exists(`${ROOT}/missing.yaml`)).resolves.toBe(false);
      expect(fs.existsSync(`${ROOT}/docs/prd.md`)).toBe(true);
      expect(fs.existsSync(`${ROOT}/missing.yaml`)).toBe(false);
    });

    it('missing overlay file rejects with ENOENT (no disk fallthrough)', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, { 'evolith.yaml': 'x' }, fallback);

      await expect(fs.readFile(`${ROOT}/nope.yaml`)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(fallback.calls).toHaveLength(0);
    });

    it('readdir derives immediate children (dirs before files)', async () => {
      const fs = new OverlayFileSystem(
        ROOT,
        { 'evolith.yaml': 'x', 'docs/prd.md': 'y', 'docs/adrs/0001.md': 'z', 'src/index.ts': 'w' },
        makeFallback(),
      );

      const names = await fs.readdirNames(ROOT);
      expect(names.sort()).toEqual(['docs', 'evolith.yaml', 'src'].sort());

      const entries = await fs.readdir(ROOT);
      const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
      expect(byName['docs'].isDirectory()).toBe(true);
      expect(byName['docs'].isFile()).toBe(false);
      expect(byName['evolith.yaml'].isFile()).toBe(true);

      // nested listing
      const docs = await fs.readdirNames(`${ROOT}/docs`);
      expect(docs.sort()).toEqual(['adrs', 'prd.md'].sort());
    });

    it('stat distinguishes files from directories in the overlay', async () => {
      const fs = new OverlayFileSystem(ROOT, { 'docs/prd.md': 'y' }, makeFallback());
      expect((await fs.stat(`${ROOT}/docs/prd.md`)).isFile()).toBe(true);
      expect((await fs.stat(`${ROOT}/docs`)).isDirectory()).toBe(true);
    });

    it('keeps overlay writes in memory, never delegating to disk', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, {}, fallback);

      await fs.writeFile(`${ROOT}/new.txt`, 'hello');
      await expect(fs.readFile(`${ROOT}/new.txt`)).resolves.toBe('hello');
      expect(fallback.calls).toHaveLength(0);
    });
  });

  describe('delegation to the real fallback for non-overlay paths', () => {
    it('delegates reads outside the synthetic root (e.g. the Core corpus)', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, { 'evolith.yaml': 'x' }, fallback);

      await expect(fs.readFile('/core/rulesets/governance.rego')).resolves.toBe('disk:/core/rulesets/governance.rego');
      await expect(fs.exists('/core/rulesets')).resolves.toBe(true);
      expect(fs.existsSync('/core/rulesets')).toBe(true);
      await fs.readdir('/core/rulesets');

      expect(fallback.calls).toContain('readFile:/core/rulesets/governance.rego');
      expect(fallback.calls).toContain('exists:/core/rulesets');
      expect(fallback.calls).toContain('existsSync:/core/rulesets');
      expect(fallback.calls).toContain('readdir:/core/rulesets');
    });

    it('does not treat a sibling path that merely shares a prefix as overlay', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, { 'evolith.yaml': 'x' }, fallback);

      // /inmem/satellite-other is NOT under /inmem/satellite/
      await fs.readFile('/inmem/satellite-other/f.txt');
      expect(fallback.calls).toContain('readFile:/inmem/satellite-other/f.txt');
    });

    it('delegates mutations outside the overlay', async () => {
      const fallback = makeFallback();
      const fs = new OverlayFileSystem(ROOT, {}, fallback);

      await fs.writeFile('/core/out.txt', 'x');
      await fs.ensureDir('/core/dir');
      expect(fallback.calls).toContain('writeFile:/core/out.txt');
      expect(fallback.calls).toContain('ensureDir:/core/dir');
    });
  });
});
