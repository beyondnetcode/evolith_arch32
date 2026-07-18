/**
 * GT-441 — FileApprovalStore (durable approval persistence).
 *
 * Defining property: pending approvals survive a "restart" — a SECOND instance
 * on the same path reloads what the first persisted. Also proves the read never
 * throws on a missing/corrupt file, the write is atomic (temp+rename, no partial
 * target), and the fs seam is fully injectable (no real disk needed here).
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  FileApprovalStore,
  type ApprovalStoreFsLike,
} from './file-approval-store';
import type { ApprovalRecord } from '../../domain/ports/approval.port';

const record = (over: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'appr-1',
  status: 'pending',
  skillId: 'deploy-to-prod',
  intent: 'deploy_to_prod',
  createdAt: 0,
  expiresAt: 1000,
  ...over,
});

/** In-memory fake fs implementing the injected seam — deterministic, no disk. */
class FakeFs implements ApprovalStoreFsLike {
  readonly files = new Map<string, string>();
  renames = 0;
  writes: string[] = [];

  async readFile(file: string, _encoding: 'utf8'): Promise<string> {
    const v = this.files.get(file);
    if (v === undefined) {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    }
    return v;
  }
  async writeFile(file: string, data: string, _encoding: 'utf8'): Promise<void> {
    this.writes.push(file);
    this.files.set(file, data);
  }
  async rename(from: string, to: string): Promise<void> {
    this.renames += 1;
    const v = this.files.get(from);
    if (v === undefined) throw new Error('rename source missing');
    this.files.set(to, v);
    this.files.delete(from);
  }
  async mkdir(_dir: string, _options: { recursive: true }): Promise<string | undefined> {
    return undefined;
  }
}

describe('FileApprovalStore (durable) — injected fs, no real disk', () => {
  const filePath = '/virtual/approvals.json';

  it('put→get round-trips a record', async () => {
    const fake = new FakeFs();
    const store = new FileApprovalStore({ filePath, fs: fake });

    await store.put(record({ id: 'a' }));

    expect((await store.get('a'))?.id).toBe('a');
  });

  it('survives a "restart": a new instance on the same path reloads records', async () => {
    const fake = new FakeFs();
    await new FileApprovalStore({ filePath, fs: fake }).put(record({ id: 'a', status: 'pending' }));

    // "restart" — brand-new instance, SAME backing fs + path.
    const reloaded = new FileApprovalStore({ filePath, fs: fake });

    expect((await reloaded.get('a'))?.status).toBe('pending');
    expect((await reloaded.list()).map((r) => r.id)).toEqual(['a']);
  });

  it('persists an approve decision made after the restart', async () => {
    const fake = new FakeFs();
    await new FileApprovalStore({ filePath, fs: fake }).put(record({ id: 'a', status: 'pending' }));

    // A later process resolves it.
    const later = new FileApprovalStore({ filePath, fs: fake });
    const found = await later.get('a');
    await later.put({ ...found!, status: 'approved', approver: 'ops@evolith', resolvedAt: 5 });

    const finalStore = new FileApprovalStore({ filePath, fs: fake });
    expect((await finalStore.get('a'))?.status).toBe('approved');
  });

  it('writes atomically (temp file + rename), leaving no partial target', async () => {
    const fake = new FakeFs();
    const store = new FileApprovalStore({ filePath, fs: fake });

    await store.put(record({ id: 'a' }));

    // The write landed on a temp sibling, then a single rename onto the target.
    expect(fake.renames).toBe(1);
    expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0]).not.toBe(filePath); // wrote temp, not the target directly
    expect(fake.writes[0].startsWith(filePath)).toBe(true);
    expect(fake.files.has(filePath)).toBe(true); // final target present
    // No leftover temp file after the rename.
    expect([...fake.files.keys()]).toEqual([filePath]);
  });

  it('missing file ⇒ starts empty, never throws', async () => {
    const store = new FileApprovalStore({ filePath, fs: new FakeFs() });

    await expect(store.get('nope')).resolves.toBeUndefined();
    await expect(store.list()).resolves.toEqual([]);
  });

  it('corrupt / partial file ⇒ starts empty, never throws', async () => {
    const fake = new FakeFs();
    fake.files.set(filePath, '{ this is not valid json ');
    const store = new FileApprovalStore({ filePath, fs: fake });

    await expect(store.get('a')).resolves.toBeUndefined();
    await expect(store.list()).resolves.toEqual([]);
    // …and a subsequent put recovers cleanly.
    await store.put(record({ id: 'a' }));
    expect((await new FileApprovalStore({ filePath, fs: fake }).get('a'))?.id).toBe('a');
  });

  it('wrong-shape JSON (no records map) ⇒ starts empty, never throws', async () => {
    const fake = new FakeFs();
    fake.files.set(filePath, JSON.stringify({ something: 'else' }));
    const store = new FileApprovalStore({ filePath, fs: fake });

    await expect(store.list()).resolves.toEqual([]);
  });
});

describe('FileApprovalStore (durable) — against the real OS temp fs', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-appr-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('default fs: persists across instances on the same real path', async () => {
    const file = path.join(dir, 'nested', 'approvals.json');
    await new FileApprovalStore({ filePath: file }).put(record({ id: 'a' }));

    const reloaded = await new FileApprovalStore({ filePath: file }).get('a');

    expect(reloaded?.id).toBe('a');
    // Only the final target exists — no stray *.tmp left behind.
    const left = await fs.readdir(path.dirname(file));
    expect(left).toEqual(['approvals.json']);
  });

  it('default fs: absent file yields an empty list, no throw', async () => {
    const store = new FileApprovalStore({ filePath: path.join(dir, 'absent.json') });
    await expect(store.list()).resolves.toEqual([]);
  });
});
