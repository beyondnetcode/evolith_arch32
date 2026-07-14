import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approveWaiver, requestWaiver } from '@beyondnet/evolith-core-domain/domain/waiver';
import { FileWaiverStore } from './file-waiver-store.provider';

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
