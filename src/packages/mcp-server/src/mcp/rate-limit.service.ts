/**
 * Rate Limiting Service — extracted from McpServerService (SRP).
 * Single responsibility: IP-based rate limiting with configurable window and limit.
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimitService {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(
    windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /** Returns true if the IP has exceeded the rate limit. */
  isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(ip);

    if (!entry || now > entry.resetAt) {
      this.entries.set(ip, { count: 1, resetAt: now + this.windowMs });
      return false;
    }

    entry.count++;
    return entry.count > this.maxRequests;
  }

  /** Returns the Retry-After value in seconds. */
  getRetryAfter(): number {
    return Math.ceil(this.windowMs / 1000);
  }

  /** Number of tracked IPs (for monitoring). */
  get trackedIpCount(): number {
    return this.entries.size;
  }
}
