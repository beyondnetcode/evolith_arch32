import { randomUUID } from 'crypto';
import type { WebhookSubscription } from '../../domain/webhook/webhook-subscription';
import { DEFAULT_RETRY_POLICY } from '../../domain/webhook/webhook-subscription';
import { HmacSigner } from './hmac-signer';
import { InMemoryDeliveryRepository } from './in-memory-delivery-repository';
import { InMemorySubscriptionRepository } from './in-memory-subscription-repository';
import { WebhookDispatcher } from './webhook-dispatcher';
import { InMemoryEventBus } from '../events/in-memory-event-bus';
import { createEvent } from '../../domain/events/domain-event';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSub(overrides: Partial<WebhookSubscription> = {}): WebhookSubscription {
  return {
    id: randomUUID(),
    tenantId: 'tenant-1',
    url: 'https://example.com/hook',
    topics: ['gate.evaluated'],
    secret: 'super-secret',
    active: true,
    createdAt: new Date().toISOString(),
    retryPolicy: { ...DEFAULT_RETRY_POLICY },
    ...overrides,
  };
}

// ── HmacSigner ───────────────────────────────────────────────────────────────

describe('HmacSigner', () => {
  const signer = new HmacSigner();
  const payload = JSON.stringify({ gate: 'G1', passed: true });
  const secret = 'my-secret';

  it('produces a hex string from sign()', () => {
    const hex = signer.sign(payload, secret);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('headerValue() includes sha256= prefix', () => {
    const header = signer.headerValue(payload, secret);
    expect(header).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('verify() returns true for a valid signature', () => {
    const sig = signer.headerValue(payload, secret);
    expect(signer.verify(payload, secret, sig)).toBe(true);
  });

  it('verify() accepts signature without sha256= prefix', () => {
    const hex = signer.sign(payload, secret);
    expect(signer.verify(payload, secret, hex)).toBe(true);
  });

  it('verify() returns false for a tampered payload', () => {
    const sig = signer.headerValue(payload, secret);
    expect(signer.verify('tampered', secret, sig)).toBe(false);
  });

  it('verify() returns false for wrong secret', () => {
    const sig = signer.headerValue(payload, secret);
    expect(signer.verify(payload, 'wrong-secret', sig)).toBe(false);
  });
});

// ── InMemorySubscriptionRepository ───────────────────────────────────────────

describe('InMemorySubscriptionRepository', () => {
  let repo: InMemorySubscriptionRepository;

  beforeEach(() => {
    repo = new InMemorySubscriptionRepository();
  });

  it('saves and retrieves by id', async () => {
    const sub = makeSub();
    await repo.save(sub);
    const found = await repo.findById(sub.id);
    expect(found).toEqual(sub);
  });

  it('findByTenant returns only matching tenant subs', async () => {
    const sub1 = makeSub({ tenantId: 'A' });
    const sub2 = makeSub({ tenantId: 'B' });
    await repo.save(sub1);
    await repo.save(sub2);
    const result = await repo.findByTenant('A');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(sub1.id);
  });

  it('findByTopic returns subs that include the topic', async () => {
    const sub1 = makeSub({ topics: ['gate.evaluated', 'phase.started'] });
    const sub2 = makeSub({ topics: ['phase.started'] });
    await repo.save(sub1);
    await repo.save(sub2);
    const result = await repo.findByTopic('gate.evaluated');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(sub1.id);
  });

  it('delete removes the subscription', async () => {
    const sub = makeSub();
    await repo.save(sub);
    await repo.delete(sub.id);
    expect(await repo.findById(sub.id)).toBeUndefined();
  });
});

// ── WebhookDispatcher ─────────────────────────────────────────────────────────

describe('WebhookDispatcher', () => {
  let subRepo: InMemorySubscriptionRepository;
  let deliveryRepo: InMemoryDeliveryRepository;
  let dispatcher: WebhookDispatcher;

  beforeEach(() => {
    subRepo = new InMemorySubscriptionRepository();
    deliveryRepo = new InMemoryDeliveryRepository();
    dispatcher = new WebhookDispatcher(subRepo, deliveryRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks delivery as delivered on successful fetch', async () => {
    const sub = makeSub();
    await subRepo.save(sub);

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe('delivered');
    expect(deliveries[0].attemptCount).toBe(1);
  });

  it('marks delivery as pending with nextRetryAt on first failure', async () => {
    const sub = makeSub({ retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 } });
    await subRepo.save(sub);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries[0].status).toBe('pending');
    expect(deliveries[0].nextRetryAt).toBeDefined();
  });

  it('marks delivery as failed when maxAttempts is exhausted', async () => {
    const sub = makeSub({ retryPolicy: { maxAttempts: 1, backoffMs: 100, backoffMultiplier: 2 } });
    await subRepo.save(sub);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries[0].status).toBe('failed');
    expect(deliveries[0].nextRetryAt).toBeUndefined();
  });

  it('skips inactive subscriptions', async () => {
    const sub = makeSub({ active: false });
    await subRepo.save(sub);

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries).toHaveLength(0);
  });

  it('retryPending processes overdue deliveries', async () => {
    const sub = makeSub({ retryPolicy: { maxAttempts: 2, backoffMs: 0, backoffMultiplier: 1 } });
    await subRepo.save(sub);

    // First attempt fails
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));
    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    // Second attempt succeeds
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await dispatcher.retryPending();

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries[0].status).toBe('delivered');
    expect(deliveries[0].attemptCount).toBe(2);
  });

  it('attaches HMAC signature header', async () => {
    const sub = makeSub({ secret: 'test-secret' });
    await subRepo.save(sub);

    let capturedHeaders: Record<string, string> = {};
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return { ok: true } as Response;
    });

    await dispatcher.dispatch('gate.evaluated', { gate: 'G1' });

    const sigHeader = capturedHeaders['X-Evolith-Signature'];
    expect(sigHeader).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it('wires to event bus and dispatches on event', async () => {
    const sub = makeSub({ topics: ['phase.started'] });
    await subRepo.save(sub);

    const bus = new InMemoryEventBus();
    dispatcher.wireEventBus(bus, ['phase.started']);

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    const event = createEvent('phase.started', 1, { phase: 'build' });
    await bus.publish(event);

    const deliveries = await deliveryRepo.findBySubscription(sub.id);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe('delivered');
  });
});
