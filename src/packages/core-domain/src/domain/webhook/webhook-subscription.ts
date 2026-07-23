/**
 * Retry policy for webhook deliveries.
 */
export interface RetryPolicy {
  /** Maximum number of delivery attempts (including the first). */
  maxAttempts: number;
  /** Base backoff delay in milliseconds. */
  backoffMs: number;
  /** Multiplier applied to backoffMs on each retry. */
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: Number(process.env.WEBHOOK_MAX_ATTEMPTS) || 3,
  backoffMs: Number(process.env.WEBHOOK_BACKOFF_MS) || 1000,
  backoffMultiplier: Number(process.env.WEBHOOK_BACKOFF_MULTIPLIER) || 2,
};

/**
 * Represents a tenant's subscription to webhook notifications for specific topics.
 */
export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  /** List of topic strings this subscription listens to (e.g. 'gate.evaluated'). */
  topics: string[];
  /** Shared secret used to compute HMAC signatures. */
  secret: string;
  active: boolean;
  createdAt: string;
  retryPolicy: RetryPolicy;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed';

/**
 * Tracks a single webhook delivery attempt (including retries).
 */
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  topic: string;
  payload: unknown;
  attemptCount: number;
  status: DeliveryStatus;
  lastAttemptAt?: string;
  nextRetryAt?: string;
}
