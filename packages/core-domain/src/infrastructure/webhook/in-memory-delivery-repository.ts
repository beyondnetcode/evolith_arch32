import type { IWebhookDeliveryRepository } from '../../application/ports/webhook-subscription.port';
import type { WebhookDelivery } from '../../domain/webhook/webhook-subscription';

/**
 * In-memory implementation of `IWebhookDeliveryRepository`.
 * Suitable for unit tests and local development.
 */
export class InMemoryDeliveryRepository implements IWebhookDeliveryRepository {
  private readonly store = new Map<string, WebhookDelivery>();

  async save(delivery: WebhookDelivery): Promise<void> {
    this.store.set(delivery.id, { ...delivery });
  }

  async findPending(): Promise<WebhookDelivery[]> {
    return [...this.store.values()].filter((d) => d.status === 'pending');
  }

  async findBySubscription(subscriptionId: string): Promise<WebhookDelivery[]> {
    return [...this.store.values()].filter((d) => d.subscriptionId === subscriptionId);
  }

  /** Returns all stored deliveries — useful for assertions in tests. */
  all(): WebhookDelivery[] {
    return [...this.store.values()];
  }

  /** Clears all entries — useful for test teardown. */
  clear(): void {
    this.store.clear();
  }
}
