/**
 * IMemoryPort — the runtime's working memory (conversation, prior results,
 * scratch state). Deliberately minimal and namespaced so an in-memory adapter,
 * a Redis adapter, or a vector store all satisfy it.
 *
 * Memory is the runtime's own concern; it is NEVER a substitute for Tracker's
 * system-of-record nor for the Core's deterministic state.
 */

export interface MemoryEntry {
  readonly at: string; // ISO-8601 UTC
  readonly value: unknown;
}

export interface IMemoryPort {
  /** Store/replace a value under a key (optionally namespaced). */
  remember(key: string, value: unknown, namespace?: string): Promise<void>;
  /** Read a previously stored value, or undefined. */
  recall<T = unknown>(key: string, namespace?: string): Promise<T | undefined>;
  /** Append an entry to an ordered log (e.g. a conversation/timeline). */
  append(namespace: string, value: unknown): Promise<void>;
  /** Read the ordered log for a namespace (most-recent-last). */
  history(namespace: string, limit?: number): Promise<readonly MemoryEntry[]>;
}
