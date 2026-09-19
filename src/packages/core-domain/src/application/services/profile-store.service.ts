/**
 * GT-682 (#760) — the ONE reader of the CLI profile store.
 *
 * `evolith profile` keeps its named profiles in the file the `conf` package
 * manages for the CLI (`projectName: 'evolith-cli'`, `fileExtension: 'yaml'`).
 * The MCP server has to answer `evolith-profile current|list` from the SAME
 * file, and it cannot import the CLI package. Duplicating "where the file is,
 * how it is parsed and which profile is active" on the MCP side would be a
 * second copy of one fact — the shape of defect GT-602 and GT-583 were opened
 * for. So the three read concerns live here, and the CLI `ConfigService`
 * delegates to them:
 *
 *   1. LOCATION — `resolveProfileStoreDir` / `resolveProfileStorePath`. The CLI
 *      passes the directory to `conf` as `cwd`, so `conf` no longer decides the
 *      location on its own; this module does, for both surfaces.
 *   2. PARSING  — `parseProfileStore`. The file is named `config.yaml` but its
 *      body is JSON: `conf` was never given a `serialize`/`deserialize` pair, so
 *      it uses its default `JSON.stringify`/`JSON.parse`. Parsing it as YAML would
 *      happen to work on the JSON subset and silently accept documents `conf`
 *      itself rejects, so this reader parses exactly what the writer writes.
 *   3. RESOLUTION — `resolveActiveProfile` / `listProfileNames` /
 *      `getProfileConfig`, written over a key getter so the CLI can hand in its
 *      live `conf` instance while the MCP server hands in a parsed snapshot.
 *
 * What this module is NOT: a writer. The CLI keeps `conf` for `create`, `switch`
 * and `delete` (atomic writes, directory creation); the MCP surface is read-only
 * and must never create the file as a side effect of being asked about it.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** One named CLI profile. Every field is optional: `default` starts empty. */
export interface ProfileConfig {
  core?: string;
  satellite?: string;
  tenant?: string;
  initiative?: string;
  /**
   * GT-661 — the ruleset refs THIS TENANT has adopted.
   *
   * The principle the Core is built to: **the Core PROPOSES; the Tracker, CLI
   * and MCP configure and select.** Until this field existed the CLI could only
   * pass a selection somebody typed on the command line, which is not
   * configuration — it is a flag a person has to remember on every invocation,
   * and one they will eventually forget on the run that mattered.
   *
   * `--select` still wins when given: an explicit argument is a deliberate act
   * and must be able to override a stored default, including to widen it.
   * Absent from both, the Core evaluates its whole corpus and SAYS SO
   * (`selection.source: 'core-default'`) — the default is not changed here,
   * because a default that stopped blocking would silently disarm every gate
   * working today.
   *
   * Read `evolith rulesets` for the refs this Core accepts.
   */
  select?: string[];
}

/** The `conf` `projectName` the CLI registered under; part of the directory name. */
export const PROFILE_STORE_PROJECT_NAME = 'evolith-cli';
/** `conf` appends this to the project name to avoid clashing with native apps. */
export const PROFILE_STORE_PROJECT_SUFFIX = 'nodejs';
/** `conf` `configName` — the file's basename without extension. */
export const PROFILE_STORE_CONFIG_NAME = 'config';
/** `conf` `fileExtension` — historical; the body is JSON, see the module note. */
export const PROFILE_STORE_FILE_EXTENSION = 'yaml';
/** The profile every store starts with and falls back to. */
export const DEFAULT_PROFILE_NAME = 'default';
/** Environment variable that overrides the stored active profile for one process. */
export const PROFILE_ENV_VAR = 'EVOLITH_PROFILE';

/**
 * The profile-related defaults the CLI seeds a fresh store with. Exported so the
 * CLI's `conf` defaults and this reader's "missing key" behaviour are one object.
 */
export const PROFILE_STORE_DEFAULTS: Readonly<{
  activeProfile: string;
  profiles: Record<string, ProfileConfig>;
}> = Object.freeze({
  activeProfile: DEFAULT_PROFILE_NAME,
  profiles: { [DEFAULT_PROFILE_NAME]: {} },
});

/** The keys of the store this reader consults. */
export type ProfileStoreKey = 'activeProfile' | 'profiles';

/**
 * How the resolvers see a store: a key getter. The CLI passes
 * `(key) => conf.get(key)`; the MCP server passes a getter over a parsed file.
 */
export type ProfileStoreGetter = (key: ProfileStoreKey) => unknown;

/** A parsed store file — only the keys this reader cares about are typed. */
export interface ProfileStoreSnapshot {
  activeProfile?: unknown;
  profiles?: unknown;
  [key: string]: unknown;
}

export interface ProfileStoreLocationOptions {
  /** Defaults to `process.platform`. */
  platform?: NodeJS.Platform;
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to `os.homedir()`. */
  homedir?: string;
}

/**
 * The directory `conf` would pick for `projectName: 'evolith-cli'` — the
 * `config` entry of `env-paths('evolith-cli', { suffix: 'nodejs' })`, reproduced
 * here because `env-paths` (like `conf`) is ESM-only and this package is consumed
 * from CommonJS. The CLI's `config.service.spec.ts` asserts this against the real
 * `env-paths` on the running platform, so the two cannot drift unnoticed.
 */
export function resolveProfileStoreDir(options: ProfileStoreLocationOptions = {}): string {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const homedir = options.homedir ?? os.homedir();
  const name = `${PROFILE_STORE_PROJECT_NAME}-${PROFILE_STORE_PROJECT_SUFFIX}`;

  if (platform === 'darwin') {
    return path.join(homedir, 'Library', 'Preferences', name);
  }
  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
    return path.join(appData, name, 'Config');
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homedir, '.config'), name);
}

/** The store FILE — `<dir>/config.yaml`. */
export function resolveProfileStorePath(options: ProfileStoreLocationOptions = {}): string {
  return path.join(resolveProfileStoreDir(options), `${PROFILE_STORE_CONFIG_NAME}.${PROFILE_STORE_FILE_EXTENSION}`);
}

/**
 * Parse a store body the way `conf` does: `JSON.parse`, and the result must be
 * a plain object. Anything else is the same error `conf` raises, surfaced with a
 * message that names the file's real format.
 */
export function parseProfileStore(text: string): ProfileStoreSnapshot {
  const trimmed = text.trim();
  if (trimmed.length === 0) return {};
  const parsed: unknown = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('The CLI profile store must be a JSON object');
  }
  return parsed as ProfileStoreSnapshot;
}

/**
 * Read and parse the store at `filePath`. A missing file is an EMPTY store (the
 * CLI has never run) and resolves to the defaults; it is not created here.
 */
export function readProfileStore(filePath: string): ProfileStoreSnapshot {
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return {};
    throw error;
  }
  return parseProfileStore(text);
}

/** A getter over a snapshot, for the resolvers below. */
export function snapshotGetter(snapshot: ProfileStoreSnapshot): ProfileStoreGetter {
  return (key) => snapshot[key];
}

function profilesOf(get: ProfileStoreGetter): Record<string, ProfileConfig> {
  const raw = get('profiles');
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, ProfileConfig>;
  }
  return { ...PROFILE_STORE_DEFAULTS.profiles };
}

/**
 * The active profile name: `EVOLITH_PROFILE` wins for the process, then the
 * stored `activeProfile`, then `default`. Identical precedence to what the CLI
 * has always applied — it now applies it by calling this.
 */
export function resolveActiveProfile(get: ProfileStoreGetter, env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env[PROFILE_ENV_VAR];
  if (fromEnv) return fromEnv;
  const stored = get('activeProfile');
  return typeof stored === 'string' && stored.length > 0 ? stored : DEFAULT_PROFILE_NAME;
}

/** Every profile name the store holds; a store with none holds `default`. */
export function listProfileNames(get: ProfileStoreGetter): string[] {
  return Object.keys(profilesOf(get));
}

/** One profile's configuration (`{}` when it does not exist), the active one by default. */
export function getProfileConfig(get: ProfileStoreGetter, name?: string, env: NodeJS.ProcessEnv = process.env): ProfileConfig {
  const profileName = name || resolveActiveProfile(get, env);
  return profilesOf(get)[profileName] || {};
}

export interface ProfileStoreReaderOptions {
  /** Explicit store file; defaults to {@link resolveProfileStorePath}. */
  path?: string;
  /** Environment consulted for `EVOLITH_PROFILE`; defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Read-only view of the CLI profile store for surfaces that do not own it
 * (the MCP server). Every call re-reads the file: the CLI may switch or create
 * profiles while a long-lived server is up, and a cached snapshot would answer
 * with the state at boot.
 */
export class ProfileStoreReader {
  readonly path: string;
  private readonly env: NodeJS.ProcessEnv;

  constructor(options: ProfileStoreReaderOptions = {}) {
    this.path = options.path ?? resolveProfileStorePath({ env: options.env });
    this.env = options.env ?? process.env;
  }

  private getter(): ProfileStoreGetter {
    return snapshotGetter(readProfileStore(this.path));
  }

  activeProfile(): string {
    return resolveActiveProfile(this.getter(), this.env);
  }

  listProfiles(): string[] {
    return listProfileNames(this.getter());
  }

  profileExists(name: string): boolean {
    return this.listProfiles().includes(name);
  }

  getProfile(name?: string): ProfileConfig {
    return getProfileConfig(this.getter(), name, this.env);
  }
}
