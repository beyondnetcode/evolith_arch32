#!/usr/bin/env node

/**
 * GT-621 — negative fixtures for the port-inventory guard.
 *
 * The defect: a diagram published "AgentRuntimeService — 12 hexagonal ports · 30
 * adapters". The numbers were stale (21 interfaces, 53 adapter files at the time
 * of writing) AND the sentence read as delivered capability when it described a
 * declared surface — eleven of those ports are reachable from the runtime, the
 * rest are seams with adapters and no consumer.
 *
 * Each test here puts the guard in a state where it MUST go red. A guard nobody
 * has seen fail is the defect this board keeps finding in itself.
 */

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '45-validate-port-inventory-honesty.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt621-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const PORTS = `
export interface IHarnessPort { run(): void; }
export interface ISkillRegistryPort { list(): void; }
export interface ISchedulerPort { schedule(): void; }
`;

const DEPS = `
export interface AgentRuntimeDeps {
  readonly harness: IHarnessPort;
  readonly skillRegistry: ISkillRegistryPort;
}
`;

/** @param {{ports?: string, deps?: string, adapters?: number, doc?: string}} files */
function fixture(name, files = {}) {
  const root = join(sandbox, name);
  const portsDir = join(root, 'src/packages/agent-runtime/src/domain/ports');
  const adaptersDir = join(root, 'src/packages/agent-runtime/src/adapters');
  const appDir = join(root, 'src/packages/agent-runtime/src/application');
  const docDir = join(root, 'reference/core/sdlc/assets');
  for (const d of [portsDir, adaptersDir, appDir, docDir]) mkdirSync(d, { recursive: true });

  if (files.ports !== undefined) writeFileSync(join(portsDir, 'ports.ts'), files.ports);
  if (files.deps !== undefined) writeFileSync(join(appDir, 'agent-runtime-deps.ts'), files.deps);
  for (let i = 0; i < (files.adapters ?? 2); i += 1) {
    writeFileSync(join(adaptersDir, `a${i}.adapter.ts`), 'export class A {}');
  }
  if (files.doc !== undefined) writeFileSync(join(docDir, 'master-view.svg'), files.doc);
  return root;
}

const run = (root) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root], { encoding: 'utf8', timeout: 60000 });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

describe('45-validate-port-inventory-honesty', () => {
  test('THE defect: a bare count with no split turns it RED', () => {
    const root = fixture('bare-count', {
      ports: PORTS, deps: DEPS,
      doc: '<svg><text>AgentRuntimeService — 12 hexagonal ports · 30 adapters</text></svg>',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /without saying how many are actually reached/);
    assert.match(out, /2 of 3 ports are on the hot path/);
  });

  test('an annotation that DISAGREES with the code turns it RED', () => {
    // The diagram already rotted once by carrying hand-typed numbers.
    const root = fixture('stale-annotation', {
      ports: PORTS, deps: DEPS,
      doc: '<!-- port-inventory: 12 hot / 30 declared -->\n<svg><text>12 ports</text></svg>',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /but the code says 2 hot \/ 3 declared/);
  });

  test('an annotation that agrees with the code passes', () => {
    const root = fixture('honest', {
      ports: PORTS, deps: DEPS,
      doc: '<!-- port-inventory: 2 hot / 3 declared -->\n<svg><text>2 of 3 ports on the hot path</text></svg>',
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /state what the runtime actually reaches/);
  });

  test('a document publishing no count needs no annotation', () => {
    const root = fixture('no-count', {
      ports: PORTS, deps: DEPS,
      doc: '<svg><text>AgentRuntimeService</text></svg>',
    });
    assert.equal(run(root).status, 0);
  });

  // --- anti-vacuous: nothing parsed is never a pass -------------------------

  test('zero ports parsed is RED, not "no violations"', () => {
    const root = fixture('no-ports', { ports: '', deps: DEPS, doc: '<svg/>' });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO port interfaces/);
  });

  test('a deps shape it cannot parse is RED — the hot path must be DERIVED', () => {
    // If the guard cannot derive the hot path it must refuse, never fall back to
    // treating every declared port as reached.
    const root = fixture('no-deps', { ports: PORTS, deps: 'export type Nothing = never;', doc: '<svg/>' });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO required dependencies/);
  });

  test('zero adapters is RED', () => {
    const root = fixture('no-adapters', { ports: PORTS, deps: DEPS, adapters: 0, doc: '<svg/>' });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /ZERO adapters/);
  });

  test('a missing scan corpus is RED — the tracked document moving must not go quiet', () => {
    const root = fixture('no-doc', { ports: PORTS, deps: DEPS });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /scan corpus moved and nothing was checked/);
  });

  test('the real repository: the guard is armed and the split is published', () => {
    const { status, out } = run(resolve(__dirname, '../../..'));
    assert.equal(status, 0, out);
    assert.match(out, /on the hot path/);
    assert.match(out, /declared, not reached/);
  });
});
