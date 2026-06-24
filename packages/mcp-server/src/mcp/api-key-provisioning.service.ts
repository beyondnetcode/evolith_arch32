import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

const KEY_PREFIX = 'evk_';
const KEY_ENTROPY_BYTES = 32;
const DEFAULT_EXPIRY_DAYS = 90;

export interface ApiKeyMetadata {
  id: string;
  hash: string;
  clientLabel: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  scopes: string[];
  tenant: string;
}

export interface ApiKeyProvisionResult {
  key: string;
  metadata: Omit<ApiKeyMetadata, 'hash'>;
}

export interface ApiKeyEvent {
  type: 'created' | 'rotated' | 'revoked' | 'validated' | 'expired';
  keyId: string;
  clientLabel: string;
  timestamp: string;
  tenant?: string;
}

@Injectable()
export class ApiKeyProvisioningService {
  private readonly logger = new Logger(ApiKeyProvisioningService.name);
  private readonly keys = new Map<string, ApiKeyMetadata>();
  private readonly events: ApiKeyEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  generateKey(clientLabel: string, options?: {
    scopes?: string[];
    tenant?: string;
    expiryDays?: number;
  }): ApiKeyProvisionResult {
    const rawBytes = crypto.randomBytes(KEY_ENTROPY_BYTES);
    const rawKey = KEY_PREFIX + rawBytes.toString('base64url');
    const hash = this.hashKey(rawKey);

    const now = new Date();
    const expiryDays = options?.expiryDays ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(now.getTime() + expiryDays * 86400000);

    const keyId = `kid_${crypto.randomBytes(8).toString('hex')}`;
    const metadata: ApiKeyMetadata = {
      id: keyId,
      hash,
      clientLabel,
      createdAt: now.toISOString(),
      lastUsedAt: null,
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
      scopes: options?.scopes ?? ['read', 'write'],
      tenant: options?.tenant ?? 'default',
    };

    this.keys.set(keyId, metadata);
    this.logEvent({
      type: 'created',
      keyId,
      clientLabel,
      timestamp: now.toISOString(),
      tenant: metadata.tenant,
    });

    this.logger.log(`API key created: ${keyId} for client "${clientLabel}"`);

    return {
      key: rawKey,
      metadata: this.toPublicMetadata(metadata),
    };
  }

  validateKey(rawKey: string): ApiKeyMetadata | null {
    if (!rawKey.startsWith(KEY_PREFIX)) return null;

    const hash = this.hashKey(rawKey);

    for (const meta of this.keys.values()) {
      if (meta.revokedAt) continue;
      if (meta.hash !== hash) continue;

      if (new Date(meta.expiresAt) < new Date()) {
        this.logEvent({
          type: 'expired',
          keyId: meta.id,
          clientLabel: meta.clientLabel,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      meta.lastUsedAt = new Date().toISOString();
      return meta;
    }

    return null;
  }

  rotateKey(keyId: string, options?: { expiryDays?: number }): ApiKeyProvisionResult | null {
    const existing = this.keys.get(keyId);
    if (!existing || existing.revokedAt) return null;

    existing.revokedAt = new Date().toISOString();
    this.logEvent({
      type: 'rotated',
      keyId: existing.id,
      clientLabel: existing.clientLabel,
      timestamp: existing.revokedAt,
    });

    return this.generateKey(existing.clientLabel, {
      scopes: existing.scopes,
      tenant: existing.tenant,
      expiryDays: options?.expiryDays,
    });
  }

  revokeKey(keyId: string): boolean {
    const meta = this.keys.get(keyId);
    if (!meta || meta.revokedAt) return false;

    meta.revokedAt = new Date().toISOString();
    this.logEvent({
      type: 'revoked',
      keyId: meta.id,
      clientLabel: meta.clientLabel,
      timestamp: meta.revokedAt,
    });

    this.logger.log(`API key revoked: ${keyId}`);
    return true;
  }

  listKeys(options?: { includeRevoked?: boolean; tenant?: string }): ApiKeyMetadata[] {
    const results: ApiKeyMetadata[] = [];
    for (const meta of this.keys.values()) {
      if (!options?.includeRevoked && meta.revokedAt) continue;
      if (options?.tenant && meta.tenant !== options.tenant) continue;
      results.push(meta);
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getKeyById(keyId: string): ApiKeyMetadata | undefined {
    return this.keys.get(keyId);
  }

  getRecentEvents(limit = 50): ApiKeyEvent[] {
    return this.events.slice(0, limit);
  }

  migrateLegacyApiKey(legacyKey: string, clientLabel: string): ApiKeyProvisionResult | null {
    if (!legacyKey) return null;

    const result = this.generateKey(clientLabel, {
      scopes: ['read', 'write', 'admin'],
      expiryDays: 365,
    });

    this.logger.log(`Migrated legacy API key for client "${clientLabel}" to ${result.metadata.id}`);
    return result;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private toPublicMetadata(meta: ApiKeyMetadata): Omit<ApiKeyMetadata, 'hash'> {
    const { hash: _, ...rest } = meta;
    return rest;
  }

  private logEvent(event: ApiKeyEvent): void {
    this.events.unshift(event);
    if (this.events.length > ApiKeyProvisioningService.MAX_EVENTS) {
      this.events.length = ApiKeyProvisioningService.MAX_EVENTS;
    }
  }
}
