import { InMemoryAuditRepository } from './in-memory-audit-repository';
import { AuditService } from '../../application/services/audit.service';
import { createEvent } from '../../domain/events/domain-event';
import { AuditEntry } from '../../domain/audit/audit-entry';
import { IAuditRepository } from '../../domain/audit/audit-repository.port';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: crypto.randomUUID(),
    eventType: 'test.event',
    occurredAt: new Date().toISOString(),
    payload: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// InMemoryAuditRepository
// ---------------------------------------------------------------------------

describe('InMemoryAuditRepository', () => {
  let repo: InMemoryAuditRepository;

  beforeEach(() => {
    repo = new InMemoryAuditRepository();
  });

  it('appends and retrieves an entry by id', async () => {
    const entry = makeEntry({ id: 'e-001' });
    await repo.append(entry);
    const found = await repo.findById('e-001');
    expect(found).toEqual(entry);
  });

  it('returns null for unknown id', async () => {
    expect(await repo.findById('missing')).toBeNull();
  });

  it('queries by tenantId', async () => {
    await repo.append(makeEntry({ tenantId: 'tenant-A', id: '1' }));
    await repo.append(makeEntry({ tenantId: 'tenant-B', id: '2' }));
    await repo.append(makeEntry({ tenantId: 'tenant-A', id: '3' }));

    const results = await repo.query({ tenantId: 'tenant-A' });
    expect(results).toHaveLength(2);
    expect(results.every(e => e.tenantId === 'tenant-A')).toBe(true);
  });

  it('queries by actor', async () => {
    await repo.append(makeEntry({ actor: 'alice', id: 'a1' }));
    await repo.append(makeEntry({ actor: 'bob', id: 'b1' }));
    await repo.append(makeEntry({ actor: 'alice', id: 'a2' }));

    const results = await repo.query({ actor: 'alice' });
    expect(results).toHaveLength(2);
    expect(results.every(e => e.actor === 'alice')).toBe(true);
  });

  it('queries by correlationId', async () => {
    const corrId = crypto.randomUUID();
    await repo.append(makeEntry({ correlationId: corrId, id: 'c1' }));
    await repo.append(makeEntry({ correlationId: 'other', id: 'c2' }));

    const results = await repo.query({ correlationId: corrId });
    expect(results).toHaveLength(1);
    expect(results[0].correlationId).toBe(corrId);
  });

  it('queries by date range (from / to)', async () => {
    const t0 = '2025-01-01T00:00:00.000Z';
    const t1 = '2025-06-01T00:00:00.000Z';
    const t2 = '2025-12-01T00:00:00.000Z';

    await repo.append(makeEntry({ occurredAt: t0, id: 'r1' }));
    await repo.append(makeEntry({ occurredAt: t1, id: 'r2' }));
    await repo.append(makeEntry({ occurredAt: t2, id: 'r3' }));

    const results = await repo.query({ from: t0, to: t1 });
    expect(results.map(e => e.id)).toEqual(['r1', 'r2']);
  });

  it('respects the limit option', async () => {
    for (let i = 0; i < 10; i++) {
      await repo.append(makeEntry({ id: `lim-${i}` }));
    }
    const results = await repo.query({ limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('returns entries sorted by occurredAt ascending', async () => {
    const times = [
      '2025-03-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2025-02-01T00:00:00.000Z',
    ];
    for (let i = 0; i < times.length; i++) {
      await repo.append(makeEntry({ occurredAt: times[i], id: `s${i}` }));
    }
    const results = await repo.query({});
    expect(results[0].occurredAt).toBe('2025-01-01T00:00:00.000Z');
    expect(results[2].occurredAt).toBe('2025-03-01T00:00:00.000Z');
  });

  it('is append-only — no update or delete methods exposed', () => {
    // Type-level assertion: IAuditRepository must not have update/delete keys
    const repoAsPort: IAuditRepository = repo;
    expect(typeof (repoAsPort as Record<string, unknown>)['update']).toBe('undefined');
    expect(typeof (repoAsPort as Record<string, unknown>)['delete']).toBe('undefined');
  });
});

// ---------------------------------------------------------------------------
// AuditService
// ---------------------------------------------------------------------------

describe('AuditService', () => {
  let repo: InMemoryAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    repo = new InMemoryAuditRepository();
    service = new AuditService(repo);
  });

  it('record() maps a DomainEvent to an AuditEntry correctly', async () => {
    const event = createEvent(
      'phase.started',
      1,
      { actor: 'alice', tenantId: 'tenant-X', phaseId: 'p-1', extra: true },
      'corr-abc',
    );

    await service.record(event);

    const results = await service.queryAudit({});
    expect(results).toHaveLength(1);

    const entry = results[0];
    expect(entry.id).toBe(event.eventId);
    expect(entry.eventType).toBe('phase.started');
    expect(entry.actor).toBe('alice');
    expect(entry.tenantId).toBe('tenant-X');
    expect(entry.phaseId).toBe('p-1');
    expect(entry.correlationId).toBe('corr-abc');
    expect(entry.occurredAt).toBe(event.occurredAt);
    expect(entry.payload).toEqual(event.payload);
  });

  it('record() handles events without optional payload fields gracefully', async () => {
    const event = createEvent('simple.event', 1, 'a string payload');
    await service.record(event);

    const [entry] = await service.queryAudit({});
    expect(entry.actor).toBeUndefined();
    expect(entry.tenantId).toBeUndefined();
    expect(entry.phaseId).toBeUndefined();
  });

  it('queryAudit() delegates filter logic to the repository', async () => {
    const e1 = createEvent('x', 1, { tenantId: 'T1' });
    const e2 = createEvent('x', 1, { tenantId: 'T2' });
    await service.record(e1);
    await service.record(e2);

    const results = await service.queryAudit({ tenantId: 'T1' });
    expect(results).toHaveLength(1);
    expect(results[0].tenantId).toBe('T1');
  });

  it('findById() returns the correct entry', async () => {
    const event = createEvent('test', 1, {});
    await service.record(event);

    const found = await service.findById(event.eventId);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(event.eventId);
  });
});
