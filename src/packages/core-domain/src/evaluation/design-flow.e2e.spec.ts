/**
 * Design-flow E2E (GT-433 / ADR-0104). Exercises the whole advisory design chain
 * against the REAL Core corpus: recommend a topology from signals → confirm the
 * composition → evaluate a composed blueprint → get technical maturity +
 * downstream criteria. Proves F2 (designProfiles) + F5 (recommender) + F4/F7
 * (design evaluator) work together end-to-end.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TopologyRecommendationService, TopologyRecommendationRules } from '../application/services/topology-recommendation.service';
import { createDesignKindEvaluator } from './kind-evaluators';
import { Verdict } from '../domain/verdict/verdict';

const repoRoot = path.resolve(__dirname, '../../../../..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));

const rules = readJson('src/rulesets/architecture/topology-recommendation.rules.json') as TopologyRecommendationRules;

const MANIFEST: Record<string, string> = {
  'distributed-modules': 'reference/core/architecture/topologies/progressive-axis/distributed-modules/topology.manifest.json',
  'event-driven': 'reference/core/architecture/topologies/integration/event-driven/topology.manifest.json',
};
const getDesignProfile = async (_corePath: string, ref: string) => {
  const rel = MANIFEST[ref];
  return rel ? readJson(rel).spec.designProfile : undefined;
};

describe('Design flow E2E (GT-433, real corpus)', () => {
  it('recommends → confirms → evaluates a composed blueprint and measures maturity', async () => {
    // 1. Recommend from technical signals (F5, real rules).
    const rec = new TopologyRecommendationService().recommend(rules, { deploymentIndependence: true, asyncIntegration: true });
    expect(rec.recommended).toEqual(['distributed-modules', 'event-driven']);

    // 2. Confirm the composition and compose a blueprint (one block missing on purpose).
    const design = {
      topologyConfirmedRefs: rec.recommended,
      blocks: [
        { blockKind: 'architecture-blueprint' },
        { blockKind: 'testing-strategy' },
        { blockKind: 'adr-registry' },
        { blockKind: 'topology-compliance-matrix' },
        { blockKind: 'technical-maturity-evaluation' },
        { blockKind: 'devops-cicd-plan' },
        { blockKind: 'infrastructure-plan' },
        { blockKind: 'performance-plan' },
        { blockKind: 'event-contract-catalog' },
        // 'async-payload-schema-set' intentionally missing
      ],
    };

    // 3. Evaluate (F4/F7, real designProfiles from the manifests).
    const ev = createDesignKindEvaluator(getDesignProfile, () => repoRoot);
    const r = await ev.evaluate({ kinds: ['design'], workspaceRef: 'ws', design } as any, { satellitePath: '/sat', corePath: repoRoot });

    // Advisory: never fails the overall verdict.
    expect(r.verdict).toBe(Verdict.PASS);
    const d = r.results.design!;
    // required = 5 universal + DM(3) + ED(2) = 10; present = 9 → 90.
    expect(d.technicalMaturity).toBe(90);
    expect(d.missingArtifacts).toEqual(['async-payload-schema-set']);
    // Generative contract: downstream criteria derived from present blocks (F7).
    expect(d.downstreamCriteria!.length).toBeGreaterThan(0);
    expect(d.downstreamCriteria!.some((c) => c.message.startsWith('[quality]'))).toBe(true);
  });
});
