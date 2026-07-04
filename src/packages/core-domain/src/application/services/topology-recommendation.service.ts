/**
 * TopologyRecommendationService (GT-430 / ADR-0104).
 *
 * ADVISORY, stateless: given technical signals it recommends a topology
 * composition using the declarative `topology-recommendation.rules.json`. The
 * Core RECOMMENDS (in Discovery); the tenant CONFIRMS (in Design). Nothing is
 * persisted and nothing is binding.
 */

export interface TopologyRecommendationSignals {
  /** Number of autonomous teams/squads. */
  readonly teamCount?: number;
  readonly deploymentIndependence?: boolean;
  readonly highScale?: boolean;
  readonly asyncIntegration?: boolean;
  readonly dataProductSharing?: boolean;
  readonly spikyLoad?: boolean;
  readonly latencyTolerant?: boolean;
  readonly edgeOrOffline?: boolean;
  readonly aiAgents?: boolean;
  readonly [signal: string]: number | boolean | undefined;
}

export interface TopologyRecommendationRule {
  readonly id: string;
  readonly when?: Readonly<Record<string, boolean | number>>;
  readonly recommend: string;
  readonly rationale: string;
  readonly priority?: number;
}

export interface TopologyRecommendationRules {
  readonly id: string;
  readonly version: string;
  readonly progressive: readonly TopologyRecommendationRule[];
  readonly dimensions: readonly TopologyRecommendationRule[];
}

export interface TopologyRecommendation {
  /** Recommended composition: [base progressive topology, ...composable dimensions]. */
  readonly recommended: readonly string[];
  /** Human-readable composition, e.g. "distributed-modules + event-driven". */
  readonly composition: string;
  readonly rationale: readonly { readonly topology: string; readonly ruleId: string; readonly reason: string }[];
}

export class TopologyRecommendationService {
  /** Does every condition in `when` hold for these signals? Empty `when` always matches. */
  private matches(when: Readonly<Record<string, boolean | number>> | undefined, signals: TopologyRecommendationSignals): boolean {
    for (const [key, expected] of Object.entries(when ?? {})) {
      if (key === 'teamCountMin') {
        if (!(typeof signals.teamCount === 'number' && signals.teamCount >= (expected as number))) return false;
      } else if (signals[key] !== expected) {
        return false;
      }
    }
    return true;
  }

  recommend(rules: TopologyRecommendationRules, signals: TopologyRecommendationSignals): TopologyRecommendation {
    // Progressive axis: the highest-priority matching rule wins (modular-monolith is the default).
    const base = [...rules.progressive]
      .filter((r) => this.matches(r.when, signals))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0]
      ?? rules.progressive.find((r) => !r.when || Object.keys(r.when).length === 0);

    // Composable dimensions: every matching rule adds its topology.
    const dims = rules.dimensions.filter((r) => this.matches(r.when, signals));

    const chosen = [base, ...dims].filter((r): r is TopologyRecommendationRule => !!r);
    const recommended = chosen.map((r) => r.recommend);
    return {
      recommended,
      composition: recommended.join(' + '),
      rationale: chosen.map((r) => ({ topology: r.recommend, ruleId: r.id, reason: r.rationale })),
    };
  }
}
