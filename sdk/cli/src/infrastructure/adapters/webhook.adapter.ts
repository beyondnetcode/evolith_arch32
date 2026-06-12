import { IWebhookNotifier } from '../../application/ports/webhook-notifier.port';
import { GateEvidence } from '../../domain/gate-evidence';

export class WebhookAdapter implements IWebhookNotifier {
  async notify(url: string, evidence: GateEvidence): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(evidence),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with status: ${response.status}`);
    }
  }
}
