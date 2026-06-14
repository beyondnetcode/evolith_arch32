import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { EnvConfig } from '../config/env.validation';

@Injectable()
export class ApiKeyService implements OnModuleDestroy {
  private readonly keyStore: Map<string, string> = new Map();

  constructor(private readonly config: ConfigService<EnvConfig>) {
    this.loadKeys();
  }

  private loadKeys(): void {
    const apiKeys = this.config.get('API_KEYS', '');
    const keys = apiKeys.split(',');
    for (const key of keys) {
      const trimmed = key.trim();
      if (trimmed) {
        const hashed = this.hashKey(trimmed);
        this.keyStore.set(trimmed, hashed);
      }
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    const hashed = this.keyStore.get(apiKey);
    if (!hashed) return false;
    const providedHash = this.hashKey(apiKey);
    try {
      return timingSafeEqual(Buffer.from(hashed), Buffer.from(providedHash));
    } catch {
      return false;
    }
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  onModuleDestroy(): void {
    this.keyStore.clear();
  }
}
