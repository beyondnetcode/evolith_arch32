/**
 * The Core as COMMITTED, in a temporary directory: every tracked file (with local
 * modifications), nothing untracked, plus the compiled bundle the evaluator needs.
 *
 * Why the engine-parity guards measure this and not the working tree (GT-716 AC3,
 * AC5): the first CI run of guard 73 disagreed with the laptop that wrote its
 * baseline — a local `coverage/` directory decided two rules, git history a third,
 * and a run without `--core` resolved the ADR-conformance rules against the CLI's
 * bundled corpus copy and failed 138 of them falsely. None of that is the corpus.
 * An export of `git ls-files` is the same tree on every machine, and `--core`
 * pointed at it makes both engines read the same Core.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export const CLI_ENTRY = 'src/sdk/cli/dist/main.js';
export const WASM_CANDIDATES = ['src/rulesets/opa/policy.wasm', 'src/sdk/cli/rulesets/opa/policy.wasm'];

/**
 * @param {string} root  the repository
 * @param {string} [prefix]  the temp-dir prefix, so a leftover names its owner
 * @returns {string} the export's directory; the caller removes it
 */
export function exportCore(root, prefix = 'evolith-core-export-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const listed = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  const archive = execFileSync('tar', ['-c', '--null', '-T', '-', '-f', '-'], { cwd: root, input: listed, maxBuffer: 1024 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-f', '-', '-C', dir], { input: archive, maxBuffer: 1024 * 1024 * 1024 });
  const wasm = WASM_CANDIDATES.find((r) => existsSync(resolve(root, r)));
  if (!wasm) throw new Error(`no compiled bundle under ${root} (build it: npm run build:policy)`);
  for (const rel of WASM_CANDIDATES) {
    mkdirSync(dirname(resolve(dir, rel)), { recursive: true });
    copyFileSync(resolve(root, wasm), resolve(dir, rel));
  }
  if (!existsSync(join(dir, 'src', 'rulesets', 'schema', 'facets.json'))) {
    throw new Error(`the export at ${dir} has no corpus vocabulary — \`git ls-files\` produced an incomplete tree`);
  }
  return dir;
}
