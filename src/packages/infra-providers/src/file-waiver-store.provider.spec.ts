import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approveWaiver, requestWaiver } from '@beyondnet/evolith-core-domain/domain/waiver';
import {
  DEFAULT_WAIVER_STORE_RELPATH,
  FileWaiverStore,
  MissingWaiverStoreError,
  openWaiverStoreForRead,
  resolveWaiverStorePath,
} from './file-waiver-store.provider';

describe('FileWaiverStore (GT-518 — durable waiver persistence)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'waiver-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('persists a waiver and reloads it in a fresh store (survives across invocations)', () => {
    const path = join(dir, 'waivers.json');
    const w = approveWaiver(
      requestWaiver({ waiverRef: 'W-1', fingerprint: 'fp-1', reason: 'legacy', requestedBy: 'jdoe', requestedAt: '2026-07-13T00:00:00Z', expiresAt: '2026-08-13T00:00:00Z' }),
      'lead', '2026-07-13T01:00:00Z',
    );
    new FileWaiverStore(path).put(w);

    const reloaded = new FileWaiverStore(path); // fresh process/instance
    expect(reloaded.list('fp-1')).toHaveLength(1);
    expect(reloaded.list('fp-1')[0]).toMatchObject({ waiverRef: 'W-1', version: 1, status: 'approved', approvedBy: 'lead' });
  });

  it('retains every version (audit trail) and fails closed on a corrupt file', () => {
    const path = join(dir, 'w.json');
    const store = new FileWaiverStore(path);
    const v1 = requestWaiver({ waiverRef: 'W-2', fingerprint: 'fp', reason: 'r', requestedBy: 'a', requestedAt: '2026-07-13T00:00:00Z', expiresAt: '2026-08-13T00:00:00Z' });
    store.put(v1);
    store.put({ ...v1, version: 2, supersedes: 1 });
    expect(new FileWaiverStore(path).list('fp')).toHaveLength(2);

    require('node:fs').writeFileSync(path, '{ not json', 'utf8');
    expect(new FileWaiverStore(path).all()).toEqual([]); // corrupt → empty (re-blocks), never crashes
  });
});

describe('openWaiverStoreForRead (GT-677 — a reader must not swallow a store that is not there)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'waiver-read-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // The defect this closes was MEASURED on the fix for GT-677 itself, by an adversarial
  // verifier: `--waivers .evolith/waivers.json` run from outside the workspace resolved
  // against the CURRENT directory, found nothing, and `FileWaiverStore` read a missing
  // file as an EMPTY store — so the run reported `blocking 95 frozen 0` and suppressed
  // nothing while looking successful. That is GT-677's own silent no-op one level down.
  it('THROWS when an EXPLICIT store path does not exist, naming both the requested and the resolved path', () => {
    let thrown: unknown;
    try {
      openWaiverStoreForRead(dir, join(dir, 'nope', 'waivers.json'));
    } catch (err) { thrown = err; }

    expect(thrown).toBeInstanceOf(MissingWaiverStoreError);
    const error = thrown as MissingWaiverStoreError;
    expect(error.requested).toContain('nope');
    expect(error.resolvedPath).toContain('nope');
    expect(error.message).toContain('resolves against the current directory');
  });

  // The negative twin: the DEFAULT path is exempt on purpose. Most workspaces have no
  // waivers at all, so a missing `<workspace>/.evolith/waivers.json` is the normal state
  // and must not turn every first evaluation into an error.
  it('does NOT throw when the DEFAULT store is absent — an empty store is the normal state', () => {
    const store = openWaiverStoreForRead(dir);
    expect(store.all()).toEqual([]);
    expect(resolveWaiverStorePath(dir)).toBe(join(dir, DEFAULT_WAIVER_STORE_RELPATH));
  });

  it('opens an EXPLICIT store that does exist, and reads what the writer put there', () => {
    const path = join(dir, 'shared-waivers.json');
    const approved = approveWaiver(
      requestWaiver({ waiverRef: 'W-7', fingerprint: 'fp-7', reason: 'r', requestedBy: 'a', requestedAt: '2026-07-13T00:00:00Z', expiresAt: '2026-08-13T00:00:00Z' }),
      'lead', '2026-07-13T01:00:00Z',
    );
    new FileWaiverStore(path).put(approved);

    expect(openWaiverStoreForRead(dir, path).list('fp-7')).toHaveLength(1);
  });
});
