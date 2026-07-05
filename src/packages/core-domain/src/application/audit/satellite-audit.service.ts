import { randomUUID } from 'crypto';
import { SatelliteAuditAction, SatelliteAuditEntry } from '../../domain/satellite-audit';

export class SatelliteAuditService {
  private readonly store = new Map<string, SatelliteAuditEntry[]>();

  async record(
    satelliteId: string,
    action: SatelliteAuditAction,
    details?: Record<string, unknown>,
    actor?: string,
    previousStatus?: string,
    newStatus?: string,
  ): Promise<SatelliteAuditEntry> {
    const entry: SatelliteAuditEntry = {
      id: randomUUID(),
      satelliteId,
      action,
      actor,
      timestamp: new Date().toISOString(),
      details,
      previousStatus,
      newStatus,
    };

    const existing = this.store.get(satelliteId) ?? [];
    existing.push(entry);
    this.store.set(satelliteId, existing);

    return entry;
  }

  getHistory(satelliteId: string): SatelliteAuditEntry[] {
    return this.store.get(satelliteId) ?? [];
  }

  getAll(): SatelliteAuditEntry[] {
    const result: SatelliteAuditEntry[] = [];
    for (const entries of this.store.values()) {
      result.push(...entries);
    }
    return result;
  }

  getLatestEntry(satelliteId: string): SatelliteAuditEntry | undefined {
    const entries = this.store.get(satelliteId);
    if (!entries || entries.length === 0) return undefined;
    return entries[entries.length - 1];
  }
}
