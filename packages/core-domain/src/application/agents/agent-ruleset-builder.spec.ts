import { buildAgentRuleset } from './agent-ruleset-builder';

describe('buildAgentRuleset', () => {
  const base = { name: 'octo', template: 'default', adrs: [], rulesets: [] };

  it('always emits the identity principle AGT-01', () => {
    const out = buildAgentRuleset(base);
    expect(out.principles.map(p => p.id)).toEqual(['AGT-01']);
    expect(out.principles[0].statement).toContain('octo');
  });

  it('adds audit + approval principles for enterprise template', () => {
    const out = buildAgentRuleset({ ...base, template: 'enterprise' });
    const ids = out.principles.map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['AGT-01', 'AGT-02', 'AGT-03']));
    expect(out.principles.find(p => p.id === 'AGT-03')?.blocking).toBe(false);
  });

  it('adds hexagonal principle when ADR-0002 is selected', () => {
    const out = buildAgentRuleset({ ...base, adrs: ['adr-0002'] });
    expect(out.principles.some(p => p.id === 'AGT-HXA-01')).toBe(true);
  });

  it('adds testing-pyramid principle when ADR-0018 is selected', () => {
    const out = buildAgentRuleset({ ...base, adrs: ['adr-0018'] });
    const p = out.principles.find(x => x.id === 'AGT-TP-01');
    expect(p?.severity).toBe('SHOULD');
    expect(p?.blocking).toBe(false);
  });

  it('adds ACL principle when ruleset acl is selected', () => {
    const out = buildAgentRuleset({ ...base, rulesets: ['acl'] });
    expect(out.principles.some(p => p.id === 'AGT-ACL-01')).toBe(true);
  });

  it('returns agent/ruleset/metadata envelope with the input echoed', () => {
    const out = buildAgentRuleset({
      name: 'a',
      template: 'enterprise',
      adrs: ['adr-0002', 'adr-0018'],
      rulesets: ['acl'],
    });
    expect(out.agent.name).toBe('a');
    expect(out.agent.template).toBe('enterprise');
    expect(out.agent.version).toBe('1.0.0');
    expect(typeof out.agent.installedAt).toBe('string');
    expect(out.ruleset).toEqual({ version: '1.0', type: 'agent', scope: 'governance' });
    expect(out.metadata).toEqual({ adrs: ['adr-0002', 'adr-0018'], rulesets: ['acl'] });
    expect(out.principles).toHaveLength(6);
  });
});
