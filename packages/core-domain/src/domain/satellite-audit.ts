export type SatelliteAuditAction = 'created' | 'adopted' | 'linked' | 'upgraded' | 'updated' | 'archived' | 'error';

export interface SatelliteAuditEntry {
  id: string;
  satelliteId: string;
  action: SatelliteAuditAction;
  actor?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  previousStatus?: string;
  newStatus?: string;
}
