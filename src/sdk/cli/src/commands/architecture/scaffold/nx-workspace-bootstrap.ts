import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * GT-626 — WHO creates the Nx workspace that `scaffold` generates into.
 *
 * The defect: `NxWorkspaceStrategy` runs `npm` and `npx nx` inside `<cwd>/src`,
 * so that directory has to be a real Nx workspace, and NOTHING in the product
 * created one. `evolith init` scaffolds the satellite *around* `src/` (manifest,
 * docs, `evolith.yaml`) and leaves `src/` empty, so step 5 of the README
 * quickstart could not follow step 2 — and the refusal named `create-nx-workspace`,
 * a step no documented sequence performed.
 *
 * Three owners were possible. `scaffold` is the right one:
 *
 *  - `init` is runtime-agnostic. It takes `--runtime nodejs|dotnet|python` and
 *    writes files only, offline. Emitting an npm/Nx workspace from it would put a
 *    Node-shaped, plugin-versioned artifact into every satellite, including the
 *    .NET ones `scaffold --runtime dotnet` serves, where `src/nx.json` is noise.
 *  - An explicit documented step is what we have today, and it is the thing the
 *    gap is about: a quickstart whose step 5 cannot follow step 4 is a broken
 *    quickstart, not a documentation gap.
 *  - `scaffold` is the only command that runs `nx`. The workspace root is part of
 *    the Nx strategy's own contract, so the command that owns the strategy owns
 *    its precondition — the same way it already owns installing the plugins.
 *
 * WHY FILES AND NOT `create-nx-workspace`. `scaffold`'s very first step is
 * `npm install -D @nx/nest @nx/<fw> @nx/webpack` inside this directory, which is
 * the expensive half of what `create-nx-workspace` does. What is missing before
 * that install is only the manifest pair `npm` and `nx` need to exist at all.
 * Writing them takes milliseconds and no network, and it keeps the bootstrap
 * deterministic and unit-testable; shelling out to `create-nx-workspace@latest`
 * would add a second multi-minute network step, an interactive tool and a second
 * failure mode, to produce a superset we then immediately overwrite.
 *
 * WHY THIS IS NOT A PERMISSIVE PRECONDITION. The first attempt at GT-626 relaxed
 * the guard, and a fast, clear refusal became `Cannot read properties of null
 * (reading 'useInferencePlugins')` — a crash deep inside Nx AFTER a minutes-long
 * install. This module does the opposite: it makes the precondition TRUE by
 * creating what is missing, and only where creating it is unambiguously safe. A
 * `src/` that already carries a `package.json` belongs to something else; we do
 * not convert it, and the caller keeps refusing, fast, with a message that names
 * a command that actually creates a workspace.
 */

/**
 * `nx` is resolved at install time so it cannot drift from the `@nx/*` plugins:
 * `NxWorkspaceStrategy.installDependencies` installs those unpinned, and a
 * plugin on a different major than `nx` is precisely the crash this guard exists
 * to prevent.
 */
const NX_DEPENDENCY_RANGE = 'latest';

/**
 * TypeScript is NOT `latest`, and the pin is load-bearing rather than cautious.
 *
 * Measured on 2026-07-28 against a real workspace built from this template:
 * `latest` resolved to TypeScript 7.0.2, and `nx g @nx/nest:library` then died
 * with `Cannot read properties of undefined (reading 'Latest')` — the Nx
 * generators still use the TypeScript 5 compiler API surface. `@nx/nest:app` and
 * `@nx/react:app` happened to survive it, so an unpinned template would have
 * failed only on step 4 of `scaffold`, after two app generations and a
 * multi-minute install. With `~5.9` all three generators complete.
 */
const TYPESCRIPT_DEPENDENCY_RANGE = '~5.9.0';

/** What the bootstrap did, for the envelope and for the human summary. */
export interface NxWorkspaceBootstrapResult {
  /** `created` wrote files; `would-create` is `--dry-run`; `already-present` is a no-op. */
  action: 'created' | 'would-create' | 'already-present';
  /** Absolute path of the Nx workspace root (`<baseDir>/src`). */
  workspaceDir: string;
  /** Files written (or that would be written), relative to `workspaceDir`. */
  files: string[];
}

/** Absolute path of the Nx workspace root the scaffolder generates into. */
export function nxWorkspaceDir(baseDir: string): string {
  return path.join(baseDir, 'src');
}

/** True when `<baseDir>/src` is already an Nx workspace. */
export function isNxWorkspace(baseDir: string): boolean {
  return fs.existsSync(path.join(nxWorkspaceDir(baseDir), 'nx.json'));
}

/** `init` writes this; its presence is what makes a directory a satellite. */
const SATELLITE_MANIFEST = 'evolith.yaml';

/** True when `baseDir` is an Evolith satellite (i.e. `init` has run here). */
export function isSatellite(baseDir: string): boolean {
  return fs.existsSync(path.join(baseDir, SATELLITE_MANIFEST));
}

/**
 * True when the bootstrap may write into `<baseDir>/src`.
 *
 * Two disqualifiers, both deliberately narrow:
 *
 *  1. `src/package.json` without an `nx.json` — that directory is some other npm
 *     project, and silently converting it into an Nx workspace is exactly the
 *     permissive behaviour GT-626 warns about.
 *  2. No `evolith.yaml` at `baseDir` — creating files is a side effect, and it is
 *     only defensible inside a repository that has declared itself a satellite.
 *     Without this, `evolith scaffold` typed in the wrong directory writes four
 *     files into it. (Found the honest way: an early revision of this change had
 *     no such check and a test run dropped `nx.json`, `package.json`,
 *     `tsconfig.base.json` and `.gitignore` into this repository's own `src/`.)
 *
 * The second one makes `init` the documented prerequisite of `scaffold` — which
 * is not the circular advice the old error message gave, because after `init` the
 * command now works.
 */
export function canBootstrapNxWorkspace(baseDir: string): boolean {
  const dir = nxWorkspaceDir(baseDir);
  if (fs.existsSync(path.join(dir, 'nx.json'))) return false;
  if (!isSatellite(baseDir)) return false;
  return !fs.existsSync(path.join(dir, 'package.json'));
}

/**
 * Derive the workspace package name from the satellite.
 *
 * The satellite's own `package.json` name (what `init --name` wrote) with a
 * `-workspace` suffix, falling back to the directory name. Sanitised to the npm
 * name grammar so `npm install` in the generated directory does not refuse.
 */
export function nxWorkspaceName(baseDir: string): string {
  let base = path.basename(path.resolve(baseDir));
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8')) as { name?: string };
    if (manifest.name && manifest.name.trim()) base = manifest.name.trim();
  } catch {
    /* no satellite manifest, or it is unreadable — the directory name is fine */
  }
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return `${safe || 'evolith-satellite'}-workspace`;
}

/**
 * The manifest pair (plus the two files every Nx workspace is expected to carry)
 * that turn `<baseDir>/src` into a workspace `npm` and `nx` can operate in.
 *
 * `nx.json` is the load-bearing one: without it `readNxJson()` returns null and
 * the generators die on `useInferencePlugins`. The rest is the minimum a
 * generated app expects to find above it.
 */
export function nxWorkspaceFiles(baseDir: string): Record<string, string> {
  const packageJson = {
    name: nxWorkspaceName(baseDir),
    version: '0.0.0',
    license: 'UNLICENSED',
    private: true,
    scripts: {},
    devDependencies: {
      nx: NX_DEPENDENCY_RANGE,
      typescript: TYPESCRIPT_DEPENDENCY_RANGE,
    },
  };

  const nxJson = {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    namedInputs: {
      default: ['{projectRoot}/**/*', 'sharedGlobals'],
      production: ['default'],
      sharedGlobals: [],
    },
    targetDefaults: {
      build: { cache: true, dependsOn: ['^build'] },
      test: { cache: true },
      lint: { cache: true },
    },
    workspaceLayout: { appsDir: 'apps', libsDir: 'libs' },
  };

  const tsconfigBase = {
    compileOnSave: false,
    compilerOptions: {
      rootDir: '.',
      baseUrl: '.',
      sourceMap: true,
      declaration: false,
      moduleResolution: 'node',
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      importHelpers: true,
      target: 'es2015',
      module: 'esnext',
      lib: ['es2020', 'dom'],
      skipLibCheck: true,
      skipDefaultLibCheck: true,
      paths: {},
    },
    exclude: ['node_modules', 'tmp'],
  };

  return {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'nx.json': `${JSON.stringify(nxJson, null, 2)}\n`,
    'tsconfig.base.json': `${JSON.stringify(tsconfigBase, null, 2)}\n`,
    '.gitignore': ['node_modules', 'dist', 'tmp', '.nx', ''].join('\n'),
  };
}

/**
 * Make `<baseDir>/src` an Nx workspace.
 *
 * Idempotent: an existing `nx.json` is left alone, and no existing file is ever
 * overwritten. Returns what it did so the caller can report it in the ADR-0073
 * envelope instead of the workspace appearing out of nowhere.
 */
export function bootstrapNxWorkspace(
  baseDir: string,
  options: { dryRun?: boolean } = {},
): NxWorkspaceBootstrapResult {
  const workspaceDir = nxWorkspaceDir(baseDir);
  if (isNxWorkspace(baseDir)) {
    return { action: 'already-present', workspaceDir, files: [] };
  }

  const contents = nxWorkspaceFiles(baseDir);
  const planned = Object.keys(contents).filter(
    (name) => !fs.existsSync(path.join(workspaceDir, name)),
  );

  if (options.dryRun) {
    return { action: 'would-create', workspaceDir, files: planned };
  }

  fs.mkdirSync(workspaceDir, { recursive: true });
  for (const name of planned) {
    fs.writeFileSync(path.join(workspaceDir, name), contents[name], 'utf8');
  }
  return { action: 'created', workspaceDir, files: planned };
}
