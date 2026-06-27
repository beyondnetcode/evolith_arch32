import type { WebhookDelivery, WebhookSubscription } from '../../domain/webhook/webhook-subscription';

/**
 * Persistence port for webhook subscriptions.
 */
export interface IWebhookSubscriptionRepository {
  save(subscription: WebhookSubscription): Promise<void>;
  findById(id: string): Promise<WebhookSubscription | undefined>;
  findByTenant(tenantId: string): Promise<WebhookSubscription[]>;
  findByTopic(topic: string): Promise<WebhookSubscription[]>;
  delete(id: string): Promise<void>;
}

/**
 * Persistence port for webhook delivery records.
 */
export interface IWebhookDeliveryRepository {
  save(delivery: WebhookDelivery): Promise<void>;
  findPending(): Promise<WebhookDelivery[]>;
  findBySubscription(subscriptionId: string): Promise<WebhookDelivery[]>;
}
