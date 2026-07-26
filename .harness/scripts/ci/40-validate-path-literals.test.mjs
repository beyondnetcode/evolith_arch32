/**
 * GT-578 — tests for the path-literal guard.
 *
 * The load-bearing cases are the NEGATIVE ones: a fixture carrying a dead path
 * literal that the guard MUST reject. A guard without one of these is exactly
 * the failure mode GT-578 exists to remove — it can rot into a no-op and nobody
 * would notice, because a no-op guard is indistinguishable from a green one.
 *
 * The two negative fixtures reproduce the real live defects verbatim:
 *   - a workflow `run:` invoking a script that moved into a subdirectory
 *   - an argv array naming a pre-refactor `packages/...` path
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./40-validate-path-literals.mjs', import.meta.url));
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function runGuard(root, extraArgs = []) {
  return spawnSync('node', [SCRIPT, '--root', root, ...extraArgs], { encoding: 'utf8' });
}

/**
 * A minimal but *complete* fixture: all three scan sources exist, hold files,
 * and hold at least one literal. Anything less trips the anti-vacuous checks,
 * which is precisely what tests 4-6 exercise on purpose.
 */
function makeFixture(overrides = {}, emptyDirs = []) {
  const root = mkdtempSync(join(tmpdir(), 'gt578-path-literals-'));
  const write = (rel, content) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  };

  // A real package tree, so `packages` is a known `src/` child and a dead
  // `packages/...` literal is recognised as a candidate rather than ignored.
  write('src/packages/mcp-server/Dockerfile', 'FROM node:24\n');
  write('src/packages/mcp-server/src/main.ts', 'export {};\n');
  write('src/apps/core-api/src/main.ts', 'export {};\n');

  const files = {
    '.harness/scripts/ok.mjs':
      `import { spawnSync } from 'node:child_process';\n` +
      `spawnSync('node', ['.harness/scripts/ok.mjs', '--check']);\n`,
    '.github/workflows/ci.yml':
      `name: ci\njobs:\n  build:\n    steps:\n      - name: run\n        run: |\n` +
      `          node .harness/scripts/ok.mjs\n`,
    'product/infra/docker-compose.yml':
      `services:\n  mcp:\n    build:\n      context: ../..\n` +
      `      dockerfile: src/packages/mcp-server/Dockerfile\n`,
    ...overrides,
  };

  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue; // caller asked for the file to be absent
    write(rel, content);
  }
  // Directories a caller wants present but empty.
  for (const rel of emptyDirs) mkdirSync(join(root, rel), { recursive: true });
  return root;
}

function withFixture(overrides, fn, emptyDirs = []) {
  const root = makeFixture(overrides, emptyDirs);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// --- NEGATIVE: the guard must turn red -------------------------------------

test('NEGATIVE — rejects a workflow run: step invoking a script that moved', () => {
  withFixture(
    {
      '.github/workflows/ci.yml':
        `name: ci\njobs:\n  review:\n    steps:\n      - name: Run Winston review\n        run: |\n` +
        `          if [ -z "$KEY" ]; then\n            exit 0\n          fi\n` +
        `          node .harness/scripts/ci/13-agentic-code-review.mjs\n`,
      // the real script lives one directory deeper — exactly the live defect
      '.harness/scripts/ci/agentic/13-agentic-code-review.mjs': 'export {};\n',
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /dead path literal/);
      assert.match(out.stderr, /13-agentic-code-review\.mjs/);
      assert.match(out.stderr, /\[workflow-run\]/);
      // It must name the trap: a live ancestor is why this failed silently.
      assert.match(out.stderr, /ancestor "\.harness\/scripts\/ci\/" DOES exist/);
    },
  );
});

test('NEGATIVE — rejects a pre-refactor argv path whose build output is absent', () => {
  withFixture(
    {
      '.harness/scripts/ok.mjs':
        `const transport = new StdioClientTransport({\n` +
        `  command: process.execPath,\n` +
        `  args: ["packages/mcp-server/dist/main.js"]\n` +
        `});\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /\[harness-scripts\]/);
      assert.match(out.stderr, /packages\/mcp-server\/dist\/main\.js/);
      // dist/ may legitimately be unbuilt; the *package* directory may not.
      assert.match(out.stderr, /missing:\s+packages\/mcp-server\b/);
      assert.match(out.stderr, /did you mean: src\/packages\/mcp-server/);
    },
  );
});

test('NEGATIVE — rejects a compose dockerfile pointing at a moved path', () => {
  withFixture(
    {
      'product/infra/docker-compose.yml':
        `services:\n  mcp:\n    build:\n      context: ../..\n` +
        `      dockerfile: packages/mcp-server/Dockerfile\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /\[infra-config\]/);
      assert.match(out.stderr, /packages\/mcp-server\/Dockerfile/);
    },
  );
});

test('NEGATIVE — a constant bound to a dead path and spawned is rejected', () => {
  withFixture(
    {
      '.harness/scripts/ok.mjs':
        `import { spawnSync } from 'node:child_process';\n` +
        `const SCRIPT = join(ROOT, 'apps/core-api/scripts/seed.mjs');\n` +
        `spawnSync('node', [SCRIPT]);\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /apps\/core-api\/scripts\/seed\.mjs/);
    },
  );
});

// --- ANTI-VACUOUS: the guard must refuse to pass without a denominator -----

test('ANTI-VACUOUS — a missing scan root fails instead of passing', () => {
  withFixture({ '.github/workflows/ci.yml': null }, root => {
    // remove the whole directory, not just the file
    rmSync(join(root, '.github'), { recursive: true, force: true });
    const out = runGuard(root);
    assert.equal(out.status, 1, out.stdout + out.stderr);
    assert.match(out.stderr, /cannot report a verdict/);
    assert.match(out.stderr, /scan root "\.github\/workflows".*does not exist/s);
    assert.doesNotMatch(out.stdout, /Path literals valid/);
  });
});

test('ANTI-VACUOUS — a scan root with zero matching files fails', () => {
  withFixture(
    { '.github/workflows/ci.yml': null },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /found zero \.yml\/\.yaml file\(s\)/);
      assert.match(out.stderr, /must never be reported as "path literals valid"/);
    },
    ['.github/workflows'],
  );
});

test('ANTI-VACUOUS — files present but zero literals extracted fails', () => {
  withFixture(
    {
      '.github/workflows/ci.yml':
        `name: ci\njobs:\n  build:\n    steps:\n      - run: npm test\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /extracted\s*\n?\s*zero path literals/);
      assert.match(out.stderr, /the denominator is zero and the pass would be vacuous/);
    },
  );
});

// --- POSITIVE and false-positive control ------------------------------------

test('passes a fixture whose literals all resolve, and publishes the denominator', () => {
  withFixture({}, root => {
    const out = runGuard(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /✓ Path literals valid/);
    const m = /(\d+) path literal\(s\) checked across (\d+) file\(s\)/.exec(out.stdout);
    assert.ok(m, `denominator not published: ${out.stdout}`);
    assert.ok(Number(m[1]) > 0, 'denominator must be greater than zero');
    // Every source must contribute, and the per-source breakdown must be shown.
    assert.match(out.stdout, /harness-scripts: \d+\/\d+f/);
    assert.match(out.stdout, /workflow-run: \d+\/\d+f/);
    assert.match(out.stdout, /infra-config: \d+\/\d+f/);
  });
});

test('tolerates an unbuilt build output whose source directory exists', () => {
  withFixture(
    {
      '.harness/scripts/ok.mjs':
        `import { spawnSync } from 'node:child_process';\n` +
        `spawnSync('node', ['src/packages/mcp-server/dist/main.js']);\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 0, out.stdout + out.stderr);
    },
  );
});

test('does not flag write targets, shell variables, globs or container paths', () => {
  withFixture(
    {
      '.github/workflows/ci.yml':
        `name: ci\njobs:\n  build:\n    steps:\n      - run: |\n` +
        `          mkdir -p reference/generated/out\n` +
        `          node .harness/scripts/ok.mjs > reference/generated/out/report.json\n` +
        `          node "$SCRIPT_DIR/whatever.mjs"\n` +
        `          node \${{ env.TOOL }}/run.mjs\n` +
        `          cp docs/*.md reference/generated/out/\n` +
        `          docker run -v /app/corpus:/app/corpus img\n` +
        `          npx --yes @beyondnet/evolith-cli --help\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 0, out.stdout + out.stderr);
    },
  );
});

test('cross-repo literals that escape the root are external, not violations', () => {
  withFixture(
    {
      'product/infra/docker-compose.yml':
        `services:\n  tracker:\n    build:\n      context: ../../../evolith_tracker/src\n` +
        `      dockerfile: apps/tracker-api/Dockerfile\n`,
    },
    root => {
      const out = runGuard(root, ['--verbose']);
      assert.equal(out.status, 0, out.stdout + out.stderr);
      assert.match(out.stdout, /resolve outside the repo root/);
    },
  );
});

test('an escaped literal whose in-repo twin exists is warned about, not ignored', () => {
  withFixture(
    {
      'product/infra/docker-compose.yml':
        `services:\n  mcp:\n    build:\n      context: ../..\n` +
        `      dockerfile: src/packages/mcp-server/Dockerfile\n` +
        `    volumes:\n      - ../../../packages:/app/packages:ro\n`,
    },
    root => {
      const out = runGuard(root);
      assert.equal(out.status, 0, out.stdout + out.stderr);
      assert.match(out.stderr, /escape the repo root but their in-repo twin exists/);
      assert.match(out.stderr, /in-repo twin: src\/packages/);
    },
  );
});

// --- Mode semantics ---------------------------------------------------------

test('report mode exits 0 but never claims a pass', () => {
  withFixture(
    {
      '.harness/scripts/ok.mjs':
        `import { spawnSync } from 'node:child_process';\n` +
        `spawnSync('node', ['packages/mcp-server/dist/main.js']);\n`,
    },
    root => {
      const out = runGuard(root, ['--report']);
      assert.equal(out.status, 0, out.stdout + out.stderr);
      assert.match(out.stderr, /REPORT MODE/);
      assert.match(out.stderr, /This is NOT a pass/);
      assert.doesNotMatch(out.stdout, /Path literals valid/);
    },
  );
});

test('report mode still fails on a vacuous scan — a zero denominator is never OK', () => {
  withFixture(
    { '.github/workflows/ci.yml': null },
    root => {
      const out = runGuard(root, ['--report']);
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /cannot report a verdict/);
    },
    ['.github/workflows'],
  );
});

// --- The guard against the real repository ---------------------------------

test('against the real repository it scans a non-empty denominator', () => {
  const out = spawnSync('node', [SCRIPT, '--root', REPO_ROOT], { encoding: 'utf8' });
  const text = out.stdout + out.stderr;
  const m = /(\d+) path literal\(s\) checked across (\d+) file\(s\)/.exec(text);
  assert.ok(m, `guard did not publish a denominator:\n${text}`);
  assert.ok(Number(m[1]) > 0, `zero literals checked in the real repo:\n${text}`);
  assert.ok(Number(m[2]) > 0, `zero files scanned in the real repo:\n${text}`);
  // Exit code tracks findings; it must never be anything other than 0 or 1.
  assert.ok(out.status === 0 || out.status === 1, `unexpected exit ${out.status}:\n${text}`);
});
