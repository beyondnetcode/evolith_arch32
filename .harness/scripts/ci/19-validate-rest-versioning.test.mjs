#!/usr/bin/env node --test

/**
 * Negative fixtures for `19-validate-rest-versioning.mjs` (GT-159 / ADR-0098).
 *
 * This file used to build a fixture directory and hand it to the guard as `cwd`.
 * GT-556/557 then re-anchored the guard on `REPO_ROOT` from `lib/paths.mjs`, which
 * "deliberately does NOT consult process.cwd()" — so from that commit on, every case
 * here silently scanned THIS repository instead of its own fixture. Three of the four
 * went red; the fourth passed for the wrong reason, asserting only `status === 0` on a
 * repo that happens to be clean. The fixtures also still carried the pre-GT-556 path
 * (`apps/core-api/...`, no `src/` prefix) — the exact literal that commit fixed.
 *
 * The sandbox below is the technique `55-validate-wasm-builtin-support.test.mjs` uses:
 * make the fixture repo-SHAPED (all three ROOT_MARKERS) and run a COPY of the guard
 * from inside it, so `lib/paths.mjs` ascends to the sandbox and stops there. Copying
 * rather than symlinking is deliberate — Node resolves a symlinked module to its real
 * path, which would put `paths.mjs` back inside this repository and defeat the whole
 * fixture.
 *
 * Run: node --test .harness/scripts/ci/19-validate-rest-versioning.test.mjs
 */

import { cpSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');

const GUARD_REL = '.harness/scripts/ci/19-validate-rest-versioning.mjs';
const LIB_REL = '.harness/scripts/lib';

// `coreApiControllers` in lib/paths.mjs. Kept as one literal so a future move breaks
// this file loudly at the fixture rather than quietly turning the cases vacuous.
const CONTROLLERS_REL = 'src/apps/core-api/src/presentation/controllers';

/**
 * A repo-shaped sandbox holding a copy of the guard, a copy of `lib/`, and the given
 * controllers.
 *
 * @param {Record<string,string>} controllers filename -> file contents
 * @returns {string} absolute path to the sandbox root
 */
function sandbox(controllers) {
  // realpath FIRST: on macOS `os.tmpdir()` is a symlink, and the guard prints paths
  // relative to REPO_ROOT by string prefix.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'rest-versioning-')));

  // ROOT_MARKERS from lib/paths.mjs — package.json, .harness, evolith.yaml — so
  // findRepoRoot() stops here instead of ascending into this repository.
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify({ name: 'rest-versioning-fixture', private: true }, null, 2)}\n`,
  );
  writeFileSync(join(root, 'evolith.yaml'), 'version: 1\n');

  mkdirSync(join(root, dirname(GUARD_REL)), { recursive: true });
  cpSync(join(REPO_ROOT, GUARD_REL), join(root, GUARD_REL));
  cpSync(join(REPO_ROOT, LIB_REL), join(root, LIB_REL), { recursive: true });

  const ctrlDir = join(root, CONTROLLERS_REL);
  mkdirSync(ctrlDir, { recursive: true });
  for (const [name, content] of Object.entries(controllers)) {
    writeFileSync(join(ctrlDir, name), content);
  }

  return root;
}

/** Run the sandbox's copy of the guard. */
function runGuard(root) {
  const res = spawnSync(process.execPath, [join(root, GUARD_REL)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/** Run `body` against a sandbox and always clean up. */
function withSandbox(controllers, body) {
  const root = sandbox(controllers);
  try {
    body(runGuard(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// The guard, end to end
// ---------------------------------------------------------------------------

test('passes when controllers declare version explicitly', () => {
  withSandbox(
    {
      'gates.controller.ts': `import { Controller } from '@nestjs/common';
@Controller({ path: 'gates', version: '1' })
export class GatesController {}`,
    },
    (out) => {
      assert.equal(out.status, 0, out.stdout + out.stderr);
      // The count proves the guard read the FIXTURE. Before the sandbox this said
      // "11 controllers" — this repository's, not the one controller written above.
      assert.match(out.stdout, /passed for 1 controllers/);
    },
  );
});

test('passes when VERSION_NEUTRAL carries a justification comment', () => {
  withSandbox(
    {
      'health.controller.ts': `import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
// version-neutral-justification: k8s probes need a stable URI.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {}`,
    },
    (out) => {
      assert.equal(out.status, 0, out.stdout + out.stderr);
      assert.match(out.stdout, /passed for 1 controllers/);
    },
  );
});

test('fails on a plain @Controller(string) without version', () => {
  withSandbox(
    {
      'legacy.controller.ts': `import { Controller } from '@nestjs/common';
@Controller('legacy')
export class LegacyController {}`,
    },
    (out) => {
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /must declare `version`/);
    },
  );
});

test('fails on VERSION_NEUTRAL without justification', () => {
  withSandbox(
    {
      'orphan.controller.ts': `import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
@Controller({ path: 'orphan', version: VERSION_NEUTRAL })
export class OrphanController {}`,
    },
    (out) => {
      assert.equal(out.status, 1, out.stdout + out.stderr);
      assert.match(out.stderr, /version-neutral-justification/);
    },
  );
});

// The coverage guard is part of the contract: a controllers directory that exists but
// holds nothing must fail rather than report a green "0 controllers".
test('fails when the controllers directory is empty', () => {
  withSandbox({}, (out) => {
    assert.equal(out.status, 1, out.stdout + out.stderr);
    assert.match(out.stderr, /ZERO REST controllers|coverage/i);
  });
});
