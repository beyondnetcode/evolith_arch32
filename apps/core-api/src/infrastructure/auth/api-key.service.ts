import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly keyStore: Map<string, string> = new Map();

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    const keys = process.env.API_KEYS?.split(',') ?? [];
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
}
