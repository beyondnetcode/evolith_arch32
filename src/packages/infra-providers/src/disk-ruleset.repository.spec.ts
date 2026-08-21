import { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { DiskRulesetRepository, RulesetsNotFoundError } from './disk-ruleset.repository';
import { NodeFileSystemProvider } from './node-filesystem.provider';
import * as nodePath from 'path';

interface FakeFsConfig {
  files: Record<string, string>;
  dirs?: Set<string>;
}

/** In-memory IFileSystem tailored to DiskRulesetRepository's access pattern. */
function makeFs(config: FakeFsConfig): IFileSystem {
  const files = config.files;
  const dirs = config.dirs ?? new Set<string>();
  const has = (p: string) => p in files || dirs.has(p);
  return {
    async readFile(p: string) {
      if (!(p in files)) throw new Error(`ENOENT: ${p}`);
      return files[p];
    },
    async readFileBuffer(p: string) {
      return Buffer.from(await this.readFile(p), 'utf-8');
    },
    async writeFile() {},
    async exists(p: string) {
      return has(p);
    },
    existsSync(p: string) {
      return has(p);
    },
    async readJson<T = unknown>(p: string) {
      return JSON.parse(await this.readFile(p)) as T;
    },
    async writeJson() {},
    async mkdir() {},
    async readdir(p: string) {
      return (await this.readdirNames(p)).map((name) => ({
        name,
        isDirectory: () => dirs.has(`${p}/${name}`),
        isFile: () => `${p}/${name}` in files,
      }));
    },
    async readdirNames(p: string) {
      const prefix = `${p}/`;
      const direct = new Set<string>();
      for (const key of [...Object.keys(files), ...dirs]) {
        if (key.startsWith(prefix)) {
          direct.add(key.slice(prefix.length).split('/')[0]);
        }
      }
      return [...direct];
    },
    async copy() {},
    async ensureDir() {},
    async ensureFile() {},
    async stat(p: string) {
      return { isDirectory: () => dirs.has(p), isFile: () => p in files };
    },
    async remove() {},
  };
}

function makeLogger(): ILogger & { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  return {
    debug() {},
    info() {},
    warn(msg: string) {
      warnings.push(msg);
    },
    error(msg: string) {
      errors.push(msg);
    },
    errors,
    warnings,
  };
}

const SCHEMA = JSON.stringify({
  type: 'object',
  properties: { rules: { type: 'array' } },
  required: ['rules'],
});

describe('DiskRulesetRepository', () => {
  // GT-474: zero rulesets must ABORT, never resolve to [] — a governance run
  // that silently checks nothing is worse than one that crashes.
  it('throws when no rulesets directory exists, naming both probed paths', async () => {
    const fs = makeFs({ files: {} });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(
      RulesetsNotFoundError,
    );
    // GT-566 reformatted this into a per-candidate trail (each line says whether
    // the path existed); the invariant under test — BOTH probed paths are named
    // so the operator need not guess where we looked — is unchanged.
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(/"\/core\/rulesets"/);
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(/"\/core\/src\/rulesets"/);
  });

  // GT-474 regression: the Evolith Core monorepo keeps rulesets at
  // `<core>/src/rulesets` (post apps/→src/ migration). Joining only
  // `<core>/rulesets` made `validate --core <checkout>` load 0 rules.
  it('resolves rulesets under <core>/src/rulesets (Core monorepo layout)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/src/rulesets', '/core/src/rulesets/schema']),
      files: {
        '/core/src/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/src/rulesets/governance.rules.json': JSON.stringify({
          rules: [{ id: 'GOV-1', severity: 'MUST', title: 'T', description: 'D' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('GOV-1');
  });

  it('throws when the rulesets directory exists but yields zero rules', async () => {
    // The corpus root must be corpus-SHAPED (GT-566) for this to exercise the
    // zero-rules guard rather than the resolution guard — the two failures are
    // distinct and both must keep working. `schema/` makes it a real corpus
    // root; it just contains no `*.rules.json`.
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: { '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow(
      /0 rules normalized/,
    );
  });

  it('loads, validates and normalizes a ruleset file', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/governance.rules.json': JSON.stringify({
          rules: [
            {
              id: 'GOV-1',
              severity: 'MUST',
              title: 'Title',
              description: 'Desc',
              category: 'governance',
            },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: 'GOV-1',
      severity: 'MUST',
      category: 'governance',
      title: 'Title',
      description: 'Desc',
      blocking: true,
      sourceFile: 'rulesets/governance.rules.json',
    });
  });

  // #575: this used to assert that a file NAMED `phase-gates.rules.json` bypassed
  // schema validation. Dispatch now reads the document's declared `$schema`, like
  // every other non-corpus kind, so the filename carries no meaning and a rename
  // cannot silently defeat it. A document that declares the SDLC schema is
  // classified and contributes no rules; one that merely has the old name is an
  // ordinary ruleset and is validated as such.
  it('classifies an SDLC phase-gate document by its declared schema, not its filename', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/renamed-gates.rules.json': JSON.stringify({
          $schema: '../schema/ruleset-sdlc.schema.json',
          title: 'Phase gates',
          gates: [{ id: 'GATE-1' }],
        }),
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());

    const rules = await repo.loadAllRulesets('/core');

    expect(rules.map((r) => r.id)).toEqual(['OK-1']);
    expect(repo.describeLastLoad()).toEqual([
      expect.objectContaining({
        file: 'renamed-gates.rules.json',
        outcome: 'classified',
        declaredSchema: 'ruleset-sdlc.schema.json',
      }),
    ]);
  });

  // #575: the load-bearing half. A document the loader drops must reach the
  // caller as data, not only as a log line -- a log line does not survive
  // `--format json` and never reaches an exit code.
  it('reports a rejected ruleset as data, not only as a warning (#575)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/broken.rules.json': JSON.stringify({ notRules: [] }),
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());

    await repo.loadAllRulesets('/core');
    const dropped = repo.describeLastLoad();

    expect(dropped).toHaveLength(1);
    expect(dropped[0].file).toBe('broken.rules.json');
    expect(dropped[0].outcome).toBe('rejected');
    expect(dropped[0].detail).toContain('Schema validation failed');
  });

  // A corpus where nothing was dropped must say so with an empty list rather
  // than with the previous load's answer.
  it('describes a clean load as empty, and does not carry outcomes across loads', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/broken.rules.json': JSON.stringify({ notRules: [] }),
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    await repo.loadAllRulesets('/core');
    expect(repo.describeLastLoad()).toHaveLength(1);

    const cleanFs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const cleanRepo = new DiskRulesetRepository(cleanFs, makeLogger());
    await cleanRepo.loadAllRulesets('/core');
    expect(cleanRepo.describeLastLoad()).toEqual([]);
  });

  it('skips (does not abort on) a ruleset that fails schema validation and still loads the valid ones (GT-456)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/broken.rules.json': JSON.stringify({ notRules: [] }),
        '/core/rulesets/good.rules.json': JSON.stringify({
          rules: [{ id: 'OK-1', severity: 'MUST', title: 'Good' }],
        }),
      },
    });
    const logger = makeLogger();
    const repo = new DiskRulesetRepository(fs, logger);
    // A single non-standard/malformed file must NOT throw and zero out ALL
    // validation — it is skipped with a warning; valid rulesets still load.
    const rules = await repo.loadAllRulesets('/core');
    expect(rules.map((r) => r.id)).toEqual(['OK-1']);
    expect(logger.warnings.some((w) => w.includes('broken.rules.json'))).toBe(true);
  });

  it('derives categories from canonical progressive-axis topology id prefixes', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/topology.rules.json': JSON.stringify({
          rules: [
            { id: 'modular-monolith-1', severity: 'MUST', title: 'mm' },
            { id: 'distributed-modules-1', severity: 'MUST', title: 'dm' },
            { id: 'microservices-1', severity: 'MUST', title: 'ms' },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    const byId = Object.fromEntries(rules.map((r) => [r.id, r.category]));
    expect(byId['modular-monolith-1']).toBe('topology');
    expect(byId['distributed-modules-1']).toBe('module-autonomy');
    expect(byId['microservices-1']).toBe('autonomous-deployment');
  });

  it('no longer maps the stale f1/f2/f3 prefixes (falls back to general)', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/legacy.rules.json': JSON.stringify({
          rules: [{ id: 'f1-1', severity: 'MUST', title: 'legacy' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules[0].category).toBe('general');
  });

  it('normalizes severity aliases and explicit category overrides', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/mixed.rules.json': JSON.stringify({
          rules: [
            { id: 'A-1', severity: 'must not', title: 'a' },
            { id: 'B-1', severity: 'MAY', title: 'b' },
            { id: 'C-1', title: 'c', enforcement: true },
            { id: 'D-1', title: 'd' },
            { id: 'gov-99', severity: 'SHOULD', title: 'e', category: 'explicit' },
          ],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    const byId = Object.fromEntries(rules.map((r) => [r.id, r]));
    expect(byId['A-1'].severity).toBe('MUST NOT');
    expect(byId['B-1'].severity).toBe('COULD');
    expect(byId['C-1'].severity).toBe('MUST');
    expect(byId['D-1'].severity).toBe('SHOULD');
    expect(byId['gov-99'].category).toBe('explicit');
    // gov-99 has an explicit category, so the prefix map is bypassed
    expect(byId['D-1'].category).toBe('general');
  });

  it('supports principle-style rulesets via the principles/statement aliases', async () => {
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': JSON.stringify({ type: 'object' }),
        '/core/rulesets/principles.rules.json': JSON.stringify({
          principles: [{ id: 'P-1', principle: 'Be clear', statement: 'Clarity wins' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules[0]).toMatchObject({ id: 'P-1', title: 'Be clear', description: 'Clarity wins' });
  });

  it('recurses into nested ruleset directories', async () => {
    const fs = makeFs({
      dirs: new Set([
        '/core/rulesets',
        '/core/rulesets/schema',
        '/core/rulesets/sub',
      ]),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/sub/nested.rules.json': JSON.stringify({
          rules: [{ id: 'N-1', severity: 'MUST', title: 'nested' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    const rules = await repo.loadAllRulesets('/core');
    expect(rules.map((r) => r.id)).toEqual(['N-1']);
  });
});

/**
 * GT-566 — corpus resolution must be content-qualified and fail closed.
 *
 * The bug these pin: `resolveRulesetsDir` used to qualify a candidate by
 * directory EXISTENCE. In the Core monorepo both `<repo>/rulesets` and
 * `<repo>/src/rulesets` exist, and only the latter is the corpus — the former
 * is the satellite-side agents directory. Existence-qualification latched onto
 * `<repo>/rulesets`, found zero `*.rules.json`, and raised a
 * `RULESET_NOT_FOUND` (surfaced by core-api as a 422) that read as a missing
 * ruleset rather than a resolution that stopped at the wrong tree.
 */
describe('DiskRulesetRepository — corpus resolution (GT-566)', () => {
  const REAL_CORPUS_DIRS = new Set([
    '/repo/rulesets',
    '/repo/rulesets/agents',
    '/repo/src',
    '/repo/src/rulesets',
    '/repo/src/rulesets/schema',
    '/repo/src/rulesets/architecture',
  ]);

  /** Mirrors the real repo: an agents dir at `rulesets/`, the corpus at `src/rulesets/`. */
  function makeMonorepoFs() {
    return makeFs({
      dirs: REAL_CORPUS_DIRS,
      files: {
        // The decoy: `rulesets/` exists but holds only the agents registry.
        '/repo/rulesets/agents/agents-registry.json': JSON.stringify({ agents: [] }),
        // The real corpus.
        '/repo/src/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/repo/src/rulesets/architecture/hexagonal.rules.json': JSON.stringify({
          rules: [{ id: 'HXA-1', severity: 'MUST', title: 'Ports and adapters' }],
        }),
      },
    });
  }

  it('resolves the real corpus at src/rulesets when rulesets/ holds only agents', async () => {
    const repo = new DiskRulesetRepository(makeMonorepoFs(), makeLogger());
    const rules = await repo.loadAllRulesets('/repo');
    // Pre-fix this threw RulesetsNotFoundError: `rulesets/` was selected on
    // existence alone and yielded 0 files.
    expect(rules.map((r) => r.id)).toEqual(['HXA-1']);
  });

  it('still prefers <core>/rulesets when THAT is the corpus (bundled CLI layout)', async () => {
    const fs = makeFs({
      dirs: new Set(['/pkg/rulesets', '/pkg/rulesets/schema', '/pkg/rulesets/agents']),
      files: {
        '/pkg/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/pkg/rulesets/agents/agents-registry.json': JSON.stringify({ agents: [] }),
        '/pkg/rulesets/bundled.rules.json': JSON.stringify({
          rules: [{ id: 'B-1', severity: 'MUST', title: 'bundled' }],
        }),
      },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());
    expect((await repo.loadAllRulesets('/pkg')).map((r) => r.id)).toEqual(['B-1']);
  });

  it('fails closed with a legible error naming every path tried when no corpus exists', async () => {
    const fs = makeFs({ dirs: new Set(['/empty']), files: {} });
    const repo = new DiskRulesetRepository(fs, makeLogger());

    const err = await repo.loadAllRulesets('/empty').then(
      () => null,
      (e: unknown) => e as Error,
    );

    expect(err).toBeInstanceOf(RulesetsNotFoundError);
    // Both candidates named, so the operator does not have to guess where we looked.
    expect(err!.message).toContain('/empty/rulesets');
    expect(err!.message).toContain('/empty/src/rulesets');
    expect(err!.message).toContain('does not exist');
    // Not a "the ruleset you asked for is missing" message.
    expect(err!.message).toContain('Could not locate the Evolith ruleset corpus');
  });

  it('says the LAYOUT is wrong when a candidate exists but is not corpus-shaped', async () => {
    // No corpus anywhere — only the agents decoy. This is the diagnosis that
    // distinguishes "wrong CORE_PATH" from "right path, wrong tree".
    const fs = makeFs({
      dirs: new Set(['/decoy/rulesets', '/decoy/rulesets/agents']),
      files: { '/decoy/rulesets/agents/agents-registry.json': '{}' },
    });
    const repo = new DiskRulesetRepository(fs, makeLogger());

    const err = await repo.loadAllRulesets('/decoy').then(
      () => null,
      (e: unknown) => e as Error,
    );

    expect(err).toBeInstanceOf(RulesetsNotFoundError);
    expect(err!.message).toContain('EXISTS but is not a ruleset corpus');
    expect(err!.message).toContain('agents');
    expect(err!.message).toContain('The layout is likely wrong');
  });
});

/**
 * GT-566 — the reported symptom, pinned against the REAL repository layout.
 *
 * The SDK contract test could not point CORE_PATH at the repo root: doing so
 * 422'd with RULESET_NOT_FOUND, so it composed a symlinked fixture core path
 * instead. This test is the thing that keeps that workaround unnecessary. It
 * uses the real filesystem deliberately — a mocked layout cannot catch the
 * repo's real layout drifting again.
 */
describe('DiskRulesetRepository — real repo layout (GT-566)', () => {
  const nodeFs = new NodeFileSystemProvider().createFileSystem();

  /** Marker-based ascent, mirroring .harness/scripts/lib/paths.mjs ROOT_MARKERS. */
  function findRepoRoot(): string | undefined {
    let dir = __dirname;
    for (let i = 0; i < 12; i++) {
      const markers = ['package.json', '.harness', 'evolith.yaml'];
      if (markers.every((m) => nodeFs.existsSync(nodePath.join(dir, m)))) return dir;
      const parent = nodePath.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return undefined;
  }

  const repoRoot = findRepoRoot();
  // Skip rather than fail when the tests run from a published tarball with no
  // repo around them; inside the monorepo this always runs.
  const itInRepo = repoRoot ? it : it.skip;

  itInRepo('CORE_PATH pointed at the repo root loads the real corpus', async () => {
    const repo = new DiskRulesetRepository(nodeFs, makeLogger());
    const rules = await repo.loadAllRulesets(repoRoot!);
    // The corpus is ~350 rules; assert a floor rather than an exact count so
    // authoring a new ruleset does not break this test. The point is that it is
    // the real corpus and not the empty `rulesets/agents` tree.
    expect(rules.length).toBeGreaterThan(100);
  }, 60_000);

  itInRepo('the repo root resolves to the real corpus, not to a same-named tree', () => {
    // Antes esto afirmaba que el repo AUN tenia el señuelo `rulesets/agents/` en
    // la raiz, y fallaba ruidosamente si desaparecia -- para que el test de
    // arriba no pasara en vacio. Cumplio su funcion: el señuelo se elimino
    // (ADR-0118, era residuo de correr el CLI desde la raiz) y esto lo detecto.
    //
    // La condicion sigue siendo necesaria, pero ya no depende de que exista
    // basura en el repo: el corpus real debe estar donde se cree que esta. Y la
    // conducta de esquivar un arbol homonimo la cubre el test sintetico
    // "says the LAYOUT is wrong when a candidate exists but is not corpus-shaped",
    // que construye su propio `/decoy/rulesets/agents` y no depende del disco.
    expect(nodeFs.existsSync(nodePath.join(repoRoot!, 'src', 'rulesets', 'schema'))).toBe(true);
    expect(nodeFs.existsSync(nodePath.join(repoRoot!, 'rulesets'))).toBe(false);
  });

  /**
   * GT-632 — the break that made the whole enforcement subsystem dead code.
   *
   * `ruleset-standard.schema.json` has accepted an `enforce` block since GT-516,
   * `PolicyCompiler` compiles it, `EnforcerEvaluator` routes on it, and all three
   * surfaces inject a `NodeProcessRunner` so it has somewhere to route TO — but
   * `normalizeRuleset` never copied the field. `rule.enforce` was therefore always
   * `undefined`, `isEnforcerRule()` always false, and HXA-01/02/04/05 declared
   * `blocking: true` plus a complete `from`/`to` clause that nothing ever read.
   * Loading the real corpus is the only way to assert this end to end.
   */
  itInRepo('carries the authored `enforce` block through normalization', async () => {
    const repo = new DiskRulesetRepository(nodeFs, makeLogger());
    const rules = await repo.loadAllRulesets(repoRoot!);
    const byId = new Map(rules.map((r) => [r.id, r]));

    for (const id of ['HXA-01', 'HXA-02', 'HXA-04', 'HXA-05']) {
      const rule = byId.get(id);
      expect(rule).toBeDefined();
      expect(rule!.blocking).toBe(true);
      expect(rule!.enforce).toMatchObject({ engine: 'enforcer', tool: 'dependency-cruiser' });
      // The clause itself — the part that used to be dropped, and without which
      // the rule is a promise with no check behind it.
      const config = rule!.enforce!.config as Record<string, Record<string, string>>;
      expect(config.from.path).toBeTruthy();
      expect(config.to.path).toBeTruthy();
      expect(rule!.enforce!.toolRuleId).toBeTruthy();
    }
  }, 60_000);

  itInRepo('leaves rules with no `enforce` block undefined (additive, not invented)', async () => {
    const repo = new DiskRulesetRepository(nodeFs, makeLogger());
    const rules = await repo.loadAllRulesets(repoRoot!);
    // ADR-0002 and, since GT-662, the ISO/IEC 5055 pack are the only rulesets
    // that author enforce blocks; everything else must stay on the native engine
    // exactly as before. The ISO rules are enforcer rules BY DESIGN — no native
    // handler decides a CWE, an adapter over a free analyser's SARIF does — so
    // the list growing is the capability being added, not the loader inventing
    // a block. What this test still guards is the "not invented" half: a rule
    // outside these two packs must come back with `enforce: undefined`.
    const withEnforce = rules.filter((r) => r.enforce);
    expect(withEnforce.map((r) => r.id).sort()).toEqual(
      [
        'HXA-01', 'HXA-02', 'HXA-04', 'HXA-05', 'HXA-06', 'HXA-07',
        'ISO5055-MAINT', 'ISO5055-PERF', 'ISO5055-REL', 'ISO5055-SEC',
      ].sort(),
    );
  }, 60_000);
});


/**
 * GT-649 — the corpus tree holds more than one document kind under
 * `*.rules.json`, and the loader used to have no way to say so.
 *
 * Three files declare their own schema (a single-rule declaration enforced by a
 * CI guard; the ADR-0104 recommendation catalogue) and therefore failed the
 * STANDARD ruleset schema with "must have required property 'rules' /
 * 'principles'". Each was logged as a skipped "non-standard ruleset" on every
 * load — once per k6 iteration in CI run 30631939687, which is what a
 * per-request corpus load looks like from the outside.
 *
 * The assertion is on the REAL corpus on purpose: the point is that the tree as
 * authored today loads cleanly, which a fixture cannot tell us.
 */
describe('DiskRulesetRepository — non-corpus document kinds (GT-649)', () => {
  const nodeFs = new NodeFileSystemProvider().createFileSystem();

  function findRepoRoot(): string | undefined {
    let dir = __dirname;
    for (let i = 0; i < 12; i++) {
      const markers = ['package.json', '.harness', 'evolith.yaml'];
      if (markers.every((m) => nodeFs.existsSync(nodePath.join(dir, m)))) return dir;
      const parent = nodePath.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return undefined;
  }

  const repoRoot = findRepoRoot();
  const itInRepo = repoRoot ? it : it.skip;

  itInRepo('loads the real corpus without warning about a single file', async () => {
    const logger = makeLogger();
    const repo = new DiskRulesetRepository(nodeFs, logger);

    await repo.loadAllRulesets(repoRoot!);

    expect(logger.warnings).toEqual([]);
    expect(logger.errors).toEqual([]);
  }, 60_000);

  it('skips a declared non-corpus document instead of reporting it as broken', async () => {
    const logger = makeLogger();
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema', '/core/rulesets/architecture']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/schema/topology-recommendation.schema.json': JSON.stringify({
          type: 'object',
          required: ['progressive'],
          properties: { $schema: { type: 'string' }, progressive: { type: 'array' } },
        }),
        '/core/rulesets/governance.rules.json': JSON.stringify({
          rules: [{ id: 'GOV-1', severity: 'MUST', title: 'T', description: 'D' }],
        }),
        '/core/rulesets/architecture/topology-recommendation.rules.json': JSON.stringify({
          $schema: '../schema/topology-recommendation.schema.json',
          progressive: [{ id: 'REC-1', recommend: 'modular-monolith', rationale: 'r' }],
        }),
      },
    });

    const rules = await new DiskRulesetRepository(fs, logger).loadAllRulesets('/core');

    expect(rules.map((r) => r.id)).toEqual(['GOV-1']);
    expect(logger.warnings).toEqual([]);
  });

  // Silencing must not become blindness: a document that violates the contract
  // it itself declares is still reported.
  it('warns when a non-corpus document fails its OWN declared schema', async () => {
    const logger = makeLogger();
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema', '/core/rulesets/architecture']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/schema/topology-recommendation.schema.json': JSON.stringify({
          type: 'object',
          required: ['progressive'],
          properties: { $schema: { type: 'string' }, progressive: { type: 'array' } },
        }),
        '/core/rulesets/governance.rules.json': JSON.stringify({
          rules: [{ id: 'GOV-1', severity: 'MUST', title: 'T', description: 'D' }],
        }),
        '/core/rulesets/architecture/topology-recommendation.rules.json': JSON.stringify({
          $schema: '../schema/topology-recommendation.schema.json',
          // `progressive` is required by the schema it declares.
          dimensions: [],
        }),
      },
    });

    await new DiskRulesetRepository(fs, logger).loadAllRulesets('/core');

    expect(logger.warnings).toHaveLength(1);
    expect(logger.warnings[0]).toMatch(/does not satisfy it/);
    expect(logger.warnings[0]).toMatch(/topology-recommendation\.schema\.json/);
  });

  // A ruleset that claims the STANDARD schema and fails it is a real defect and
  // must keep warning — the classification is by declared kind, not by failure.
  it('still warns when a standard-shaped ruleset fails the standard schema', async () => {
    const logger = makeLogger();
    const fs = makeFs({
      dirs: new Set(['/core/rulesets', '/core/rulesets/schema']),
      files: {
        '/core/rulesets/schema/ruleset-standard.schema.json': SCHEMA,
        '/core/rulesets/governance.rules.json': JSON.stringify({
          rules: [{ id: 'GOV-1', severity: 'MUST', title: 'T', description: 'D' }],
        }),
        '/core/rulesets/broken.rules.json': JSON.stringify({ principles: 'not-an-array' }),
      },
    });

    await new DiskRulesetRepository(fs, logger).loadAllRulesets('/core');

    expect(logger.warnings).toHaveLength(1);
    expect(logger.warnings[0]).toMatch(/Skipping non-standard ruleset/);
  });
});
