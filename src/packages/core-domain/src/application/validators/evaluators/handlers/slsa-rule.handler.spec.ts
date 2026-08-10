import { SlsaRuleHandler } from './slsa-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../evaluator.interface';

/**
 * GT-665 — fixtures for the SLSA Build track pack.
 *
 * Every rule is exercised in BOTH directions. A standards pack that only ever
 * passes is a certificate rather than a check, and this repository keeps finding
 * hollow gates precisely because the red direction was assumed instead of
 * observed. Two fixtures are taken from real history rather than invented:
 *
 *  - the `--tag beta` publish that carried no provenance while the main path did
 *    (retired by GT-570 on 2026-07-27, and the reason `SLSA-PROV-L1` is written
 *    per STEP rather than per file);
 *  - `id-token: write` granted to a job that does NOT publish, which a file-level
 *    match certifies — the same defect GT-600 shipped twice in the SSDF pack.
 */

/** Minimal in-memory filesystem: enough surface for the handler, nothing more. */
function fsFrom(files: Record<string, string>) {
  const has = (p: string) => Object.prototype.hasOwnProperty.call(files, p);
  return {
    readFile: async (p: string) => {
      if (!has(p)) throw new Error(`ENOENT ${p}`);
      return files[p];
    },
    readFileBuffer: async () => Buffer.from(''),
    writeFile: async () => undefined,
    exists: async (p: string) => has(p) || Object.keys(files).some((f) => f.startsWith(`${p}/`)),
    existsSync: (p: string) => has(p),
    readJson: async (p: string) => {
      if (!has(p)) throw new Error(`ENOENT ${p}`);
      return JSON.parse(files[p]);
    },
    writeJson: async () => undefined,
    mkdir: async () => undefined,
    readdir: async () => [],
    readdirNames: async (p: string) =>
      [...new Set(
        Object.keys(files)
          .filter((f) => f.startsWith(`${p}/`))
          .map((f) => f.slice(p.length + 1).split('/')[0]),
      )],
    copy: async () => undefined,
    ensureDir: async () => undefined,
    ensureFile: async () => undefined,
    stat: async () => ({ isDirectory: () => false, isFile: () => true }),
    remove: async () => undefined,
  } as never;
}

const rule = (id: string): NormalizedRule => ({ id, severity: 'MUST', title: id } as NormalizedRule);
const ctx = { satellitePath: '/w' } as WorkspaceEvaluationContext;
const run = (files: Record<string, string>, id: string) =>
  new SlsaRuleHandler(fsFrom(files)).evaluate(rule(id), ctx);

/**
 * A workspace shaped like this repository's real release path: workflow-level
 * permissions in one file, job-level in the other, both building before they
 * publish and both carrying `--provenance`.
 */
const COMPLIANT: Record<string, string> = {
  '/w/package.json': JSON.stringify({
    name: 'root',
    workspaces: ['src/packages/*', 'src/sdk/cli'],
    scripts: { build: 'tsc -b', test: 'jest' },
  }),
  '/w/src/packages/core/package.json': JSON.stringify({ name: '@x/core', scripts: { build: 'tsc' } }),
  '/w/src/sdk/cli/package.json': JSON.stringify({ name: '@x/cli', scripts: { build: 'tsc' } }),
  '/w/.github/workflows/npm-release.yml': [
    'permissions:',
    '  contents: read',
    '  id-token: write',
    'jobs:',
    '  release:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: npm ci',
    '      - run: npm run build',
    '      - run: npm publish --provenance --access public',
    '',
  ].join('\n'),
  '/w/.github/workflows/sdk-cli-release.yml': [
    'jobs:',
    '  build-and-test:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: npm run build',
    '  publish-npm:',
    '    runs-on: ubuntu-latest',
    '    permissions:',
    '      contents: read',
    '      id-token: write',
    '    steps:',
    '      - run: npm run build',
    '      - run: npm publish --provenance --access public',
    '',
  ].join('\n'),
};

const withoutWorkflows = () => {
  const copy = { ...COMPLIANT };
  delete copy['/w/.github/workflows/npm-release.yml'];
  delete copy['/w/.github/workflows/sdk-cli-release.yml'];
  return copy;
};

describe('SlsaRuleHandler', () => {
  it('claims only SLSA-* rules', () => {
    const h = new SlsaRuleHandler(fsFrom({}));
    expect(h.canHandle(rule('SLSA-PROV-L1'))).toBe(true);
    expect(h.canHandle(rule('SSDF-PW.4.1'))).toBe(false);
    expect(h.canHandle(rule('ISO5055-SEC'))).toBe(false);
  });

  it('a declared rule with no handler branch is skipped as BACKLOG, never as passed', async () => {
    const r = await run(COMPLIANT, 'SLSA-PROV-L4');
    expect(r.result).toBe('skipped');
    expect(r.evaluability).toBe('unimplemented-native');
  });

  describe('SLSA-PROV-L1 — every publishing path, not just the main one', () => {
    it('every step carrying --provenance is green', async () => {
      const r = await run(COMPLIANT, 'SLSA-PROV-L1');
      expect(r.result).toBe('passed');
      expect(r.message).toMatch(/all 2 publishing step\(s\)/);
    });

    it('THE CASE, from real history: a SECOND publish path with no provenance is RED even though the main one has it', async () => {
      // `ci-cd.yml` published `src/sdk/cli` a second time with `--tag beta` and
      // no provenance until GT-570 retired that job on 2026-07-27. A per-FILE
      // check passes this repository; only a per-STEP check finds it.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/ci-cd.yml'] = [
        'jobs:',
        '  publish-npm:',
        '    permissions:',
        '      id-token: write',
        '    steps:',
        '      - run: npm run build',
        '      - run: npm publish --tag beta --access public',
        '',
      ].join('\n');
      const r = await run(files, 'SLSA-PROV-L1');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/--tag beta/);
      expect(r.message).toMatch(/distributes unattested artifacts/);
    });

    it('a `--dry-run` rehearsal is not held to a distribution requirement', async () => {
      // npm-release.yml's dry run IS its safety model. Failing it would report a
      // control as a defect.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/rehearse.yml'] = [
        'jobs:',
        '  r:',
        '    steps:',
        '      - run: npm publish --dry-run --access public',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-PROV-L1')).result).toBe('passed');
    });

    it('THE REGRESSION, observed on the first run against this repository: a COMMENT about publishing is not a publish step', async () => {
      // `npm-release.yml` explains its own design in prose: "`npm publish` would
      // otherwise ship whatever happens to be in dist/", and "before each `npm
      // publish`, because the loop is in dependency order". The first version of
      // this rule counted both comment lines as publishing steps with no
      // provenance and reported this repository non-compliant — the SSDF pack's
      // RV.1.2 defect, reproduced in a different pack.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        '# Publishes EVERY public workspace to npm, with provenance.',
        '#   * seven packages have no prepublishOnly, so `npm publish` would',
        '#     otherwise ship whatever happens to be in dist/.',
        'permissions:',
        '  id-token: write',
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm run build',
        '      # before each `npm publish`, because the loop is in dependency order',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      const r = await run(files, 'SLSA-PROV-L1');
      expect(r.result).toBe('passed');
      expect(r.message).toMatch(/all 2 publishing step\(s\)/);
    });

    it('a trailing comment on a REAL step leaves the step visible', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'permissions:',
        '  id-token: write',
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm run build',
        '      - run: npm publish --access public # provenance dropped in a refactor',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-PROV-L1')).result).toBe('failed');
    });

    it('no publishing path at all is NOT APPLICABLE, and explicitly not a pass', async () => {
      const r = await run(withoutWorkflows(), 'SLSA-PROV-L1');
      expect(r.result).toBe('skipped');
      expect(r.evaluability).toBe('documentation-only');
      expect(r.message).toMatch(/NOT a pass/);
    });
  });

  describe('SLSA-BUILD-L1 — built by the run that publishes it', () => {
    it('build before publish is green', async () => {
      expect((await run(COMPLIANT, 'SLSA-BUILD-L1')).result).toBe('passed');
    });

    it('THE CASE: publishing with no build in the run is RED — the tarball is whatever dist/ held', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'permissions:',
        '  id-token: write',
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm ci',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      const r = await run(files, 'SLSA-BUILD-L1');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/npm-release\.yml/);
      expect(r.message).toMatch(/attests a run that did not produce it/);
    });

    it('a build AFTER the publish step does not count — order is the whole assertion', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'permissions:',
        '  id-token: write',
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm publish --provenance --access public',
        '      - run: npm run build',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-BUILD-L1')).result).toBe('failed');
    });

    it('names its own scope in the failure, so a false RED is readable as one', async () => {
      // The handler compares text order in one file and does not resolve the
      // `needs:` graph. A rule whose limitation is invisible produces a defect
      // report nobody can act on.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'permissions:',
        '  id-token: write',
        'jobs:',
        '  release:',
        '    needs: build',
        '    steps:',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-BUILD-L1')).message).toMatch(/does not resolve the `needs:` job graph/);
    });

    it('nothing published ⇒ NOT APPLICABLE', async () => {
      expect((await run(withoutWorkflows(), 'SLSA-BUILD-L1')).result).toBe('skipped');
    });
  });

  describe('SLSA-AUTH-L2 — the PUBLISHING job is the one that must be able to sign', () => {
    it('workflow-level and job-level permissions both satisfy it', async () => {
      const r = await run(COMPLIANT, 'SLSA-AUTH-L2');
      expect(r.result).toBe('passed');
      // Both live shapes are named, so a regression on either is legible.
      expect(r.message).toMatch(/npm-release\.yml:release/);
      expect(r.message).toMatch(/sdk-cli-release\.yml:publish-npm/);
    });

    it('THE REGRESSION, observed on the first run against this repository: a trailing comment on the permission is still the permission', async () => {
      // `npm-release.yml` writes `id-token: write # required for npm provenance`.
      // An end-anchored pattern reported the one workflow whose attestation the
      // registry actually serves as unable to sign. A false RED inside a
      // standards pack spends the reader's trust on a defect that is not there.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'permissions:',
        '  contents: read',
        '  id-token: write # required for npm provenance',
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm run build',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-AUTH-L2')).result).toBe('passed');
    });

    it('THE CASE: `id-token: write` on a job that does NOT publish is RED — a file-level match would certify it', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/sdk-cli-release.yml'] = [
        'jobs:',
        '  attest-something-else:',
        '    permissions:',
        '      id-token: write',
        '    steps:',
        '      - run: echo hi',
        '  publish-npm:',
        '    steps:',
        '      - run: npm run build',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      const r = await run(files, 'SLSA-AUTH-L2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/sdk-cli-release\.yml:publish-npm/);
      expect(r.message).toMatch(/produces no provenance, not weaker provenance/);
    });

    it('a publishing job with no permission anywhere is RED', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/npm-release.yml'] = [
        'jobs:',
        '  release:',
        '    steps:',
        '      - run: npm run build',
        '      - run: npm publish --provenance --access public',
        '',
      ].join('\n');
      expect((await run(files, 'SLSA-AUTH-L2')).result).toBe('failed');
    });

    it('a publish step outside a recognised job block fails CLOSED rather than vanishing', async () => {
      // The job split is a text split. A workflow it cannot read must not be
      // silently dropped from the denominator — that is the exact shape of the
      // false green GT-569 removed.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/odd.yml'] = 'jobs:\n    weird:\n        run: npm publish --provenance\n';
      const r = await run(files, 'SLSA-AUTH-L2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/outside a recognised job block/);
    });

    it('nothing published ⇒ NOT APPLICABLE', async () => {
      expect((await run(withoutWorkflows(), 'SLSA-AUTH-L2')).result).toBe('skipped');
    });
  });

  describe('SLSA-HOSTED-L2 — no route that bypasses the hosted platform', () => {
    it('manifests with no publishing script are green, and say how many were read', async () => {
      const r = await run(COMPLIANT, 'SLSA-HOSTED-L2');
      expect(r.result).toBe('passed');
      // root + the glob'd workspace + the literal one.
      expect(r.message).toMatch(/3 package manifest\(s\) inspected/);
    });

    it('THE CASE: a workspace script that publishes is RED — a route that exists gets used', async () => {
      const files = { ...COMPLIANT };
      files['/w/src/sdk/cli/package.json'] = JSON.stringify({
        name: '@x/cli',
        scripts: { build: 'tsc', release: 'npm publish --access public' },
      });
      const r = await run(files, 'SLSA-HOSTED-L2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/"release"/);
      expect(r.message).toMatch(/individual's workstation/);
    });

    it('finds it in the ROOT manifest too', async () => {
      const files = { ...COMPLIANT };
      files['/w/package.json'] = JSON.stringify({
        name: 'root',
        workspaces: ['src/packages/*'],
        scripts: { ship: 'npm publish' },
      });
      expect((await run(files, 'SLSA-HOSTED-L2')).result).toBe('failed');
    });

    it('a `--dry-run` script is not a publishing route', async () => {
      // `check-install-smoke.mjs` runs `npm publish --dry-run` in this
      // repository. Reporting it would be a false positive on a safety check.
      const files = { ...COMPLIANT };
      files['/w/package.json'] = JSON.stringify({
        name: 'root',
        workspaces: ['src/packages/*'],
        scripts: { smoke: 'npm publish --dry-run' },
      });
      expect((await run(files, 'SLSA-HOSTED-L2')).result).toBe('passed');
    });

    it('no package.json ⇒ NOT APPLICABLE, not a pass', async () => {
      const files = { ...COMPLIANT };
      delete files['/w/package.json'];
      const r = await run(files, 'SLSA-HOSTED-L2');
      expect(r.result).toBe('skipped');
      expect(r.message).toMatch(/NOT a pass/);
    });
  });
});
