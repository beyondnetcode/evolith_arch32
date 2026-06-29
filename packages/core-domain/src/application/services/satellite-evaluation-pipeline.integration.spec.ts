import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { SatelliteEvaluationPipeline } from './satellite-evaluation-pipeline.service';
import { RulesetValidatorService, ValidationResult } from '../validators/ruleset-validator.service';
import { DirEntry, IFileSystem, ILogger } from '../../domain/interfaces';

/**
 * GT-382 follow-up — end-to-end OPA enforcement integration test.
 *
 * Unlike satellite-evaluation-pipeline.spec.ts (which mocks OpaEvaluator) and
 * opa-evaluator.spec.ts (which stubs loadPolicy), this exercises the REAL,
 * unmocked OpaEvaluator loading the REAL compiled `policy.wasm` through the
 * full SatelliteEvaluationPipeline (real SdlcDataLoaderService too).
 *
 * It guards the install-path/lookup-path agreement: the wasm is sourced from
 * the canonical build location `<repoRoot>/rulesets/opa/policy.wasm` that
 * `npm run build:policy` now installs to — the same `<corePath>/rulesets/opa`
 * location OpaEvaluator reads at runtime. If the build stops installing there,
 * the wasm is absent and this suite is skipped (gated on build:policy), so it
 * never silently passes on a stale artifact.
 */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const ROOT_WASM = path.join(REPO_ROOT, 'rulesets', 'opa', 'policy.wasm');
const ROOT_DOD_REGO = path.join(REPO_ROOT, 'rulesets', 'opa', 'dod.rego');
const wasmBuilt = fs.existsSync(ROOT_WASM);

if (!wasmBuilt) {
  // eslint-disable-next-line no-console
  console.warn(
    `[skip] OPA integration test: ${ROOT_WASM} not found. Run \`npm run build:policy\` first.`,
  );
}

/** Minimal real-filesystem adapter so the pipeline runs against actual files. */
class NodeFileSystem implements IFileSystem {
  readFile(p: string): Promise<string> {
    return fsp.readFile(p, 'utf8');
  }
  readFileBuffer(p: string): Promise<Buffer> {
    return fsp.readFile(p);
  }
  writeFile(p: string, content: string): Promise<void> {
    return fsp.writeFile(p, content);
  }
  async exists(p: string): Promise<boolean> {
    return fs.existsSync(p);
  }
  existsSync(p: string): boolean {
    return fs.existsSync(p);
  }
  async readJson<T = unknown>(p: string): Promise<T> {
    return JSON.parse(await fsp.readFile(p, 'utf8')) as T;
  }
  async writeJson(p: string, content: unknown): Promise<void> {
    await fsp.writeFile(p, JSON.stringify(content));
  }
  async mkdir(p: string): Promise<void> {
    await fsp.mkdir(p, { recursive: true });
  }
  async readdir(p: string): Promise<DirEntry[]> {
    const entries = await fsp.readdir(p, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      isDirectory: () => e.isDirectory(),
      isFile: () => e.isFile(),
    }));
  }
  readdirNames(p: string): Promise<string[]> {
    return fsp.readdir(p);
  }
  async copy(src: string, dest: string): Promise<void> {
    await fsp.copyFile(src, dest);
  }
  async ensureDir(p: string): Promise<void> {
    await fsp.mkdir(p, { recursive: true });
  }
  async ensureFile(p: string): Promise<void> {
    await fsp.writeFile(p, '', { flag: 'a' });
  }
  async stat(p: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const s = await fsp.stat(p);
    return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile() };
  }
  async remove(p: string): Promise<void> {
    await fsp.rm(p, { recursive: true, force: true });
  }
}

const noopLogger: ILogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

const describeIfWasm = wasmBuilt ? describe : describe.skip;

describeIfWasm('SatelliteEvaluationPipeline + real OPA wasm (integration, GT-382)', () => {
  jest.setTimeout(30000);

  let coreDir: string;
  let satelliteDir: string;
  let pipeline: SatelliteEvaluationPipeline;

  // Only `validate()` is touched by the pipeline (for the summary); the gate
  // verdict under test comes entirely from the real OpaEvaluator.
  const stubValidator = {
    validate: async (): Promise<ValidationResult> => ({
      status: 'passed',
      rulesChecked: 0,
      issues: [],
      coreRef: { version: null, path: coreDir },
      timestamp: new Date().toISOString(),
    }),
  } as unknown as RulesetValidatorService;

  beforeAll(() => {
    coreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-core-'));
    satelliteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-sat-'));

    // Fixture core: the compiled policy + its .rego source co-located under
    // rulesets/opa (exactly where OpaEvaluator resolves them at runtime), plus
    // the GT-280 structured phase/gate that references dod.rego.
    const opaDir = path.join(coreDir, 'rulesets', 'opa');
    fs.mkdirSync(opaDir, { recursive: true });
    fs.copyFileSync(ROOT_WASM, path.join(opaDir, 'policy.wasm'));
    fs.copyFileSync(ROOT_DOD_REGO, path.join(opaDir, 'dod.rego'));

    const phasesDir = path.join(coreDir, 'reference', 'governance', 'sdlc', 'phases');
    const gatesDir = path.join(coreDir, 'reference', 'governance', 'sdlc', 'gates');
    fs.mkdirSync(phasesDir, { recursive: true });
    fs.mkdirSync(gatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(phasesDir, 'phase-f3.json'),
      JSON.stringify({ id: 'f3', name: 'Construction', shortName: 'Build', order: 2, description: '', gates: ['gate-f3'] }),
    );
    // Single-artifact gate so the verdict is driven solely by the dod policy.
    fs.writeFileSync(
      path.join(gatesDir, 'gate-f3.json'),
      JSON.stringify({
        id: 'gate-f3',
        name: 'Successful Build',
        phase: 'f3',
        description: '',
        requiredArtifacts: [
          { artifact: 'definition-of-done.md', validation: 'All Definition of Done items checked', rules: ['rulesets/opa/dod.rego'] },
        ],
        blockingCriteria: [],
      }),
    );

    // Satellite: the required artifact exists, so the gate reaches OPA
    // evaluation rather than short-circuiting on a missing artifact.
    fs.writeFileSync(path.join(satelliteDir, 'definition-of-done.md'), '# Definition of Done\n');

    pipeline = new SatelliteEvaluationPipeline(new NodeFileSystem(), noopLogger, stubValidator, coreDir);
  });

  afterAll(() => {
    fs.rmSync(coreDir, { recursive: true, force: true });
    fs.rmSync(satelliteDir, { recursive: true, force: true });
  });

  it('FAILS the gate with a DOD-02 message when a coveragePercent<80 fact is threaded', async () => {
    const verdict = await pipeline.evaluate({
      satellitePath: satelliteDir,
      corePath: coreDir,
      topology: 'modular-monolith',
      phase: 'f3',
      facts: { context: { dod: { coveragePercent: 60 } } } as any,
    });

    expect(verdict.passed).toBe(false);
    const gate = verdict.gates.find(g => g.gateId === 'gate-f3');
    expect(gate?.verdict).toBe('failed');
    const dodEval = gate?.artifactEvaluations.find(e => e.artifact === 'definition-of-done.md');
    expect(dodEval?.passed).toBe(false);
    // Message is the joined DOD-* violations; DOD-02 is the coverage rule.
    expect(dodEval?.message).toMatch(/coverage must be >= 80%/i);
  });

  it('PASSES the gate when no DoD facts are threaded (no facts → no opinion)', async () => {
    const verdict = await pipeline.evaluate({
      satellitePath: satelliteDir,
      corePath: coreDir,
      topology: 'modular-monolith',
      phase: 'f3',
    });

    expect(verdict.passed).toBe(true);
    const gate = verdict.gates.find(g => g.gateId === 'gate-f3');
    expect(gate?.verdict).toBe('passed');
    expect(gate?.artifactEvaluations.every(e => e.passed)).toBe(true);
  });
});
