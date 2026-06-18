import { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { GateEvidence } from '@evolith/core-domain/domain/gate-evidence';

/**
 * Delivers gate evidence to an external webhook over HTTP POST.
 * Shared adapter so any consumer (CLI, MCP Gateway, API) can notify webhooks.
 */
export class WebhookAdapter implements IWebhookNotifier {
  async notify(url: string, evidence: GateEvidence): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evidence),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with status: ${response.status}`);
    }
  }
}
