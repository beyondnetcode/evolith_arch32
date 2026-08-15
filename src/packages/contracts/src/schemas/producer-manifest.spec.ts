/**
 * GT-573 (AC3) — the evaluate REQUEST and the `EvaluationResult` are pinned in
 * the producer machine-contract manifest, and the pin has teeth.
 *
 * Why this file exists as well as `machine-contract-set.spec.ts`
 * -------------------------------------------------------------
 * There are two descriptors of the same contract set:
 *
 *  - `MACHINE_CONTRACT_SET` (TypeScript, published in this package), and
 *  - `src/rulesets/contracts/evolith-machine-contracts.json` (the producer
 *    descriptor `.harness/scripts/ci/10-validate-contract-conformance.mjs`
 *    actually validates in CI, via `docs.yml`).
 *
 * The existing parity spec walks producer -> TypeScript, so a schema present in
 * the TS set but ABSENT from the producer manifest was invisible: for a while
 * that was exactly the state of `evaluation-context` / `evaluation-result` —
 * declared in the package, unpinned in the file the guard reads, therefore free
 * to change and reach the Tracker silently. The first test below walks the other
 * direction so that asymmetry cannot come back.
 *
 * The second and third tests do not trust the manifest by reading it: they run
 * the REAL guard over a throwaway root, once clean and once with the evaluate
 * request/response schemas mutated, and assert the guard's exit code. That is
 * the property the acceptance criterion states — "a change to either shape fails
 * `10-validate-contract-conformance`" — rather than a restatement of the file's
 * contents.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { MACHINE_CONTRACT_SET } from './machine-contract-set';

// Repo root is five levels up from this file: src/packages/contracts/src/schemas
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
const MANIFEST_PATH = join(REPO_ROOT, 'src', 'rulesets', 'contracts', 'evolith-machine-contracts.json');
const GUARD_PATH = join(REPO_ROOT, '.harness', 'scripts', 'ci', '10-validate-contract-conformance.mjs');
const CLI_PACKAGE_PATH = join(REPO_ROOT, 'src', 'sdk', 'cli', 'package.json');

interface ProducerSchema {
  id: string;
  version: string;
  path: string;
  sha256: string;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
  contractVersion: string;
  schemas: ProducerSchema[];
};

/** The pair GT-573 adds: what a consumer SENDS and what the Core RETURNS. */
const EVALUATE_CONTRACT_IDS = ['evaluation-context', 'evaluation-result'] as const;

/**
 * Materialise the minimum tree the guard resolves against, so the mutation cases
 * never touch the working copy. `EVOLITH_CONTRACT_ROOT` is the guard's own
 * override — the script itself is executed in place, untouched.
 */
function stageRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'gt573-contract-'));
  const copyInto = (relative: string): void => {
    const target = join(root, relative);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(REPO_ROOT, relative), target);
  };

  copyInto('src/rulesets/contracts/evolith-machine-contracts.json');
  copyInto('src/sdk/cli/package.json');
  // GT-688: the guard now also compares the PUBLISHED "Pinned schemas" tables to
  // the manifest — the tables kept advertising `evaluation-result` at 1.1.0
  // after the schema went to 2.0.0, and nothing failed. They are part of the
  // minimum tree because the guard resolves them; a `stageRoot` that omitted
  // them would test a guard weaker than the one CI runs.
  copyInto('src/rulesets/contracts/README.md');
  copyInto('src/rulesets/contracts/README.es.md');
  for (const schema of manifest.schemas) copyInto(schema.path);
  return root;
}

function runGuard(root: string): { code: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [GUARD_PATH], {
      cwd: REPO_ROOT,
      env: { ...process.env, EVOLITH_CONTRACT_ROOT: root },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const e = error as { status?: number | null; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('producer machine-contract manifest (GT-573 AC3)', () => {
  it('has the guard and the CLI producer descriptor on disk (no silent self-skip)', () => {
    expect(existsSync(GUARD_PATH)).toBe(true);
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    expect(existsSync(CLI_PACKAGE_PATH)).toBe(true);
  });

  it('pins the evaluate request and the EvaluationResult, at the same version and hash as the published set', () => {
    for (const id of EVALUATE_CONTRACT_IDS) {
      const producer = manifest.schemas.find((s) => s.id === id);
      expect(producer).toBeDefined();

      const declared = MACHINE_CONTRACT_SET.schemas.find((s) => s.id === id);
      expect(declared).toBeDefined();
      expect(producer!.version).toBe(declared!.version);
      expect(producer!.sha256).toBe(declared!.sha256);
    }
  });

  // The direction the pre-existing parity spec does NOT cover: every schema the
  // published package advertises must also exist in the file the guard reads.
  it('pins every schema the published contract set advertises', () => {
    const producerIds = manifest.schemas.map((s) => s.id).sort();
    const declaredIds = MACHINE_CONTRACT_SET.schemas.map((s) => s.id).sort();
    expect(producerIds).toEqual(declaredIds);
  });

  describe('the pin has teeth: 10-validate-contract-conformance', () => {
    const roots: string[] = [];
    const stage = (): string => {
      const root = stageRoot();
      roots.push(root);
      return root;
    };

    afterAll(() => {
      for (const root of roots) rmSync(root, { recursive: true, force: true });
    });

    // Differential control. Without it, a mutation test proves only that the
    // guard fails, not that it fails BECAUSE of the mutation.
    it('accepts the staged tree unmodified', () => {
      const { code, output } = runGuard(stage());
      expect(output).toContain(`${manifest.schemas.length} schema(s)`);
      expect(code).toBe(0);
    });

    it.each(EVALUATE_CONTRACT_IDS)('rejects a change to the %s shape', (id) => {
      const schema = manifest.schemas.find((s) => s.id === id);
      // Stated as an assertion, not a `!`: when the manifest stops pinning the
      // schema the failure must read "not pinned", not "cannot read 'path'".
      expect(schema && schema.path).toEqual(expect.stringContaining(`${id}.schema.json`));

      const root = stage();
      const target = join(root, schema!.path);

      // A realistic drift: one more optional property reaches consumers. Bytes
      // change, so the declared sha256 no longer describes what is shipped.
      const mutated = JSON.parse(readFileSync(target, 'utf8')) as {
        properties: Record<string, unknown>;
      };
      mutated.properties.__unpinnedDrift = { type: 'string' };
      writeFileSync(target, `${JSON.stringify(mutated, null, 2)}\n`);

      const { code, output } = runGuard(root);
      expect(output).toContain(`Schema hash mismatch: ${id}`);
      expect(code).toBe(1);
    });

    /**
     * GT-688 — the drift this guard could NOT see.
     *
     * `evaluation-result` went to 2.0.0 in the manifest, the fixture and the
     * TypeScript constant; the two "Pinned schemas" tables kept publishing
     * 1.1.0 and every check stayed green, because the guard hashed schema FILES
     * and never read the document consumers actually integrate from.
     */
    it.each(['README.md', 'README.es.md'])(
      'rejects a %s that publishes a version the manifest does not pin',
      (readme) => {
        const root = stage();
        const target = join(root, 'src', 'rulesets', 'contracts', readme);
        const pinned = manifest.schemas.find((s) => s.id === 'evaluation-result');
        expect(pinned && pinned.version).toEqual(expect.stringMatching(/^\d+\.\d+\.\d+$/));

        const text = readFileSync(target, 'utf8');
        const stale = text.replace(
          new RegExp(`(\\|\\s*\`evaluation-result\`\\s*\\|\\s*)${pinned!.version.replace(/\./g, '\\.')}`),
          '$10.0.1',
        );
        // The table row must actually have changed, or the case proves nothing.
        expect(stale).not.toEqual(text);
        writeFileSync(target, stale);

        const { code, output } = runGuard(root);
        expect(output).toContain(`publishes evaluation-result at 0.0.1`);
        expect(code).toBe(1);
      },
    );
  });
});
