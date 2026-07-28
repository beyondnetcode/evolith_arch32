/**
 * GT-571 — regression tests for the clean-room install guard.
 *
 * These encode the exact defect that shipped as `@beyondnet/evolith-cli@1.2.0`: the
 * built `dist` deep-imports `@beyondnet/evolith-core-domain/application/paths/rulesets-location`,
 * the declared range `^1.1.0` resolves on the registry to a core-domain that does not
 * ship that module, and every invocation of the published binary — including
 * `--version` — dies with MODULE_NOT_FOUND. In the workspace the same specifier
 * resolves through a symlink, which is why every local check was green.
 *
 * Each test is a negative fixture first: a guard that has never been shown failing is
 * indistinguishable from a guard that cannot fail. The fixtures are synthetic install
 * trees passed via `--tree`, so the suite stays offline and hermetic.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

const GUARD = resolve(__dirname, '../../scripts/check-install-smoke.mjs');

let sandbox: string;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'evolith-smoke-spec-'));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function writeFile(abs: string, content: string): void {
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/**
 * Build a synthetic install tree.
 *
 * @param name unique fixture name
 * @param cliDistFiles files under `node_modules/@beyondnet/evolith-cli/dist`
 * @param coreDomainDistFiles files under `node_modules/@beyondnet/evolith-core-domain/dist`
 */
function tree(
  name: string,
  cliDistFiles: Record<string, string>,
  coreDomainDistFiles: Record<string, string>,
): string {
  const root = join(sandbox, name);
  const cli = join(root, 'node_modules', '@beyondnet', 'evolith-cli');
  const core = join(root, 'node_modules', '@beyondnet', 'evolith-core-domain');

  writeFile(
    join(cli, 'package.json'),
    JSON.stringify({
      name: '@beyondnet/evolith-cli',
      version: '9.9.9',
      main: 'dist/main.js',
      dependencies: { '@beyondnet/evolith-core-domain': '^1.1.0' },
    }),
  );
  for (const [rel, content] of Object.entries(cliDistFiles)) {
    writeFile(join(cli, 'dist', rel), content);
  }

  writeFile(
    join(core, 'package.json'),
    JSON.stringify({
      name: '@beyondnet/evolith-core-domain',
      version: '1.1.0',
      main: 'dist/index.js',
      exports: { '.': './dist/index.js', './*': './dist/*.js' },
    }),
  );
  for (const [rel, content] of Object.entries(coreDomainDistFiles)) {
    writeFile(join(core, 'dist', rel), content);
  }

  return root;
}

function runGuard(root: string): { status: number | null; out: string } {
  const res = spawnSync(process.execPath, [GUARD, '--tree', root, '--no-boot'], {
    encoding: 'utf8',
  });
  return { status: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const CLI_MAIN = `
require("@beyondnet/evolith-core-domain");
const { probeRulesetsLocation } = require("@beyondnet/evolith-core-domain/application/paths/rulesets-location");
module.exports = { probeRulesetsLocation };
`;

describe('check-install-smoke (GT-571)', () => {
  it('fails when a deep subpath the dist imports is absent from the installed dependency', () => {
    // Reproduces @beyondnet/evolith-cli@1.2.0 exactly: the package resolves, the
    // subpath does not, because the registry's core-domain predates that module.
    const root = tree('missing-subpath', { 'main.js': CLI_MAIN }, { 'index.js': 'module.exports = {};' });

    const { status, out } = runGuard(root);

    expect(status).toBe(1);
    expect(out).toContain('@beyondnet/evolith-core-domain/application/paths/rulesets-location');
    expect(out).toContain('do NOT resolve in a clean install');
  });

  it('passes when every imported specifier resolves in the installed tree', () => {
    const root = tree(
      'complete',
      { 'main.js': CLI_MAIN },
      {
        'index.js': 'module.exports = {};',
        'application/paths/rulesets-location.js': 'module.exports = { probeRulesetsLocation() { return null; } };',
      },
    );

    const { status, out } = runGuard(root);

    expect(status).toBe(0);
    expect(out).toContain('specifier(s) resolve in the clean install');
  });

  it('refuses to pass vacuously when the scan finds no workspace specifiers at all', () => {
    // A dist that moved, or a tarball that shipped without it, must not read as
    // "no violations" — the guard did not verify anything.
    const root = tree('vacuous', { 'main.js': 'module.exports = {};' }, { 'index.js': 'module.exports = {};' });

    const { status, out } = runGuard(root);

    expect(status).toBe(1);
    expect(out).toContain('ZERO @beyondnet/* specifiers');
  });

  it('fails when the package is not present in the installed tree at all', () => {
    const root = join(sandbox, 'empty');
    mkdirSync(root, { recursive: true });

    const { status, out } = runGuard(root);

    expect(status).toBe(1);
    expect(out).toContain('is not present in');
  });
});
