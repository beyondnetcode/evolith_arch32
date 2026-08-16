/**
 * GT-705 — where THIS server finds the Core corpus.
 *
 * What this replaces, in nine places across five files:
 *
 *     const corePath = (args.corePath as string) || path.join(process.cwd(), '..', 'evolith');
 *
 * A sibling directory named `evolith`, relative to whatever the process happened
 * to be started in. That is the Evolith monorepo's own layout treated as a
 * property of the universe. Measured on the published 1.2.2 from a clean npm
 * prefix: `tools/list` returns 50 tools, `evolith-gate-evaluate` answers
 * RULESET_NOT_FOUND for `<cwd>/../evolith/reference/governance/sdlc/gates`, and
 * `evolith-validate` answers "could not locate the Evolith ruleset corpus". Only
 * `evolith-metrics`, which needs no corpus, worked.
 *
 * Self-sufficient with override, which is the shape the CLI already had:
 *
 *   1. what the CALLER passed (`corePath` on the tool call);
 *   2. `EVOLITH_CORE_PATH`, for an operator who mounts a tenant corpus;
 *   3. the corpus bundled in this package.
 *
 * `process.cwd()` is deliberately absent from that list. A resolver that guesses
 * from the working directory is one that answers differently depending on where
 * an agent happened to be launched, which is indistinguishable from a bug at the
 * point of failure — inside somebody else's agent.
 */

import { existsSync } from 'node:fs';
import { resolveCorpus, tryResolveCorpus } from '@beyondnet/evolith-infra-providers';
import { findCoreFromSatellite } from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';

/**
 * The Core root for this call. Throws with an actionable message when nothing
 * resolves, rather than returning a path that does not exist — the previous
 * behaviour failed later and further away, as RULESET_NOT_FOUND.
 */
export function resolveCorePath(explicit?: string, satellitePath?: string): string {
  // An explicit path is TAKEN AS GIVEN, not re-qualified here.
  //
  // Refusing an override that holds no corpus sounds stricter and is worse: the
  // repository downstream already refuses with a message naming every path it
  // tried, and validating twice only moves the failure earlier — in front of the
  // tool's own argument checks, so a bad `kind` started failing as a missing
  // corpus. What this row is about is the case where NOBODY named a path, and
  // the answer used to be a guess.
  const override = explicit?.trim() || process.env.EVOLITH_CORE_PATH?.trim();
  if (override) return override;

  // Walking UP from the satellite stays, and stays SECOND. It is the right answer
  // inside a monorepo, where the Core checkout really is an ancestor, and it is
  // content-qualified rather than name-shaped — which is the half of the old
  // behaviour that was correct. What it never was is an answer for someone who
  // installed the server from npm and has no such ancestor.
  if (satellitePath) {
    const walked = findCoreFromSatellite(satellitePath, { existsSync: (p) => existsSync(p) });
    if (walked) return walked;
  }

  // The floor: the corpus this package ships. `__dirname` so the walk finds THIS
  // package's copy, not one that happens to sit above the process.
  return resolveCorpus({ fromDir: __dirname }).coreRoot;
}

/**
 * The non-throwing form, for startup: the server must still come up so it can
 * SAY it has no corpus, instead of announcing 50 tools and discovering it at
 * call time.
 */
export function describeCorpusAtStartup(): string {
  const resolved = tryResolveCorpus({ override: process.env.EVOLITH_CORE_PATH?.trim(), fromDir: __dirname });
  if (!resolved) {
    return 'NO RULESET CORPUS RESOLVED — governance tools will fail. Set EVOLITH_CORE_PATH or install a build that bundles its corpus (GT-705).';
  }
  return `ruleset corpus: ${resolved.rulesetsRoot} (${resolved.source})`;
}
