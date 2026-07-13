/**
 * Cross-agent edit-hook payload normalizer (GT-526 · axis 2 — positioning §14.1 surface (b)).
 *
 * The edit-time control surface must block an offending change IN-FLIGHT, as an AI agent
 * writes — BEFORE the PR. The pure decision lives in core-domain (`evaluateEdit` +
 * `EditBoundaryRule`). This module is the **vendor-neutral ADAPTER** that feeds it: it turns a
 * raw agent hook payload (Claude Code `PreToolUse`, and — via the same registry — Cursor /
 * Copilot / any custom shape) into the canonical {@link ProposedEdit} the gate understands.
 *
 * Neutrality is structural, not a switch statement: each vendor is a small {@link VendorHookAdapter}
 * (a `matches` predicate + an `extract` mapping). Adding Cursor is adding one adapter to
 * {@link EDIT_HOOK_ADAPTERS}; nothing downstream changes.
 */

import type { ProposedEdit } from '@beyondnet/evolith-core-domain/application/validators/enforcement/edit-gate';

/** A raw hook payload as received on stdin (JSON) from an agent runtime. Shape is vendor-specific. */
export type RawHookPayload = Record<string, unknown>;

/** A vendor-specific mapping from a raw hook payload to the canonical proposed edit. */
export interface VendorHookAdapter {
  /** Stable vendor id (e.g. `claude-code`, `cursor`, `generic`). */
  readonly vendor: string;
  /** True when this adapter recognizes the payload shape. */
  matches(raw: RawHookPayload): boolean;
  /**
   * Extract the proposed edit, or `null` when the payload is not a file-writing intent
   * (e.g. a `Bash`/`Read` tool call) and therefore has nothing to gate.
   */
  extract(raw: RawHookPayload): ProposedEdit | null;
}

/** The normalized outcome of parsing a raw payload. */
export interface NormalizedEditIntent {
  readonly vendor: string;
  readonly edit: ProposedEdit;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/**
 * Make an absolute file path repo-relative against the payload's `cwd`, so author-friendly
 * boundary rules (`appliesTo: 'src/domain/'`) match without every rule hard-coding an absolute
 * root. Non-absolute paths and paths outside `cwd` are returned untouched.
 */
export function relativizePath(filePath: string, cwd?: string): string {
  const f = filePath.replace(/\\/g, '/');
  const root = (cwd ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (root && f.startsWith(root + '/')) return f.slice(root.length + 1);
  return f.replace(/^\.\//, '');
}

/**
 * Claude Code `PreToolUse` adapter. Recognizes the documented payload:
 * `{ hook_event_name?: 'PreToolUse', tool_name, tool_input, cwd? }`.
 *
 * - `Write`  → the full `content` is the proposed file.
 * - `Edit`   → the replacement `new_string` is what the agent is about to introduce.
 * - `MultiEdit` → the concatenation of every edit's `new_string`.
 *
 * A non-writing tool (`Read`, `Bash`, `Grep`, …) yields `null` — nothing to gate.
 */
export const claudeCodeAdapter: VendorHookAdapter = {
  vendor: 'claude-code',
  matches(raw) {
    return typeof raw.tool_name === 'string' && asRecord(raw.tool_input) !== undefined;
  },
  extract(raw) {
    const toolName = asString(raw.tool_name);
    const input = asRecord(raw.tool_input);
    if (!toolName || !input) return null;
    const cwd = asString(raw.cwd);
    const filePathRaw = asString(input.file_path) ?? asString(input.filePath);
    if (!filePathRaw) return null;
    const filePath = relativizePath(filePathRaw, cwd);

    switch (toolName) {
      case 'Write': {
        const content = asString(input.content);
        return content === undefined ? null : { filePath, content };
      }
      case 'Edit': {
        const content = asString(input.new_string);
        return content === undefined ? null : { filePath, content };
      }
      case 'MultiEdit': {
        const edits = Array.isArray(input.edits) ? input.edits : [];
        const parts = edits
          .map((e) => asString(asRecord(e)?.new_string))
          .filter((s): s is string => s !== undefined);
        return parts.length === 0 ? null : { filePath, content: parts.join('\n') };
      }
      default:
        return null; // non-writing tool — nothing to enforce
    }
  },
};

/**
 * Vendor-neutral fallback adapter. Any agent (Cursor, Copilot, a CI script, a custom bot) that
 * cannot emit the Claude Code shape may POST the canonical shape directly:
 * `{ filePath | file_path | path, content | text | new_string }`. This is the documented plug-in
 * seam so a new vendor needs zero code here — only that its wrapper emit this normalized JSON.
 */
export const genericAdapter: VendorHookAdapter = {
  vendor: 'generic',
  matches(raw) {
    const hasPath = asString(raw.filePath) ?? asString(raw.file_path) ?? asString(raw.path);
    const hasContent = asString(raw.content) ?? asString(raw.text) ?? asString(raw.new_string);
    return hasPath !== undefined && hasContent !== undefined;
  },
  extract(raw) {
    const filePathRaw = asString(raw.filePath) ?? asString(raw.file_path) ?? asString(raw.path);
    const content = asString(raw.content) ?? asString(raw.text) ?? asString(raw.new_string);
    if (filePathRaw === undefined || content === undefined) return null;
    return { filePath: relativizePath(filePathRaw, asString(raw.cwd)), content };
  },
};

/**
 * The adapter registry, tried in order. Claude Code first (most specific), the generic
 * canonical shape last. Cursor/Copilot adapters slot in here without touching callers.
 */
export const EDIT_HOOK_ADAPTERS: readonly VendorHookAdapter[] = [claudeCodeAdapter, genericAdapter];

/**
 * Normalize a raw agent hook payload into a canonical edit intent.
 *
 * @param raw        The parsed JSON payload from stdin.
 * @param vendorHint Optional vendor id to force a specific adapter (skips auto-detection).
 * @returns The normalized intent, or `null` when the payload is not a gate-able file edit.
 */
export function normalizeEditIntent(raw: RawHookPayload, vendorHint?: string): NormalizedEditIntent | null {
  const candidates = vendorHint
    ? EDIT_HOOK_ADAPTERS.filter((a) => a.vendor === vendorHint)
    : EDIT_HOOK_ADAPTERS;
  for (const adapter of candidates) {
    if (!adapter.matches(raw)) continue;
    const edit = adapter.extract(raw);
    if (edit) return { vendor: adapter.vendor, edit };
  }
  return null;
}
