import { SsdfRuleHandler } from './ssdf-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../evaluator.interface';

/**
 * GT-600 — fixtures for the first standard the engine evaluates.
 *
 * Every rule here is checked in BOTH directions. A standards pack that only ever
 * passes is a certificate, not a check, and the reason this repository keeps
 * finding hollow gates is that the red direction was assumed instead of observed.
 * `PS.3.2` gets the most attention because its failing state — an SBOM generated
 * and discarded — is the one that looks identical to compliance in a workflow file.
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
    readJson: async (p: string) => JSON.parse(files[p]),
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
  new SsdfRuleHandler(fsFrom(files)).evaluate(rule(id), ctx);

/** A workspace that satisfies everything, which each test then breaks in one way. */
const COMPLIANT: Record<string, string> = {
  '/w/package-lock.json': '{}',
  '/w/tsconfig.base.json': JSON.stringify({ compilerOptions: { strict: true } }),
  '/w/SECURITY.md': 'Report via https://github.com/o/r/security/advisories/new',
  '/w/.github/dependabot.yml': 'version: 2',
  '/w/.harness/manifest.yaml': 'capabilities: []',
  '/w/.harness/scripts/ci/01-validate-docs.mjs': '// guard',
  '/w/.github/workflows/ci.yml':
    'on:\n  pull_request:\n    branches: [main]\njobs:\n  a:\n    steps:\n      - run: npm ci\n      - uses: github/codeql-action/analyze@v4\n      - uses: gitleaks/gitleaks-action@v2\n      - run: npm audit --audit-level=high\n',
  '/w/.github/workflows/release.yml':
    'jobs:\n  r:\n    steps:\n      - run: npm ci\n      - run: cyclonedx-npm --output-file sbom.json\n      - uses: actions/upload-artifact@v4\n        with:\n          path: sbom.json\n',
};
const without = (key: string) => {
  const copy = { ...COMPLIANT };
  delete copy[key];
  return copy;
};

describe('SsdfRuleHandler', () => {
  it('claims only SSDF-* rules', () => {
    const h = new SsdfRuleHandler(fsFrom({}));
    expect(h.canHandle(rule('SSDF-PW.4.1'))).toBe(true);
    expect(h.canHandle(rule('DEP-01'))).toBe(false);
  });

  it('a declared rule with no handler branch is skipped as BACKLOG, never as passed', async () => {
    const r = await run(COMPLIANT, 'SSDF-PO.9.9');
    expect(r.result).toBe('skipped');
    expect(r.evaluability).toBe('unimplemented-native');
  });

  describe('PS.3.2 — the SBOM nobody can obtain', () => {
    it('THE CASE: generated and never published is RED', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/release.yml'] =
        'jobs:\n  r:\n    steps:\n      - run: cyclonedx-npm --output-file sbom.json\n';
      const r = await run(files, 'SSDF-PS.3.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/discarded when the job ends/);
    });

    it('generated AND uploaded is green', async () => {
      expect((await run(COMPLIANT, 'SSDF-PS.3.2')).result).toBe('passed');
    });

    it('THE REGRESSION, taken from the real release workflow: uploading something ELSE is not sharing the SBOM', async () => {
      // `sdk-cli-release.yml` generates sbom.json on one line and uploads BINARIES
      // from a different job on another. The first version of this rule asked only
      // whether the file contained an upload step anywhere and passed it — and
      // every release workflow contains `publish`, so the check certified all of
      // them. The hand-verified mapping said NOT IMPLEMENTED and was right.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/release.yml'] = [
        'jobs:',
        '  build:',
        '    steps:',
        '      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json',
        '  publish-npm:',
        '    steps:',
        '      - run: npm publish --provenance --access public',
        '  package-binaries:',
        '    steps:',
        '      - uses: actions/upload-artifact@v7',
        '        with:',
        '          path: dist/binaries/',
        '',
      ].join('\n');
      const r = await run(files, 'SSDF-PS.3.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/discarded when the job ends/);
    });

    it('the same workflow passes once the upload names the SBOM itself', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/release.yml'] = [
        'jobs:',
        '  build:',
        '    steps:',
        '      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json',
        '      - uses: actions/upload-artifact@v7',
        '        with:',
        '          path: sbom.json',
        '',
      ].join('\n');
      expect((await run(files, 'SSDF-PS.3.2')).result).toBe('passed');
    });

    it('no SBOM at all is RED, and says so differently', async () => {
      const files = without('/w/.github/workflows/release.yml');
      const r = await run(files, 'SSDF-PS.3.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/no workflow generates an SBOM/);
    });
  });

  describe('PW.4.1 — pinned installs', () => {
    it('lockfile plus npm ci is green', async () => {
      expect((await run(COMPLIANT, 'SSDF-PW.4.1')).result).toBe('passed');
    });

    it('a bare `npm install` in CI is RED and names the workflow', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/ci.yml'] = 'jobs:\n  a:\n    steps:\n      - run: npm install\n';
      const r = await run(files, 'SSDF-PW.4.1');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/ci\.yml/);
    });

    it('no lockfile is RED', async () => {
      expect((await run(without('/w/package-lock.json'), 'SSDF-PW.4.1')).result).toBe('failed');
    });
  });

  describe('PW.7.2 — two instruments, not one', () => {
    it('both scanners present is green', async () => {
      expect((await run(COMPLIANT, 'SSDF-PW.7.2')).result).toBe('passed');
    });

    it('a static analyser WITHOUT a secret scanner is RED — one does not cover the other', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/ci.yml'] = 'jobs:\n  a:\n    steps:\n      - uses: github/codeql-action/analyze@v4\n';
      const r = await run(files, 'SSDF-PW.7.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/no secret scanner/);
    });
  });

  describe('RV.1.2 — the scanner sees the whole change', () => {
    it('pull_request with no path filter is green', async () => {
      expect((await run(COMPLIANT, 'SSDF-RV.1.2')).result).toBe('passed');
    });

    it('THE REGRESSION: a workflow that MENTIONS an analyser is not the analyser', async () => {
      // Observed on this repository before the fix. `openssf-scorecard.yml` names
      // CodeQL and runs on a schedule; `sdk-cli-ci.yml` is what actually invokes
      // the analyser on pull requests. Matching /codeql/ picked the wrong file and
      // reported the repository unmet. A false positive inside a standards pack
      // spends the reader's trust on a defect that is not there.
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/scorecard.yml'] =
        'on:\n  schedule:\n    - cron: "0 5 * * 2"\njobs:\n  s:\n    steps:\n      - name: upload CodeQL-compatible SARIF\n        uses: github/codeql-action/upload-sarif@v4\n';
      const r = await run(files, 'SSDF-RV.1.2');
      expect(r.result).toBe('passed');
      expect(r.evidencePath).toBe('.github/workflows/ci.yml');
    });

    it('every analyser leaving a gap is RED, and each one is named', async () => {
      const files: Record<string, string> = {
        ...COMPLIANT,
        '/w/.github/workflows/ci.yml':
          'on:\n  pull_request:\n    paths:\n      - src/**\njobs:\n  a:\n    steps:\n      - uses: github/codeql-action/analyze@v4\n',
        '/w/.github/workflows/nightly.yml':
          'on:\n  schedule:\n    - cron: "0 3 * * *"\njobs:\n  a:\n    steps:\n      - uses: github/codeql-action/analyze@v4\n',
      };
      const r = await run(files, 'SSDF-RV.1.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/ci\.yml/);
      expect(r.message).toMatch(/nightly\.yml/);
    });

    it('THE CASE: a `paths:` filter on the trigger is RED', async () => {
      const files = { ...COMPLIANT };
      files['/w/.github/workflows/ci.yml'] =
        'on:\n  pull_request:\n    branches: [main]\n    paths:\n      - src/**\njobs:\n  a:\n    steps:\n      - uses: github/codeql-action/analyze@v4\n';
      const r = await run(files, 'SSDF-RV.1.2');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/paths:/);
    });
  });

  describe('RV.1.3 — a document is not a policy', () => {
    it('a SECURITY.md naming a channel is green', async () => {
      expect((await run(COMPLIANT, 'SSDF-RV.1.3')).result).toBe('passed');
    });

    it('a SECURITY.md with no channel is RED', async () => {
      const files = { ...COMPLIANT };
      files['/w/SECURITY.md'] = 'We take security seriously.';
      const r = await run(files, 'SSDF-RV.1.3');
      expect(r.result).toBe('failed');
      expect(r.message).toMatch(/nowhere to go/);
    });
  });

  describe('the rest, in both directions', () => {
    it('PO.3.1 green with a toolchain, RED without guards', async () => {
      expect((await run(COMPLIANT, 'SSDF-PO.3.1')).result).toBe('passed');
      const r = await run(without('/w/.harness/scripts/ci/01-validate-docs.mjs'), 'SSDF-PO.3.1');
      expect(r.result).toBe('failed');
    });

    it('PW.4.4 green with both, RED without dependabot', async () => {
      expect((await run(COMPLIANT, 'SSDF-PW.4.4')).result).toBe('passed');
      expect((await run(without('/w/.github/dependabot.yml'), 'SSDF-PW.4.4')).result).toBe('failed');
    });

    it('PW.6.1 green on strict, RED without it, and NOT APPLICABLE with no tsconfig', async () => {
      expect((await run(COMPLIANT, 'SSDF-PW.6.1')).result).toBe('passed');

      const loose = { ...COMPLIANT };
      loose['/w/tsconfig.base.json'] = JSON.stringify({ compilerOptions: {} });
      expect((await run(loose, 'SSDF-PW.6.1')).result).toBe('failed');

      // A repository with no TypeScript is not a repository failing a TypeScript
      // setting. Reporting that as a violation would be the standards-pack
      // equivalent of a false block.
      const notTs = await run(without('/w/tsconfig.base.json'), 'SSDF-PW.6.1');
      expect(notTs.result).toBe('skipped');
      expect(notTs.evaluability).toBe('documentation-only');
    });
  });
});
