import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { McpToolSchema } from './tool.interface';

const execFileAsync = promisify(execFile);

/**
 * GT-606 — Optimistic State Verification for mutative MCP tools (ADR-0093 §1).
 *
 * ADR-0093 is `Accepted` and mandates that a tool which mutates repository files
 * declares a `baseSha` parameter, verifies it against the workspace HEAD BEFORE
 * applying anything, and rejects with a `CONCURRENCY_CONFLICT` when the two have
 * diverged. This module is the mechanism; the enforcement point is the single
 * dispatch (`mcp-tool-dispatch.ts`), not the fifty tool classes.
 *
 * Enforcing centrally is deliberate and is the whole value of the change: the
 * `mutative` flag is already the key the HITL approval gate turns on
 * (see `mutative-hitl-parity.spec.ts`), so a tool registered tomorrow with
 * `mutative:true` inherits the concurrency check with no extra wiring. A
 * per-tool implementation would have produced twenty places to forget.
 *
 * ## Semantics: `If-Match`, not a lock
 *
 * `baseSha` is OPTIONAL by default. This is optimistic concurrency in the HTTP
 * `If-Match` sense: the caller that states the state it planned against gets
 * protection; the caller that states nothing gets none, and gets it silently,
 * exactly as before this change. Making it mandatory outright would break every
 * existing caller of twenty tools, and would make `evolith-scaffold` /
 * `evolith-init-batch` — which legitimately target a directory that is not a git
 * repository yet — unusable. A deployment that wants the strict reading sets
 * `EVOLITH_MCP_REQUIRE_BASE_SHA=1` and a mutative call without `baseSha` is then
 * rejected as `missing_base_sha`.
 *
 * ## Fail-closed
 *
 * If `baseSha` IS supplied and HEAD cannot be resolved (not a repository, git
 * unavailable, empty repository), the call is rejected rather than allowed
 * through. The caller asserted a base state; being unable to check that
 * assertion is not evidence that it holds.
 */

/** Name of the optimistic-concurrency parameter mandated by ADR-0093 §1. */
export const BASE_SHA_ARG = 'baseSha';

/**
 * Argument names, in precedence order, from which a tool's target workspace is
 * derived. This mirrors what the tool implementations themselves do — e.g.
 * `upgrade.tools.ts` reads `satellitePath || path || cwd`, `agent.tools.ts` and
 * `auto-fix.tools.ts` read `dir || cwd`, `sdlc-generate.tool.ts` reads `output`.
 * Kept in one place so the SHA is read from the same directory the write lands
 * in; a resolver that silently fell back to the server cwd would verify the
 * wrong repository and hand back a false green.
 */
export const WORKSPACE_DIR_ARG_KEYS = ['satellitePath', 'path', 'dir', 'output'] as const;

/**
 * Directory-shaped arguments of mutative tools that are deliberately NOT the
 * write target, and so must not be treated as the workspace:
 *   - `corePath` / `core` (`evolith-upgrade-apply`): the upstream being read FROM.
 *   - `from` (`evolith-sdlc-generate`): the input model file, resolved against
 *     `output`, which is the write target.
 *   - `rulesetPath`: an output field echoed back, never an input.
 * The enumeration guard asserts every directory-shaped property of every
 * mutative tool is either resolvable or listed here, so a new tool that invents
 * `repoRoot` fails the build instead of quietly checking the wrong repository.
 */
export const NON_WORKSPACE_DIR_ARG_KEYS = ['corePath', 'core', 'from', 'rulesetPath'] as const;

/** JSON-Schema fragment advertised on every mutative tool. */
export const BASE_SHA_SCHEMA_PROPERTY = {
  type: 'string',
  description:
    'ADR-0093 optimistic concurrency: the git commit SHA of the workspace the caller planned against. ' +
    'Verified against the workspace HEAD before anything is written; on divergence the call is rejected ' +
    'with CONCURRENCY_CONFLICT and nothing is applied. A 7+ character abbreviated SHA is accepted. ' +
    'Optional unless the server runs with EVOLITH_MCP_REQUIRE_BASE_SHA=1.',
} as const;

/** Add the `baseSha` parameter to a tool schema without mutating the original. */
export function withBaseShaParameter(schema: McpToolSchema): McpToolSchema {
  if (schema.inputSchema?.properties?.[BASE_SHA_ARG]) return schema;
  return {
    ...schema,
    inputSchema: {
      ...schema.inputSchema,
      properties: {
        ...schema.inputSchema.properties,
        [BASE_SHA_ARG]: { ...BASE_SHA_SCHEMA_PROPERTY },
      },
    },
  };
}

/** Resolve the directory a mutative call will write into. */
export function resolveWorkspaceDir(
  args: Record<string, unknown>,
  cwd: string = process.cwd(),
): string {
  for (const key of WORKSPACE_DIR_ARG_KEYS) {
    const value = args[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return cwd;
}

/** Reads the HEAD commit SHA of a working directory. Injectable for tests. */
export type HeadShaReader = (dir: string) => Promise<string | null>;

/** Default reader: `git rev-parse HEAD`, `null` when HEAD cannot be resolved. */
export const readHeadSha: HeadShaReader = async (dir) => {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      timeout: 5_000,
    });
    const sha = stdout.trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha.toLowerCase() : null;
  } catch {
    // Not a repository, git missing, or an unborn HEAD.
    return null;
  }
};

export type ConflictType = 'git_sha_mismatch' | 'head_unresolved' | 'missing_base_sha';

/** ADR-0093 §3 conflict payload, carried in the `details` of the error envelope. */
export interface ConcurrencyConflict {
  conflict_type: ConflictType;
  expected_sha: string | null;
  actual_sha: string | null;
  workspace: string;
  message: string;
}

/** True when `provided` names the same commit as `actual` (abbreviations allowed). */
export function shaMatches(provided: string, actual: string): boolean {
  const a = provided.trim().toLowerCase();
  const b = actual.trim().toLowerCase();
  if (a.length < 7) return false;
  return b.startsWith(a);
}

export interface VerifyBaseShaOptions {
  args: Record<string, unknown>;
  readHead?: HeadShaReader;
  cwd?: string;
  /** Reject a mutative call that omits `baseSha` entirely. */
  requireBaseSha?: boolean;
}

/** True when the server is configured to demand `baseSha` on every mutative call. */
export function baseShaIsRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.EVOLITH_MCP_REQUIRE_BASE_SHA;
  return raw === '1' || raw === 'true';
}

/**
 * Verify `baseSha` against the workspace HEAD. Returns `null` when the call may
 * proceed, or the conflict to report. Never writes anything: this runs strictly
 * before `tool.execute`.
 */
export async function verifyBaseSha(
  options: VerifyBaseShaOptions,
): Promise<ConcurrencyConflict | null> {
  const { args, readHead = readHeadSha, cwd, requireBaseSha = false } = options;
  const workspace = resolveWorkspaceDir(args, cwd);
  const raw = args[BASE_SHA_ARG];
  const provided = typeof raw === 'string' ? raw.trim() : '';

  if (provided === '') {
    if (!requireBaseSha) return null;
    return {
      conflict_type: 'missing_base_sha',
      expected_sha: null,
      actual_sha: await readHead(workspace),
      workspace,
      message:
        'This server requires optimistic concurrency control (EVOLITH_MCP_REQUIRE_BASE_SHA). ' +
        'Read the workspace HEAD and pass it as "baseSha".',
    };
  }

  const actual = await readHead(workspace);
  if (!actual) {
    return {
      conflict_type: 'head_unresolved',
      expected_sha: provided,
      actual_sha: null,
      workspace,
      message:
        `A baseSha was supplied but HEAD could not be resolved in "${workspace}". ` +
        'The base state cannot be confirmed, so nothing was applied.',
    };
  }

  if (shaMatches(provided, actual)) return null;

  return {
    conflict_type: 'git_sha_mismatch',
    expected_sha: provided,
    actual_sha: actual,
    workspace,
    message:
      `The workspace has drifted: expected base ${provided}, HEAD is now ${actual}. ` +
      'Nothing was applied. Re-read the workspace, re-evaluate the plan and retry.',
  };
}
