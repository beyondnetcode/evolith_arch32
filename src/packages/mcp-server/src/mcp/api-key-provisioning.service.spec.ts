import { ApiKeyProvisioningService } from './api-key-provisioning.service';

describe('ApiKeyProvisioningService', () => {
  let service: ApiKeyProvisioningService;

  beforeEach(() => {
    service = new ApiKeyProvisioningService();
  });

  describe('generateKey', () => {
    it('should generate a key with evk_ prefix', () => {
      const result = service.generateKey('test-client');
      expect(result.key).toMatch(/^evk_/);
    });

    it('should return metadata without hash', () => {
      const result = service.generateKey('test-client');
      expect(result.metadata).not.toHaveProperty('hash');
      expect(result.metadata.clientLabel).toBe('test-client');
      expect(result.metadata.id).toMatch(/^kid_/);
    });

    it('should store key with default scopes and tenant', () => {
      const result = service.generateKey('test-client');
      const stored = service.getKeyById(result.metadata.id);
      expect(stored).toBeDefined();
      expect(stored!.scopes).toEqual(['read', 'write']);
      expect(stored!.tenant).toBe('default');
    });

    it('should accept custom scopes and tenant', () => {
      const result = service.generateKey('test-client', {
        scopes: ['read'],
        tenant: 'acme',
      });
      const stored = service.getKeyById(result.metadata.id);
      expect(stored!.scopes).toEqual(['read']);
      expect(stored!.tenant).toBe('acme');
    });

    it('should accept custom expiry', () => {
      const result = service.generateKey('test-client', { expiryDays: 7 });
      const stored = service.getKeyById(result.metadata.id);
      const created = new Date(stored!.createdAt);
      const expires = new Date(stored!.expiresAt);
      const diffDays = (expires.getTime() - created.getTime()) / 86400000;
      expect(diffDays).toBe(7);
    });

    it('should log a creation event', () => {
      service.generateKey('test-client');
      const events = service.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('created');
      expect(events[0].clientLabel).toBe('test-client');
    });
  });

  describe('validateKey', () => {
    it('should validate a freshly generated key', () => {
      const result = service.generateKey('test-client');
      const validated = service.validateKey(result.key);
      expect(validated).toBeDefined();
      expect(validated!.id).toBe(result.metadata.id);
    });

    it('should update lastUsedAt on validation', () => {
      const result = service.generateKey('test-client');
      service.validateKey(result.key);
      const stored = service.getKeyById(result.metadata.id);
      expect(stored!.lastUsedAt).not.toBeNull();
    });

    it('should reject non-evk_ keys', () => {
      expect(service.validateKey('not-a-key')).toBeNull();
    });

    it('should reject revoked keys', () => {
      const result = service.generateKey('test-client');
      service.revokeKey(result.metadata.id);
      expect(service.validateKey(result.key)).toBeNull();
    });

    it('should reject unknown keys', () => {
      expect(service.validateKey('evk_unknownkey')).toBeNull();
    });
  });

  describe('rotateKey', () => {
    it('should revoke old key and generate new one', () => {
      const original = service.generateKey('test-client');
      const rotated = service.rotateKey(original.metadata.id);
      expect(rotated).not.toBeNull();
      expect(rotated!.key).toMatch(/^evk_/);
      expect(rotated!.key).not.toBe(original.key);

      expect(service.validateKey(original.key)).toBeNull();
      expect(service.validateKey(rotated!.key)).toBeDefined();
    });

    it('should preserve client label, scopes, and tenant', () => {
      const original = service.generateKey('test-client', {
        scopes: ['read'],
        tenant: 'acme',
      });
      const rotated = service.rotateKey(original.metadata.id);
      expect(rotated!.metadata.clientLabel).toBe('test-client');
      const stored = service.getKeyById(rotated!.metadata.id);
      expect(stored!.scopes).toEqual(['read']);
      expect(stored!.tenant).toBe('acme');
    });

    it('should log a rotation event', () => {
      const original = service.generateKey('test-client');
      service.rotateKey(original.metadata.id);
      const events = service.getRecentEvents();
      expect(events.find(e => e.type === 'rotated')).toBeDefined();
    });

    it('should return null for non-existent key', () => {
      expect(service.rotateKey('kid_nonexistent')).toBeNull();
    });

    it('should return null for already revoked key', () => {
      const original = service.generateKey('test-client');
      service.revokeKey(original.metadata.id);
      expect(service.rotateKey(original.metadata.id)).toBeNull();
    });
  });

  describe('revokeKey', () => {
    it('should revoke an active key', () => {
      const result = service.generateKey('test-client');
      expect(service.revokeKey(result.metadata.id)).toBe(true);
      const stored = service.getKeyById(result.metadata.id);
      expect(stored!.revokedAt).not.toBeNull();
    });

    it('should log a revocation event', () => {
      const result = service.generateKey('test-client');
      service.revokeKey(result.metadata.id);
      const events = service.getRecentEvents();
      expect(events.find(e => e.type === 'revoked')).toBeDefined();
    });

    it('should return false for non-existent key', () => {
      expect(service.revokeKey('kid_nonexistent')).toBe(false);
    });

    it('should return false for already revoked key', () => {
      const result = service.generateKey('test-client');
      service.revokeKey(result.metadata.id);
      expect(service.revokeKey(result.metadata.id)).toBe(false);
    });
  });

  describe('listKeys', () => {
    it('should list active keys by default', () => {
      const k1 = service.generateKey('client-1');
      const k2 = service.generateKey('client-2');
      service.revokeKey(k1.metadata.id);

      const active = service.listKeys();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(k2.metadata.id);
    });

    it('should include revoked keys when requested', () => {
      const k1 = service.generateKey('client-1');
      service.revokeKey(k1.metadata.id);

      const all = service.listKeys({ includeRevoked: true });
      expect(all).toHaveLength(1);
      expect(all[0].revokedAt).not.toBeNull();
    });

    it('should filter by tenant', () => {
      service.generateKey('client-1', { tenant: 'acme' });
      service.generateKey('client-2', { tenant: 'globex' });

      const acme = service.listKeys({ tenant: 'acme' });
      expect(acme).toHaveLength(1);
      expect(acme[0].tenant).toBe('acme');
    });
  });

  describe('migrateLegacyApiKey', () => {
    it('should create a new key from a legacy key', () => {
      const result = service.migrateLegacyApiKey('old-secret-key', 'legacy-client');
      expect(result).not.toBeNull();
      expect(result!.key).toMatch(/^evk_/);
      expect(result!.metadata.clientLabel).toBe('legacy-client');
    });

    it('should return null for empty legacy key', () => {
      expect(service.migrateLegacyApiKey('', 'client')).toBeNull();
    });
  });

  describe('audit trail', () => {
    it('should maintain chronological event order', () => {
      service.generateKey('c1');
      service.generateKey('c2');
      const events = service.getRecentEvents();
      expect(events[0].clientLabel).toBe('c2');
      expect(events[1].clientLabel).toBe('c1');
    });

    it('should cap events at 1000', () => {
      for (let i = 0; i < 1005; i++) {
        service.generateKey(`client-${i}`);
      }
      expect(service.getRecentEvents(2000)).toHaveLength(1000);
    });
  });
});
