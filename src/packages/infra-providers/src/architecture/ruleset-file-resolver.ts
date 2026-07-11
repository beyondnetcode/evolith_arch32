import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Resolve a ruleset file that may live under either `<coreRoot>/src/rulesets`
 * (a source checkout) or `<coreRoot>/rulesets` (a bundled/installed layout),
 * returning the first candidate that exists.
 *
 * This mirrors the dual-probe TopologyCatalogService already performs for the
 * topologies family, so EVERY surface (CLI, MCP) locates the same file
 * regardless of the core's on-disk layout. Previously the CLI resolved the
 * topology-recommendation rules via resolveRulesets().rulesetsRoot (which could
 * pick an incomplete `<core>/rulesets` that has topologies/ but not
 * architecture/) while the MCP tool hard-coded `<core>/src/rulesets/...`, so the
 * two surfaces disagreed for the same core (cross-surface divergence surfaced by
 * the exploration tester on recommend-topology). It intentionally does NOT touch
 * the GT-474-hardened resolveRulesets probe order.
 *
 * @param coreRoot   the Core checkout root (a consumer appends its own subpath).
 * @param relUnderRulesets  the path under the rulesets dir, e.g.
 *                          `architecture/topology-recommendation.rules.json`.
 * @throws when the file exists under neither candidate, with an actionable message.
 */
export function resolveRulesetFilePath(coreRoot: string, relUnderRulesets: string): string {
  const candidates = [
    path.join(coreRoot, 'src', 'rulesets', relUnderRulesets),
    path.join(coreRoot, 'rulesets', relUnderRulesets),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Ruleset file not found under ${coreRoot} (tried src/rulesets and rulesets): ${relUnderRulesets}`,
  );
}
