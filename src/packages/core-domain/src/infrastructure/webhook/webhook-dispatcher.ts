import { randomUUID } from 'crypto';
import type {
  IWebhookDeliveryRepository,
  IWebhookSubscriptionRepository,
} from '../../application/ports/webhook-subscription.port';
import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { WebhookDelivery } from '../../domain/webhook/webhook-subscription';
import { HmacSigner } from './hmac-signer';

/**
 * Dispatches webhook notifications to active subscribers.
 *
 * Responsibilities:
 * - Fan-out to all active subscriptions for a given topic
 * - HMAC-sign payloads before delivery
 * - Track delivery state (pending → delivered | failed)
 * - Exponential-backoff retry via `retryPending()`
 * - Bridge to the domain event bus via `wireEventBus()`
 */
export class WebhookDispatcher {
  constructor(
    private readonly subscriptionRepo: IWebhookSubscriptionRepository,
    private readonly deliveryRepo: IWebhookDeliveryRepository,
    private readonly signer: HmacSigner = new HmacSigner(),
  ) {}

  /**
   * Dispatches `payload` to all active subscriptions that include `topic`.
   * Creates a `WebhookDelivery` record for each, then attempts delivery immediately.
   */
  async dispatch(topic: string, payload: unknown): Promise<void> {
    const subscriptions = await this.subscriptionRepo.findByTopic(topic);
    const active = subscriptions.filter((s) => s.active);

    await Promise.all(
      active.map(async (sub) => {
        const delivery: WebhookDelivery = {
          id: randomUUID(),
          subscriptionId: sub.id,
          topic,
          payload,
          attemptCount: 0,
          status: 'pending',
        };
        await this.deliveryRepo.save(delivery);
        await this._attempt(delivery, sub.url, sub.secret, sub.retryPolicy);
      }),
    );
  }

  /**
   * Processes all pending deliveries whose `nextRetryAt` is in the past.
   * Should be called on a timer (e.g. every 30 s) by the host process.
   */
  async retryPending(): Promise<void> {
    const pending = await this.deliveryRepo.findPending();
    const now = Date.now();
    const due = pending.filter((d) => {
      if (!d.nextRetryAt) return true;
      return new Date(d.nextRetryAt).getTime() <= now;
    });

    await Promise.all(
      due.map(async (delivery) => {
        const sub = await this.subscriptionRepo.findById(delivery.subscriptionId);
        if (!sub || !sub.active) {
          delivery.status = 'failed';
          await this.deliveryRepo.save(delivery);
          return;
        }
        await this._attempt(delivery, sub.url, sub.secret, sub.retryPolicy);
      }),
    );
  }

  /**
   * Subscribes the dispatcher to all events published on `eventBus`.
   * Each domain event is routed to topic `event.eventType`.
   */
  wireEventBus(eventBus: IDomainEventBus, topics: string[]): void {
    for (const topic of topics) {
      eventBus.subscribe(topic, async (event: DomainEvent<unknown>) => {
        await this.dispatch(event.eventType, event);
      });
    }
  }

  // ── private ─────────────────────────────────────────────────────────────

  private async _attempt(
    delivery: WebhookDelivery,
    url: string,
    secret: string,
    retryPolicy: { maxAttempts: number; backoffMs: number; backoffMultiplier: number },
  ): Promise<void> {
    delivery.attemptCount += 1;
    delivery.lastAttemptAt = new Date().toISOString();

    const body = JSON.stringify(delivery.payload);
    const signature = this.signer.headerValue(body, secret);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [HmacSigner.HEADER_NAME]: signature,
        },
        body,
      });

      if (response.ok) {
        delivery.status = 'delivered';
        delivery.nextRetryAt = undefined;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      if (delivery.attemptCount >= retryPolicy.maxAttempts) {
        delivery.status = 'failed';
        delivery.nextRetryAt = undefined;
      } else {
        delivery.status = 'pending';
        const delay =
          retryPolicy.backoffMs *
          Math.pow(retryPolicy.backoffMultiplier, delivery.attemptCount - 1);
        delivery.nextRetryAt = new Date(Date.now() + delay).toISOString();
      }
    }

    await this.deliveryRepo.save(delivery);
  }
}
