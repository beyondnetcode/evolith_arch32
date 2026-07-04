/**
 * Unit tests for GT-315: domain event bus + transactional outbox.
 *
 * Coverage:
 *  - publish + subscribe flow (InMemoryEventBus)
 *  - outbox pending → published lifecycle
 *  - event type constants (EVENT_TYPES)
 *  - DomainEvents factory helpers
 */

import { InMemoryEventBus } from './in-memory-event-bus';
import { OutboxService, OutboxEntry, IOutboxRepository } from './outbox';
import { DomainEvent } from '../../domain/events/domain-event';
import { DomainEvents, EVENT_TYPES } from '../../domain/events/domain-events';

// ---------------------------------------------------------------------------
// InMemoryEventBus
// ---------------------------------------------------------------------------

describe('InMemoryEventBus', () => {
  let bus: InMemoryEventBus;

  beforeEach(() => {
    bus = new InMemoryEventBus();
  });

  it('delivers a published event to a registered subscriber', async () => {
    const received: DomainEvent<unknown>[] = [];
    bus.subscribe(EVENT_TYPES.GATE_APPROVED, async (e) => {
      received.push(e);
    });

    const event = DomainEvents.gateApproved({
      projectId: 'p-1',
      phase: 'design',
      gateId: 'design-gate',
      rulesetRef: 'ref',
      evaluatedBy: 'ci',
      evaluatedAt: new Date().toISOString(),
    });

    await bus.publish(event);

    expect(received).toHaveLength(1);
    expect(received[0].eventType).toBe(EVENT_TYPES.GATE_APPROVED);
    expect((received[0].payload as typeof event.payload).projectId).toBe('p-1');
  });

  it('does not deliver to subscribers of a different event type', async () => {
    const received: unknown[] = [];
    bus.subscribe(EVENT_TYPES.GATE_REJECTED, async () => {
      received.push(true);
    });

    await bus.publish(
      DomainEvents.gateApproved({
        projectId: 'p-1',
        phase: 'design',
        gateId: 'design-gate',
        rulesetRef: 'ref',
        evaluatedBy: 'ci',
        evaluatedAt: new Date().toISOString(),
      }),
    );

    expect(received).toHaveLength(0);
  });

  it('delivers to multiple subscribers of the same event type', async () => {
    let calls = 0;
    bus.subscribe(EVENT_TYPES.PHASE_STARTED, async () => { calls++; });
    bus.subscribe(EVENT_TYPES.PHASE_STARTED, async () => { calls++; });

    await bus.publish(DomainEvents.phaseStarted({ projectId: 'p-1', phase: 'discovery' }));

    expect(calls).toBe(2);
  });

  it('reports handlerCount correctly', () => {
    bus.subscribe(EVENT_TYPES.ARTIFACT_CREATED, async () => {});
    bus.subscribe(EVENT_TYPES.ARTIFACT_CREATED, async () => {});
    expect(bus.handlerCount(EVENT_TYPES.ARTIFACT_CREATED)).toBe(2);
    expect(bus.handlerCount(EVENT_TYPES.WORKFLOW_UPDATED)).toBe(0);
  });

  it('clear() removes all handlers', async () => {
    bus.subscribe(EVENT_TYPES.PHASE_STARTED, async () => {
      throw new Error('should not be called');
    });
    bus.clear();
    // Should not throw
    await bus.publish(DomainEvents.phaseStarted({ projectId: 'p-1', phase: 'discovery' }));
    expect(bus.handlerCount(EVENT_TYPES.PHASE_STARTED)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// OutboxService
// ---------------------------------------------------------------------------

class InMemoryOutboxRepository implements IOutboxRepository {
  entries: OutboxEntry[] = [];

  async save(entry: OutboxEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async findPending(): Promise<OutboxEntry[]> {
    return this.entries.filter((e) => e.status === 'pending');
  }

  async update(entry: OutboxEntry): Promise<void> {
    const idx = this.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) this.entries[idx] = { ...entry };
  }
}

describe('OutboxService', () => {
  let repo: InMemoryOutboxRepository;
  let bus: InMemoryEventBus;
  let outbox: OutboxService;

  beforeEach(() => {
    repo = new InMemoryOutboxRepository();
    bus = new InMemoryEventBus();
    outbox = new OutboxService(repo, bus);
  });

  it('enqueue() creates a pending entry', async () => {
    const event = DomainEvents.phaseStarted({ projectId: 'proj', phase: 'discovery' });
    const entry = await outbox.enqueue(event);

    expect(entry.status).toBe('pending');
    expect(entry.id).toBe(event.eventId);
    expect(entry.eventType).toBe(EVENT_TYPES.PHASE_STARTED);
    expect(repo.entries).toHaveLength(1);
  });

  it('dispatchPending() moves entries from pending to published', async () => {
    const event = DomainEvents.gateRejected({
      projectId: 'proj',
      phase: 'qa',
      gateId: 'qa-gate',
      rulesetRef: 'ref',
      evaluatedBy: 'agent',
      evaluatedAt: new Date().toISOString(),
      violationCount: 2,
    });
    await outbox.enqueue(event);

    const received: DomainEvent<unknown>[] = [];
    bus.subscribe(EVENT_TYPES.GATE_REJECTED, async (e) => { received.push(e); });

    const result = await outbox.dispatchPending();

    expect(result.published).toBe(1);
    expect(result.failed).toBe(0);
    expect(received).toHaveLength(1);

    const stored = repo.entries[0];
    expect(stored.status).toBe('published');
    expect(stored.processedAt).toBeDefined();
  });

  it('dispatchPending() marks entry as failed when handler throws', async () => {
    const event = DomainEvents.phaseCompleted({
      projectId: 'proj',
      phase: 'release',
      completedAt: new Date().toISOString(),
    });
    await outbox.enqueue(event);

    bus.subscribe(EVENT_TYPES.PHASE_COMPLETED, async () => {
      throw new Error('broker down');
    });

    const result = await outbox.dispatchPending();

    expect(result.published).toBe(0);
    expect(result.failed).toBe(1);

    const stored = repo.entries[0];
    expect(stored.status).toBe('failed');
    expect(stored.errorMessage).toContain('broker down');
  });

  it('dispatchPending() does not reprocess already-published entries', async () => {
    const event = DomainEvents.workflowUpdated({
      projectId: 'proj',
      workflowId: 'wf-1',
      updatedAt: new Date().toISOString(),
    });
    await outbox.enqueue(event);
    await outbox.dispatchPending(); // first run — publishes it

    let callCount = 0;
    bus.subscribe(EVENT_TYPES.WORKFLOW_UPDATED, async () => { callCount++; });

    const second = await outbox.dispatchPending(); // should find 0 pending
    expect(second.published).toBe(0);
    expect(callCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// EVENT_TYPES constants
// ---------------------------------------------------------------------------

describe('EVENT_TYPES', () => {
  const expectedKeys: (keyof typeof EVENT_TYPES)[] = [
    'PHASE_STARTED',
    'PHASE_COMPLETED',
    'GATE_APPROVED',
    'GATE_REJECTED',
    'ARTIFACT_CREATED',
    'ARTIFACT_UPDATED',
    'ARTIFACT_VALIDATED',
    'BLUEPRINT_GENERATED',
    'BLUEPRINT_VALIDATED',
    'WORKFLOW_UPDATED',
  ];

  it.each(expectedKeys)('EVENT_TYPES.%s is defined and non-empty', (key) => {
    expect(EVENT_TYPES[key]).toBeTruthy();
    expect(typeof EVENT_TYPES[key]).toBe('string');
  });

  it('all event type strings follow the <aggregate>.<verb> pattern', () => {
    for (const value of Object.values(EVENT_TYPES)) {
      expect(value).toMatch(/^[a-z]+\.[a-z]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// DomainEvents factory helpers
// ---------------------------------------------------------------------------

describe('DomainEvents factory', () => {
  it('each factory produces a valid DomainEvent envelope', () => {
    const events = [
      DomainEvents.phaseStarted({ projectId: 'p', phase: 'discovery' }),
      DomainEvents.phaseCompleted({ projectId: 'p', phase: 'design', completedAt: '' }),
      DomainEvents.gateApproved({ projectId: 'p', phase: 'construction', gateId: 'g', rulesetRef: 'r', evaluatedBy: 'human', evaluatedAt: '' }),
      DomainEvents.gateRejected({ projectId: 'p', phase: 'qa', gateId: 'g', rulesetRef: 'r', evaluatedBy: 'ci', evaluatedAt: '', violationCount: 1 }),
      DomainEvents.artifactCreated({ projectId: 'p', artifactPath: 'a' }),
      DomainEvents.artifactUpdated({ projectId: 'p', artifactPath: 'a' }),
      DomainEvents.artifactValidated({ projectId: 'p', artifactPath: 'a', passed: true, validatedAt: '' }),
      DomainEvents.blueprintGenerated({ projectId: 'p', blueprintId: 'b', generatedAt: '' }),
      DomainEvents.blueprintValidated({ projectId: 'p', blueprintId: 'b', passed: false, validatedAt: '' }),
      DomainEvents.workflowUpdated({ projectId: 'p', workflowId: 'w', updatedAt: '' }),
    ];

    for (const e of events) {
      expect(e.eventId).toBeTruthy();
      expect(e.version).toBe(1);
      expect(e.occurredAt).toBeTruthy();
      expect(e.payload).toBeDefined();
    }
  });

  it('propagates correlationId when supplied', () => {
    const e = DomainEvents.phaseStarted({ projectId: 'p', phase: 'qa' }, 'corr-xyz');
    expect(e.correlationId).toBe('corr-xyz');
  });
});
