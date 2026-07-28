/**
 * GT-612 — rendering prior conversation into an engine prompt, BOUNDED.
 *
 * The runtime already bounds how many entries it reads from memory
 * (`ObservabilityDeps.memoryHistoryLimit`, default 20). This is the second,
 * independent bound: the one a PROMPT needs. An unbounded transcript is its own
 * defect — unbounded cost and latency per turn, and the oldest turn silently
 * evicting the actual request from the context window.
 *
 * Defaults: the last 10 entries, each serialized line capped at 200 characters,
 * and the whole transcript capped at 2000 characters (oldest lines dropped
 * first, so the most recent turn always survives). Truncation is VISIBLE — a
 * trimmed line ends in `…` and a trimmed transcript is prefixed with an explicit
 * marker — because an engine (and an auditor reading the trace) must be able to
 * tell "there was nothing before" from "there was more and it was cut".
 */

import type { AgentPlanHistoryEntry } from '../../domain/ports/agent-engine.port';

export interface PlanHistoryBounds {
  /** Maximum entries rendered (most recent kept). Default 10. */
  readonly maxEntries?: number;
  /** Maximum characters per rendered entry. Default 200. */
  readonly maxCharsPerEntry?: number;
  /** Maximum characters for the whole transcript. Default 2000. */
  readonly maxTotalChars?: number;
}

export const DEFAULT_PLAN_HISTORY_BOUNDS: Required<PlanHistoryBounds> = {
  maxEntries: 10,
  maxCharsPerEntry: 200,
  maxTotalChars: 2000,
};

const TRUNCATION_MARKER = '[…older turns omitted…]';

/**
 * Render a bounded transcript. Returns undefined when there is no history, so a
 * stateless turn sends no `history` key at all rather than an empty string.
 */
export function renderPlanHistory(
  history: readonly AgentPlanHistoryEntry[] | undefined,
  bounds: PlanHistoryBounds = {},
): string | undefined {
  if (!history || history.length === 0) return undefined;

  const maxEntries = bounds.maxEntries ?? DEFAULT_PLAN_HISTORY_BOUNDS.maxEntries;
  const maxCharsPerEntry = bounds.maxCharsPerEntry ?? DEFAULT_PLAN_HISTORY_BOUNDS.maxCharsPerEntry;
  const maxTotalChars = bounds.maxTotalChars ?? DEFAULT_PLAN_HISTORY_BOUNDS.maxTotalChars;

  const recent = history.slice(-maxEntries);
  const lines = recent.map((entry) => clamp(`${entry.at} ${serialize(entry.value)}`, maxCharsPerEntry));

  // Drop oldest lines until the transcript fits; the most recent turn always wins.
  let dropped = recent.length - lines.length;
  while (lines.length > 1 && lines.join('\n').length > maxTotalChars) {
    lines.shift();
    dropped += 1;
  }
  let transcript = lines.join('\n');
  if (transcript.length > maxTotalChars) transcript = clamp(transcript, maxTotalChars);
  if (dropped > 0 || recent.length < history.length) {
    transcript = clamp(`${TRUNCATION_MARKER}\n${transcript}`, maxTotalChars + TRUNCATION_MARKER.length + 1);
  }
  return transcript;
}

function serialize(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}
