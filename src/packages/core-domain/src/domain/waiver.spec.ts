import {
  requestWaiver,
  approveWaiver,
  rejectWaiver,
  reviseWaiver,
  isExpired,
  effectiveStatus,
  isWaiverActive,
  activeWaiverFor,
  applyWaivers,
  InMemoryWaiverStore,
  WaiverTransitionError,
  type Waiver,
} from './waiver';
import { makeViolation } from './violation';

const base = {
  waiverRef: 'W-001',
  fingerprint: 'fp-abc',
  reason: 'temporary exception, tracked in GT-999',
  requestedBy: 'alice',
  requestedAt: '2026-07-01T00:00:00.000Z',
  expiresAt: '2026-08-01T00:00:00.000Z',
};

describe('waiver state machine (GT-518 · EAG-13 — request→approve→version→expire)', () => {
  it('request creates version 1 in `requested`', () => {
    const w = requestWaiver(base);
    expect(w.version).toBe(1);
    expect(w.status).toBe('requested');
  });

  it('request rejects a non-future expiry', () => {
    expect(() => requestWaiver({ ...base, expiresAt: base.requestedAt })).toThrow(WaiverTransitionError);
  });

  it('approve moves requested→approved and records approver/time', () => {
    const w = approveWaiver(requestWaiver(base), 'bob', '2026-07-02T00:00:00.000Z');
    expect(w.status).toBe('approved');
    expect(w.approvedBy).toBe('bob');
    expect(w.approvedAt).toBe('2026-07-02T00:00:00.000Z');
  });

  it('approve/reject from a non-requested state is illegal', () => {
    const approved = approveWaiver(requestWaiver(base), 'bob', '2026-07-02T00:00:00.000Z');
    expect(() => approveWaiver(approved, 'carol', '2026-07-03T00:00:00.000Z')).toThrow(WaiverTransitionError);
    expect(() => rejectWaiver(approved)).toThrow(WaiverTransitionError);
  });

  it('revise VERSIONS the waiver: v2 requested, supersedes v1, prior untouched', () => {
    const v1 = approveWaiver(requestWaiver(base), 'bob', '2026-07-02T00:00:00.000Z');
    const v2 = reviseWaiver(v1, {
      requestedBy: 'alice',
      requestedAt: '2026-07-20T00:00:00.000Z',
      expiresAt: '2026-09-01T00:00:00.000Z',
    });
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('requested');
    expect(v2.supersedes).toBe(1);
    expect(v1.status).toBe('approved'); // immutable
  });

  it('expiry is time-derived: an approved waiver reads `expired` past expiresAt', () => {
    const w = approveWaiver(requestWaiver(base), 'bob', '2026-07-02T00:00:00.000Z');
    expect(isExpired(w, '2026-07-15T00:00:00.000Z')).toBe(false);
    expect(isWaiverActive(w, '2026-07-15T00:00:00.000Z')).toBe(true);
    expect(effectiveStatus(w, '2026-08-02T00:00:00.000Z')).toBe('expired');
    expect(isWaiverActive(w, '2026-08-02T00:00:00.000Z')).toBe(false);
  });
});

describe('waiver store + suppression', () => {
  const fp = 'fp-abc';
  const violation = makeViolation({
    ruleId: 'ADR-0002',
    tool: 'drift-gate',
    file: 'src/a.ts',
    severity: 'error',
    message: 'boundary',
    fingerprint: fp,
  });
  const approved: Waiver = approveWaiver(
    requestWaiver({ ...base, fingerprint: fp }),
    'bob',
    '2026-07-02T00:00:00.000Z',
  );

  it('a valid (approved, unexpired) waiver suppresses its finding with an audit trail', () => {
    const store = new InMemoryWaiverStore([approved]);
    const { retained, suppressed } = applyWaivers([violation], store, '2026-07-15T00:00:00.000Z');
    expect(retained).toHaveLength(0);
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].waiver.waiverRef).toBe('W-001');
  });

  it('an EXPIRED waiver does NOT suppress — the finding is retained', () => {
    const store = new InMemoryWaiverStore([approved]);
    const { retained, suppressed } = applyWaivers([violation], store, '2026-08-02T00:00:00.000Z');
    expect(retained).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });

  it('a merely REQUESTED (unapproved) waiver does not suppress', () => {
    const store = new InMemoryWaiverStore([requestWaiver({ ...base, fingerprint: fp })]);
    expect(activeWaiverFor(store, fp, '2026-07-15T00:00:00.000Z')).toBeUndefined();
  });

  it('activeWaiverFor prefers the highest-version active waiver', () => {
    const v2 = approveWaiver(
      reviseWaiver(approved, { requestedBy: 'a', requestedAt: '2026-07-10T00:00:00.000Z', expiresAt: '2026-09-01T00:00:00.000Z' }),
      'bob',
      '2026-07-11T00:00:00.000Z',
    );
    const store = new InMemoryWaiverStore([approved, v2]);
    expect(activeWaiverFor(store, fp, '2026-07-15T00:00:00.000Z')?.version).toBe(2);
  });
});
