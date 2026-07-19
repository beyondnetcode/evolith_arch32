/**
 * @file rulesets-location.ts
 * @description Fail-closed resolution of the Core ruleset corpus root under a
 * `corePath` (GT-566). The application-code sibling of
 * `.harness/scripts/lib/paths.mjs`.
 *
 * ## Why this exists
 *
 * A `corePath` (the REST API's `CORE_PATH`, the CLI's `--core` /
 * `EVOLITH_CORE_PATH`) points at an Evolith Core checkout, and consumers append
 * a subpath to reach the ruleset corpus. Two layouts are legitimate:
 *
 *   - `<core>/rulesets`     — the corpus bundled inside the published CLI package
 *                             (`src/sdk/cli/rulesets`), and the shape a container
 *                             corpus mount takes.
 *   - `<core>/src/rulesets` — the authored corpus in the Core monorepo (the
 *                             harness calls this key `rulesets`; it is the SSOT).
 *
 * Every consumer therefore probes both. The bug this module fixes is *how* they
 * probed: by directory **existence**.
 *
 * In the Core monorepo BOTH paths exist, and they are not the same thing.
 * `<repo>/rulesets` is the *satellite-side* agents directory — the Core repo is
 * itself a satellite, and `AgentRegistryService` reads `<repo>/rulesets/agents`.
 * It holds `agents/agents-registry.json` and not one `*.rules.json`. An
 * existence check picks it first and stops, so the 145-file corpus at
 * `<repo>/src/rulesets` is never seen. `CORE_PATH=<repo root>` then produced a
 * 422 `RULESET_NOT_FOUND` that read like a missing ruleset, when the real fault
 * was that resolution had latched onto a directory that merely shared a name.
 *
 * This is the dead-path family GT-556/557 closed across the harness and GT-445
 * closed in the inventory generator — a path that resolves to the wrong tree and
 * reports emptiness as an answer. The structural fix is the same one
 * `paths.mjs` applies: **qualify a candidate by its contents, not its name**,
 * and fail loudly, naming every path tried, when none qualifies.
 */

/**
 * Subpaths, in priority order, under which a ruleset corpus may live relative to
 * a `corePath`. Order is deliberate but not load-bearing — qualification is by
 * content, so a non-corpus directory at an earlier candidate is skipped rather
 * than latched onto.
 */
export const RULESETS_CANDIDATE_SUBPATHS: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(['rulesets']),
  Object.freeze(['src', 'rulesets']),
]);

/**
 * Directory names that identify a directory as a ruleset corpus root. These are
 * the canonical ruleset families; any one of them is sufficient.
 *
 * `agents` is deliberately ABSENT. That omission is the entire fix: the
 * satellite-side `rulesets/agents` directory must NOT qualify as a corpus, or it
 * shadows the real one.
 */
export const RULESETS_CORPUS_MARKERS: ReadonlySet<string> = Object.freeze(
  new Set([
    'schema',
    'architecture',
    'topologies',
    'sdlc',
    'governance',
    'contracts',
    'enforcement',
    'evidence',
    'acl',
    'adr',
    'blueprints',
    'opa',
  ]),
) as ReadonlySet<string>;

/** Outcome of probing a single candidate directory. */
export interface RulesetsCandidateProbe {
  /** The absolute candidate path that was probed. */
  path: string;
  /** Whether the directory exists at all. */
  exists: boolean;
  /**
   * Whether it looks like a ruleset corpus (holds a canonical family directory
   * or a `*.rules.json`). Only meaningful when `exists` is true.
   */
  isCorpus: boolean;
  /** Entry names found, when the directory existed and could be listed. */
  entries?: string[];
}

/** Joins a candidate subpath onto `corePath` using the caller's path separator. */
function joinCandidate(corePath: string, parts: readonly string[], sep: string): string {
  const trimmed = corePath.endsWith(sep) ? corePath.slice(0, -sep.length) : corePath;
  return [trimmed, ...parts].join(sep);
}

/** Candidate corpus roots under `corePath`, in probe order. */
export function rulesetsCandidatePaths(corePath: string, sep = '/'): string[] {
  return RULESETS_CANDIDATE_SUBPATHS.map((parts) => joinCandidate(corePath, parts, sep));
}

/**
 * Decide whether a directory listing is that of a ruleset corpus root.
 *
 * Content-based on purpose: a corpus holds canonical family directories or
 * `*.rules.json` files. A directory holding only `agents/` is a satellite agents
 * directory, not a corpus, however it is named.
 */
export function entriesLookLikeCorpus(entries: readonly string[]): boolean {
  return entries.some(
    (entry) => entry.endsWith('.rules.json') || RULESETS_CORPUS_MARKERS.has(entry),
  );
}

/**
 * Build the actionable message for a failed corpus resolution.
 *
 * The message must distinguish the two failure modes, because they need
 * different fixes and a caller who cannot tell them apart guesses:
 *
 *   - nothing exists at any candidate → `corePath` is wrong;
 *   - something exists but is not corpus-shaped → the LAYOUT is wrong, and the
 *     message says which directory was found and what was in it.
 */
export function describeRulesetsResolutionFailure(
  corePath: string,
  probes: readonly RulesetsCandidateProbe[],
): string {
  const lines: string[] = [
    `Could not locate the Evolith ruleset corpus under core path "${corePath}".`,
    'Tried, in order:',
  ];

  for (const probe of probes) {
    if (!probe.exists) {
      lines.push(`  - "${probe.path}" — does not exist`);
    } else if (!probe.isCorpus) {
      const found = probe.entries?.length
        ? probe.entries.slice(0, 8).join(', ') +
          (probe.entries.length > 8 ? `, … (${probe.entries.length} entries)` : '')
        : '(empty)';
      lines.push(
        `  - "${probe.path}" — EXISTS but is not a ruleset corpus; it contains: ${found}`,
      );
    } else {
      lines.push(`  - "${probe.path}" — corpus found (unexpected: resolution should have succeeded)`);
    }
  }

  const shadowed = probes.find((p) => p.exists && !p.isCorpus);
  if (shadowed) {
    lines.push(
      '',
      `The layout is likely wrong rather than the ruleset missing: "${shadowed.path}" ` +
        'exists but holds none of the canonical ruleset families ' +
        `(${[...RULESETS_CORPUS_MARKERS].sort().join(', ')}) and no *.rules.json. ` +
        'In the Evolith Core monorepo the authored corpus is `src/rulesets`, while ' +
        '`rulesets/agents` is the satellite-side agents directory — do not point ' +
        'CORE_PATH at a tree whose `rulesets/` is the latter.',
    );
  } else {
    lines.push(
      '',
      'Point CORE_PATH (or --core / EVOLITH_CORE_PATH) at an Evolith Core checkout ' +
        'or a mounted corpus, or omit --core to use the rulesets bundled with the CLI.',
    );
  }

  return lines.join('\n');
}

/** Minimal async filesystem surface this resolver needs. */
export interface RulesetsProbeFsAsync {
  exists(p: string): Promise<boolean>;
  readdirNames(p: string): Promise<string[]>;
}

/** Minimal sync filesystem surface this resolver needs. */
export interface RulesetsProbeFsSync {
  existsSync(p: string): boolean;
  readdirNamesSync(p: string): string[];
}

/** Successful resolution. */
export interface ResolvedRulesetsLocation {
  /** The directory that directly contains the canonical ruleset families. */
  rulesetsRoot: string;
  /** Every candidate probed, in order — for diagnostics and tests. */
  probes: RulesetsCandidateProbe[];
}

/**
 * Resolve the corpus root under `corePath`, or return the probe trail so the
 * caller can raise its own domain error.
 *
 * Returns `undefined` for `rulesetsRoot` rather than throwing so each consumer
 * can wrap the failure in the error type its layer speaks
 * (`RulesetsNotFoundError`, a CLI `Error`, …) while sharing one diagnosis.
 */
export async function probeRulesetsLocation(
  corePath: string,
  fs: RulesetsProbeFsAsync,
  sep = '/',
): Promise<{ rulesetsRoot?: string; probes: RulesetsCandidateProbe[] }> {
  const probes: RulesetsCandidateProbe[] = [];

  for (const candidate of rulesetsCandidatePaths(corePath, sep)) {
    if (!(await fs.exists(candidate))) {
      probes.push({ path: candidate, exists: false, isCorpus: false });
      continue;
    }

    let entries: string[] = [];
    try {
      entries = await fs.readdirNames(candidate);
    } catch {
      // Unreadable directory: record it as existing-but-unusable rather than
      // letting an EACCES masquerade as "no corpus here".
      probes.push({ path: candidate, exists: true, isCorpus: false, entries: [] });
      continue;
    }

    const isCorpus = entriesLookLikeCorpus(entries);
    probes.push({ path: candidate, exists: true, isCorpus, entries });
    if (isCorpus) return { rulesetsRoot: candidate, probes };
  }

  return { probes };
}

/** Synchronous twin of {@link probeRulesetsLocation}. */
export function probeRulesetsLocationSync(
  corePath: string,
  fs: RulesetsProbeFsSync,
  sep = '/',
): { rulesetsRoot?: string; probes: RulesetsCandidateProbe[] } {
  const probes: RulesetsCandidateProbe[] = [];

  for (const candidate of rulesetsCandidatePaths(corePath, sep)) {
    if (!fs.existsSync(candidate)) {
      probes.push({ path: candidate, exists: false, isCorpus: false });
      continue;
    }

    let entries: string[] = [];
    try {
      entries = fs.readdirNamesSync(candidate);
    } catch {
      probes.push({ path: candidate, exists: true, isCorpus: false, entries: [] });
      continue;
    }

    const isCorpus = entriesLookLikeCorpus(entries);
    probes.push({ path: candidate, exists: true, isCorpus, entries });
    if (isCorpus) return { rulesetsRoot: candidate, probes };
  }

  return { probes };
}
