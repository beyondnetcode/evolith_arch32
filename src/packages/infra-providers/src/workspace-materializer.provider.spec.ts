import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

import { NodeFileSystemProvider } from './node-filesystem.provider';
import { NodeWorkspaceMaterializer } from './workspace-materializer.provider';

describe('NodeWorkspaceMaterializer (GT-512 · EAG-04 · PA-07 — TEXT tarball → restorable checkout)', () => {
  let base: string;
  let materializer: NodeWorkspaceMaterializer;
  let counter: number;

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'infra-materialize-'));
    counter = 0;
    materializer = new NodeWorkspaceMaterializer(new NodeFileSystemProvider(), {
      baseDir: base,
      idFactory: () => `t${counter++}`, // deterministic checkout dirs
    });
  });

  afterEach(async () => {
    await fs.remove(base);
  });

  it('writes the in-memory files (creating nested dirs) and returns the checkout path', async () => {
    const checkout = await materializer.materialize({
      'evolith.yaml': 'toolchain:\n  runtime: node\n',
      'apps/a/src/index.ts': 'export const x = 1;',
      'package.json': '{"name":"sat"}',
    });

    expect(checkout).toBe(path.resolve(base, 'checkout-t0'));
    expect(await fs.readFile(path.join(checkout, 'evolith.yaml'), 'utf-8')).toContain('runtime: node');
    expect(await fs.readFile(path.join(checkout, 'apps/a/src/index.ts'), 'utf-8')).toBe('export const x = 1;');
    // no installed deps materialized — only the received text tarball
    expect(await fs.pathExists(path.join(checkout, 'node_modules'))).toBe(false);
  });

  it('isolates each call in a fresh unique checkout directory', async () => {
    const first = await materializer.materialize({ 'a.txt': '1' });
    const second = await materializer.materialize({ 'b.txt': '2' });
    expect(first).not.toBe(second);
    expect(await fs.pathExists(path.join(first, 'b.txt'))).toBe(false);
    expect(await fs.pathExists(path.join(second, 'a.txt'))).toBe(false);
  });

  it('rejects a path-traversal entry fail-closed (nothing escapes the root)', async () => {
    await expect(materializer.materialize({ '../escape.txt': 'evil' })).rejects.toThrow(/escapes the checkout root/);
    expect(await fs.pathExists(path.join(base, 'escape.txt'))).toBe(false);
  });

  it('rejects an absolute-path entry fail-closed', async () => {
    await expect(materializer.materialize({ '/etc/passwd': 'evil' })).rejects.toThrow(/absolute path entry/);
  });
});
