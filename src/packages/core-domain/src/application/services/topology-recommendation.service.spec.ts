import { TopologyRecommendationService, TopologyRecommendationRules } from './topology-recommendation.service';

const rules: TopologyRecommendationRules = {
  id: 'topology-recommendation',
  version: '1.0.0',
  progressive: [
    { id: 'REC-MM', when: {}, recommend: 'modular-monolith', rationale: 'default', priority: 1 },
    { id: 'REC-DM', when: { deploymentIndependence: true }, recommend: 'distributed-modules', rationale: 'indep', priority: 2 },
    { id: 'REC-MS', when: { deploymentIndependence: true, highScale: true, teamCountMin: 3 }, recommend: 'microservices', rationale: 'scale', priority: 3 },
  ],
  dimensions: [
    { id: 'REC-ED', when: { asyncIntegration: true }, recommend: 'event-driven', rationale: 'async' },
    { id: 'REC-AI', when: { aiAgents: true }, recommend: 'agentic-ai', rationale: 'agents' },
  ],
};

describe('TopologyRecommendationService (GT-430)', () => {
  const svc = new TopologyRecommendationService();

  it('recommends modular-monolith by default (no signals)', () => {
    const r = svc.recommend(rules, {});
    expect(r.recommended).toEqual(['modular-monolith']);
    expect(r.composition).toBe('modular-monolith');
  });

  it('recommends distributed-modules for deployment independence', () => {
    const r = svc.recommend(rules, { deploymentIndependence: true });
    expect(r.recommended).toEqual(['distributed-modules']);
  });

  it('escalates to microservices when scale + multiple teams justify it', () => {
    const r = svc.recommend(rules, { deploymentIndependence: true, highScale: true, teamCount: 4 });
    expect(r.recommended[0]).toBe('microservices');
  });

  it('does NOT escalate to microservices below the team threshold', () => {
    const r = svc.recommend(rules, { deploymentIndependence: true, highScale: true, teamCount: 2 });
    expect(r.recommended[0]).toBe('distributed-modules');
  });

  it('composes dimensions onto the base (mixed topology)', () => {
    const r = svc.recommend(rules, { asyncIntegration: true, aiAgents: true });
    expect(r.recommended).toEqual(['modular-monolith', 'event-driven', 'agentic-ai']);
    expect(r.composition).toBe('modular-monolith + event-driven + agentic-ai');
    expect(r.rationale).toHaveLength(3);
  });
});
