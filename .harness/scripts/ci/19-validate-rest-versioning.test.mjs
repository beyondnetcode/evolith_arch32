import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(
  new URL('./19-validate-rest-versioning.mjs', import.meta.url),
);

function runIn(cwd) {
  return spawnSync('node', [scriptPath], { cwd, encoding: 'utf8' });
}

function setupFixture(structure) {
  const root = mkdtempSync(join(tmpdir(), 'rest-versioning-'));
  const ctrlDir = join(root, 'apps/core-api/src/presentation/controllers');
  mkdirSync(ctrlDir, { recursive: true });
  for (const [name, content] of Object.entries(structure)) {
    writeFileSync(join(ctrlDir, name), content);
  }
  return root;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';

test('passes when controllers declare version explicitly', () => {
  const root = setupFixture({
    'gates.controller.ts': `import { Controller } from '@nestjs/common';
@Controller({ path: 'gates', version: '1' })
export class GatesController {}`,
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /passed for 1 controllers/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('passes when VERSION_NEUTRAL carries a justification comment', () => {
  const root = setupFixture({
    'health.controller.ts': `import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
// version-neutral-justification: k8s probes need a stable URI.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {}`,
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails on a plain @Controller(string) without version', () => {
  const root = setupFixture({
    'legacy.controller.ts': `import { Controller } from '@nestjs/common';
@Controller('legacy')
export class LegacyController {}`,
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /must declare `version`/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails on VERSION_NEUTRAL without justification', () => {
  const root = setupFixture({
    'orphan.controller.ts': `import { Controller, VERSION_NEUTRAL } from '@nestjs/common';
@Controller({ path: 'orphan', version: VERSION_NEUTRAL })
export class OrphanController {}`,
  });
  try {
    const out = runIn(root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /version-neutral-justification/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
