import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

/**
 * Process-local (in-memory) cache for the Core.
 *
 * The Core is a stateless evaluation engine (ADR-0101): it holds no shared state,
 * and the only thing it caches is per-process, expensive-to-recompute work
 * (architecture/ruleset reads in ArchitectureController). Per-process caching is the
 * honest, adequate shape for such a service.
 *
 * A distributed Redis cache used to be wired here but never actually connected: the
 * `@keyv/redis` v5 default-export was destructured as a named export (undefined), and
 * the returned config used the pre-v5 `store` key instead of `stores`, so BOTH paths
 * silently fell back to this same in-memory store while ignoring every `REDIS_*` value
 * and logging two warnings on every boot (GT-560). Repairing the wiring in isolation
 * would have been strictly worse — a live-but-unreachable Redis makes `get`/`set` hang
 * indefinitely rather than reject — so a shared cache, if ever needed, must be added
 * JOINTLY with a circuit breaker (opossum timeout → fast miss + in-memory fallback).
 * Until there is a measured need, the dead Redis wiring is removed rather than repaired.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => ({
        ttl: Number(process.env.CACHE_TTL_MS) || 300_000,
        max: Number(process.env.CACHE_MAX_ENTRIES) || 1000,
      }),
    }),
  ],
  exports: [CacheModule],
})
export class InMemoryCacheModule {}
