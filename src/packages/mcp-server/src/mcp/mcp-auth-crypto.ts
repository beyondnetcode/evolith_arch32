/**
 * Cryptographic utilities for MCP authentication.
 * Single responsibility: constant-time credential comparison.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time API-key comparison (GAP MCP-TIMING). Guards against the timing
 * side-channel of `===` by hashing to fixed-length buffers before comparing.
 * A configured key is required; empty/undefined presented tokens never match.
 */
export function safeKeyEqual(presented: string | undefined, configured: string | undefined): boolean {
  if (!presented || !configured) return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(configured).digest();
  return timingSafeEqual(a, b);
}
