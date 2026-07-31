/**
 * GT-604, acceptance criterion 2 — **one shared client, used by all three
 * surfaces.**
 *
 * The criterion is not "a client exists"; it is that the CLI, the MCP server and
 * the drift gate deposit through the SAME one. A client that only its own unit
 * test calls would pass every assertion in `evaluation-ingest.client.spec.ts`
 * forever while every verdict kept evaporating — which is the exact shape of the
 * defect this gap describes.
 *
 * So this guard asserts the CALL SITES, not the client. Two properties:
 *
 *  1. each surface calls `depositEvaluation` and declares the right
 *     `producer.surface`. A surface that deposited under the wrong label would
 *     make the Tracker's per-surface filter — the whole reason that field is a
 *     closed vocabulary — quietly wrong;
 *  2. no surface builds its own request to the ingest route. Three hand-written
 *     `fetch`es are three chances to drop `rulesExecuted[].engine`, to send
 *     `owner` where the wire says `accountableOwner`, or to put a `tenantId` in
 *     the body — and the last one is a security hole, not a typo, because the
 *     Tracker derives the tenant from which machine key matched.
 *
 * It reads source, in the same family as `api-catalog-parity.spec.ts`. That is a
 * real limitation and it is bounded: it can prove a surface is WIRED, not that
 * the wiring runs on every path. What it defends against is the regression that
 * actually happens — someone deleting the call, or adding a fourth surface with
 * its own copy of the payload mapping.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Walk up to the monorepo root so this works from src/ and from dist/. */
function repoRoot(): string {
  let dir = resolve(__dirname);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'src', 'packages'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error('monorepo root not found from ' + __dirname);
}

const ROOT = repoRoot();

interface Surface {
  readonly label: string;
  readonly file: string;
  /** The `surface` literals this file must declare when depositing. */
  readonly declares: readonly string[];
}

const SURFACES: readonly Surface[] = [
  {
    label: 'CLI `evolith evaluate` (and its --format drift gate)',
    file: 'src/sdk/cli/src/commands/evaluate/evaluate.command.ts',
    // ONE file, TWO surfaces: the drift gate is the `--format drift` path of the
    // same command, and the gap names them separately because they are separate
    // producers in the ledger.
    declares: ['cli', 'drift-gate'],
  },
  {
    label: 'MCP `evolith-evaluate`',
    file: 'src/packages/mcp-server/src/tools/evaluate.tool.ts',
    declares: ['mcp'],
  },
];

function source(relative: string): string {
  const full = join(ROOT, relative);
  const text = existsSync(full) ? readFileSync(full, 'utf-8') : '';
  // A path that stopped resolving would turn every assertion below into "I checked
  // nothing" — the failure mode this repository has already been bitten by.
  expect(text.length).toBeGreaterThan(0);
  return text;
}

describe('GT-604 — every verdict-producing surface deposits through the shared client', () => {
  it.each(SURFACES.map((s) => [s.label, s] as const))('%s calls depositEvaluation', (_label, surface) => {
    const text = source(surface.file);

    expect(text).toContain('depositEvaluation');
    expect(text).toMatch(/from '@beyondnet\/evolith-infra-providers'/);
  });

  it.each(SURFACES.map((s) => [s.label, s] as const))(
    '%s declares the surface it deposits as',
    (_label, surface) => {
      const text = source(surface.file);

      for (const declared of surface.declares) {
        expect(text).toContain(`surface: '${declared}'`);
      }
    },
  );

  /**
   * The invariant that makes the shared client shared. `EVALUATION_INGEST_ENDPOINT_CONTRACT.path`
   * appears exactly once in the whole repository outside the contract and the
   * client's own tests: inside the client.
   */
  it.each(SURFACES.map((s) => [s.label, s] as const))(
    '%s does NOT build its own request to the ingest route',
    (_label, surface) => {
      const text = source(surface.file);

      expect(text).not.toContain('core-evaluation-transactions');
      expect(text).not.toContain('x-api-key');
    },
  );

  it('the CLI deposits BEFORE it exits on a blocking verdict', () => {
    const text = source(SURFACES[0].file);

    const deposit = text.indexOf('await this.depositEvidence');
    const blockingExit = text.indexOf('if (published.exitCode !== 0) exitWith');

    expect(deposit).toBeGreaterThan(-1);
    expect(blockingExit).toBeGreaterThan(-1);
    expect(deposit).toBeLessThan(blockingExit);
    // A run that BLOCKS is precisely the run whose evidence matters. Exiting first
    // would lose exactly those and keep the passing ones, which is worse than
    // losing all of them: the ledger would read as if nothing ever failed.
  });
});
