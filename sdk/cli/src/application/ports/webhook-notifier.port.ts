import { GateEvidence } from '../../domain/gate-evidence';

export interface WebhookNotifierPort {
  notify(url: string, evidence: GateEvidence): Promise<void>;
}
