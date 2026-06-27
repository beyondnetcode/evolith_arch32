import type { IWebhookSubscriptionRepository } from '../../application/ports/webhook-subscription.port';
import type { WebhookSubscription } from '../../domain/webhook/webhook-subscription';

/**
 * In-memory implementation of `IWebhookSubscriptionRepository`.
 * Suitable for unit tests and local development.
 */
export class InMemorySubscriptionRepository implements IWebhookSubscriptionRepository {
  private readonly store = new Map<string, WebhookSubscription>();

  async save(subscription: WebhookSubscription): Promise<void> {
    this.store.set(subscription.id, { ...subscription });
  }

  async findById(id: string): Promise<WebhookSubscription | undefined> {
    return this.store.get(id);
  }

  async findByTenant(tenantId: string): Promise<WebhookSubscription[]> {
    return [...this.store.values()].filter((s) => s.tenantId === tenantId);
  }

  async findByTopic(topic: string): Promise<WebhookSubscription[]> {
    return [...this.store.values()].filter((s) => s.topics.includes(topic));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** Clears all entries — useful for test teardown. */
  clear(): void {
    this.store.clear();
  }
}
