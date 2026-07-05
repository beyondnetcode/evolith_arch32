/**
 * InMemoryMemoryAdapter — default {@link IMemoryPort}. Process-local, non-durable.
 * Perfect for tests, the CLI, and a first runtime boot. Swap for a Redis/vector
 * adapter without touching the runtime.
 */

import type { IMemoryPort, MemoryEntry } from '../../domain/ports/memory.port';

export class InMemoryMemoryAdapter implements IMemoryPort {
  private readonly kv = new Map<string, unknown>();
  private readonly logs = new Map<string, MemoryEntry[]>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  private key(key: string, namespace?: string): string {
    return namespace ? `${namespace}::${key}` : key;
  }

  async remember(key: string, value: unknown, namespace?: string): Promise<void> {
    this.kv.set(this.key(key, namespace), value);
  }

  async recall<T = unknown>(key: string, namespace?: string): Promise<T | undefined> {
    return this.kv.get(this.key(key, namespace)) as T | undefined;
  }

  async append(namespace: string, value: unknown): Promise<void> {
    const log = this.logs.get(namespace) ?? [];
    log.push({ at: this.now(), value });
    this.logs.set(namespace, log);
  }

  async history(namespace: string, limit?: number): Promise<readonly MemoryEntry[]> {
    const log = this.logs.get(namespace) ?? [];
    return typeof limit === 'number' ? log.slice(-limit) : [...log];
  }
}
