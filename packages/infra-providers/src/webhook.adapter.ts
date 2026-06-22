import { IWebhookNotifier } from '@evolith/core-domain/application/ports/webhook-notifier.port';
import { GateEvidence } from '@evolith/core-domain/domain/gate-evidence';
import { requestContextStorage } from '@evolith/core-domain/common/request-context';

/**
 * Delivers gate evidence to an external webhook over HTTP POST.
 * Shared adapter so any consumer (CLI, MCP Gateway, API) can notify webhooks.
 */
export class WebhookAdapter implements IWebhookNotifier {
  async notify(url: string, evidence: GateEvidence): Promise<void> {
    const context = requestContextStorage.getStore();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (context) {
      if (context.correlationId) headers['x-correlation-id'] = context.correlationId;
      if (context.initiative) headers['x-evolith-initiative'] = context.initiative;
      if (context.tenant) headers['x-evolith-tenant'] = context.tenant;
      if (context.phase) headers['x-evolith-phase'] = context.phase;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(evidence),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with status: ${response.status}`);
    }
  }
}
