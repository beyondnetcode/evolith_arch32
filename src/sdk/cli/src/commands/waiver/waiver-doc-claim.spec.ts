import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GT-677 — a DOC-vs-WIRING guard.
 *
 * `waiver.command.ts`'s docblock claimed, from GT-518 until 2026-08-14, that "the drift
 * gate consumes the SAME store to suppress an approved, unexpired waiver". It did not:
 * `evaluateDriftGate` was called without its `waivers` argument on every shipped path,
 * so the claim was false for two releases and no test noticed — the domain's own waiver
 * tests passed because they constructed the store themselves.
 *
 * This spec reads the three sources as TEXT and fails if the claim and the wiring ever
 * diverge again. It deliberately does not assert behaviour (the round-trip spec does);
 * its job is to make the prose falsifiable.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..');
const WAIVER_COMMAND = join(__dirname, 'waiver.command.ts');
const EVALUATE_COMMAND = join(__dirname, '..', 'evaluate', 'evaluate.command.ts');
const EVALUATE_TOOL = join(REPO_ROOT, 'src', 'packages', 'mcp-server', 'src', 'tools', 'evaluate.tool.ts');

const read = (p: string): string => readFileSync(p, 'utf8');

describe('GT-677 · the waiver docblock must match the wiring', () => {
  it('T11 · every source the docblock names actually exists where this spec looks', () => {
    // A path typo would turn every assertion below into a vacuous pass.
    for (const p of [WAIVER_COMMAND, EVALUATE_COMMAND, EVALUATE_TOOL]) {
      expect(read(p).length).toBeGreaterThan(0);
    }
  });

  it('T11 · the docblock claims the gate consumes the same store', () => {
    // If someone deletes the claim instead of the wiring, this test tells them the
    // guard below is now guarding nothing.
    expect(read(WAIVER_COMMAND)).toContain('resolve the SAME path with the SAME function');
  });

  it('T11 · the CLI evaluate command passes the store to the drift gate', () => {
    const src = read(EVALUATE_COMMAND);
    expect(src).toContain('waivers: waiverStore');
    // BOTH gate call sites — the drift branch and the Tracker deposit — or the PR
    // comment and the ledger row disagree inside a single run.
    expect(src.match(/waivers: waiverStore/g)!.length).toBeGreaterThanOrEqual(2);
    // …and the --evidence manifest, which is the artifact the board's own
    // reproduction read `blockingFailures` out of.
    expect(src).toContain('emitEvaluationEvidence(result, DRIFT_GATE_SOURCE, { waivers: waiverStore })');
  });

  it('T11 · the MCP evaluate tool passes the store to the drift gate', () => {
    // Either shared opener satisfies the claim, and only those two: `openWaiverStore` is the
    // writer's (it must be able to create the file it is given) and `openWaiverStoreForRead`
    // is the reader's (an explicit path that is missing is a loud error rather than an empty
    // store). Pinning the exact reader name here is what turned this test red when the reader
    // changed — correct behaviour, and the reason the assertion widens rather than loosens:
    // an ad hoc `new FileWaiverStore(...)` at this call site still fails, which is the
    // divergence the row exists to catch.
    expect(read(EVALUATE_TOOL)).toMatch(/waivers: openWaiverStore(ForRead)?\(/);
  });

  it('T11 · both readers resolve the store through the shared resolver, never ad hoc', () => {
    for (const p of [EVALUATE_COMMAND, EVALUATE_TOOL]) {
      const src = read(p);
      expect(src).toMatch(/openWaiverStore|resolveWaiverStorePath/);
      // A second, private resolution rule is exactly how the writer and the reader
      // drifted apart in the first place.
      expect(src).not.toContain('new FileWaiverStore(');
    }
  });

  it('T11 · the writer no longer anchors the store on process.cwd()', () => {
    const src = read(WAIVER_COMMAND);
    expect(src).not.toContain('resolve(process.cwd(), options?.store');
    expect(src).toContain('openWaiverStore(workspaceRoot, options?.store)');
  });
});
