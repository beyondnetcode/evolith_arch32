/**
 * GT-673 — the classification table, one test per row. Hashes are opaque
 * strings here; only equality matters to the function.
 */
import { classifyChange } from './satellite-upgrade-classify';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const C = 'c'.repeat(64);

describe('classifyChange (GT-673)', () => {
  it('file absent in the satellite → add (upstream-only), whatever the manifest says', () => {
    expect(classifyChange({ core: A, satellite: null, baseline: null })).toEqual({ kind: 'add', classification: 'upstream-only' });
    expect(classifyChange({ core: A, satellite: null, baseline: A })).toEqual({ kind: 'add', classification: 'upstream-only' });
  });

  it('core == satellite → unchanged, even with a stale or missing baseline', () => {
    expect(classifyChange({ core: A, satellite: A, baseline: null })).toEqual({ kind: 'unchanged' });
    expect(classifyChange({ core: A, satellite: A, baseline: A })).toEqual({ kind: 'unchanged' });
    expect(classifyChange({ core: A, satellite: A, baseline: B })).toEqual({ kind: 'unchanged' });
  });

  it('satellite == baseline, core != baseline → upstream-only', () => {
    expect(classifyChange({ core: B, satellite: A, baseline: A })).toEqual({ kind: 'modify', classification: 'upstream-only' });
  });

  it('satellite != baseline, core == baseline → local-only', () => {
    expect(classifyChange({ core: A, satellite: B, baseline: A })).toEqual({ kind: 'modify', classification: 'local-only' });
  });

  it('satellite != baseline, core != baseline → conflict (both-changed)', () => {
    expect(classifyChange({ core: B, satellite: C, baseline: A })).toEqual({ kind: 'modify', classification: 'conflict', reason: 'both-changed' });
  });

  it('no baseline and core != satellite → conflict (no-fingerprint): fail-closed', () => {
    expect(classifyChange({ core: A, satellite: B, baseline: null })).toEqual({ kind: 'modify', classification: 'conflict', reason: 'no-fingerprint' });
  });
});
