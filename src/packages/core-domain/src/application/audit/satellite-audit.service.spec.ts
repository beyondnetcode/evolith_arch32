import { SatelliteAuditService } from './satellite-audit.service';
import { SatelliteAuditEntry } from '../../domain/satellite-audit';

describe('SatelliteAuditService', () => {
  let service: SatelliteAuditService;

  beforeEach(() => {
    service = new SatelliteAuditService();
  });

  describe('record', () => {
    it('should record an audit entry and return it', async () => {
      const entry = await service.record('sat-1', 'created');

      expect(entry.id).toBeDefined();
      expect(entry.satelliteId).toBe('sat-1');
      expect(entry.action).toBe('created');
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });

    it('should record optional fields when provided', async () => {
      const details = { repoUrl: 'https://github.com/org/repo' };
      const entry = await service.record('sat-2', 'adopted', details, 'user-abc', 'provisioning', 'active');

      expect(entry.actor).toBe('user-abc');
      expect(entry.details).toEqual(details);
      expect(entry.previousStatus).toBe('provisioning');
      expect(entry.newStatus).toBe('active');
    });

    it('should record multiple entries for the same satellite', async () => {
      await service.record('sat-3', 'created');
      await service.record('sat-3', 'linked');
      await service.record('sat-3', 'upgraded');

      const history = service.getHistory('sat-3');
      expect(history).toHaveLength(3);
      expect(history.map(e => e.action)).toEqual(['created', 'linked', 'upgraded']);
    });

    it('should generate unique ids for each entry', async () => {
      const e1 = await service.record('sat-4', 'created');
      const e2 = await service.record('sat-4', 'linked');

      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for unknown satellite', () => {
      expect(service.getHistory('unknown')).toEqual([]);
    });

    it('should return all entries in insertion order', async () => {
      await service.record('sat-5', 'created');
      await service.record('sat-5', 'adopted');

      const history = service.getHistory('sat-5');
      expect(history[0].action).toBe('created');
      expect(history[1].action).toBe('adopted');
    });

    it('should isolate history per satellite', async () => {
      await service.record('sat-A', 'created');
      await service.record('sat-B', 'archived');

      expect(service.getHistory('sat-A')).toHaveLength(1);
      expect(service.getHistory('sat-B')).toHaveLength(1);
      expect(service.getHistory('sat-A')[0].action).toBe('created');
      expect(service.getHistory('sat-B')[0].action).toBe('archived');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no entries exist', () => {
      expect(service.getAll()).toEqual([]);
    });

    it('should return all entries across all satellites', async () => {
      await service.record('sat-X', 'created');
      await service.record('sat-Y', 'linked');
      await service.record('sat-X', 'upgraded');

      const all = service.getAll();
      expect(all).toHaveLength(3);
    });

    it('should include entries from all satellites', async () => {
      await service.record('sat-1', 'created');
      await service.record('sat-2', 'adopted');

      const all = service.getAll();
      const satelliteIds = all.map(e => e.satelliteId);
      expect(satelliteIds).toContain('sat-1');
      expect(satelliteIds).toContain('sat-2');
    });
  });

  describe('getLatestEntry', () => {
    it('should return undefined for unknown satellite', () => {
      expect(service.getLatestEntry('unknown')).toBeUndefined();
    });

    it('should return the most recent entry', async () => {
      await service.record('sat-Z', 'created');
      await service.record('sat-Z', 'linked');
      const last = await service.record('sat-Z', 'upgraded');

      const latest = service.getLatestEntry('sat-Z');
      expect(latest).toBeDefined();
      expect(latest!.id).toBe(last.id);
      expect(latest!.action).toBe('upgraded');
    });

    it('should return the single entry if only one exists', async () => {
      const entry = await service.record('sat-W', 'error');

      const latest = service.getLatestEntry('sat-W');
      expect(latest).toBeDefined();
      expect(latest!.id).toBe(entry.id);
    });
  });
});
