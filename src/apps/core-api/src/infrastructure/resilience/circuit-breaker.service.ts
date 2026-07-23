import { Injectable } from '@nestjs/common';
import CircuitBreaker from 'opossum';

interface BreakerStats {
  name: string;
  state: 'closed' | 'open' | 'halfOpen';
  failures: number;
  fallbacks: number;
  successes: number;
  rejects: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly breakers: Map<string, CircuitBreaker> = new Map();

  createBreaker<T>(
    name: string,
    fn: (...args: unknown[]) => Promise<T>,
    fallback?: (...args: unknown[]) => Promise<T>,
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(fn, {
      timeout: Number(process.env.CIRCUIT_BREAKER_TIMEOUT_MS) || 10000,
      errorThresholdPercentage: Number(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD_PCT) || 50,
      resetTimeout: Number(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS) || 30000,
    });

    if (fallback) {
      breaker.fallback(fallback);
    }

    this.breakers.set(name, breaker);
    return breaker;
  }

  getStats(): BreakerStats[] {
    const stats: BreakerStats[] = [];
    for (const [name, breaker] of this.breakers) {
      stats.push({
        name,
        state: breaker.opened ? 'open' as const : breaker.halfOpen ? 'halfOpen' as const : 'closed' as const,
        failures: breaker.stats.failures,
        fallbacks: breaker.stats.fallbacks,
        successes: breaker.stats.successes,
        rejects: breaker.stats.rejects,
      });
    }
    return stats;
  }
}
