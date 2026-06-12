import { buildAgentRuleset, AgentRulesetInput } from './agent-ruleset-builder';

describe('AgentRulesetBuilder', () => {
  describe('buildAgentRuleset', () => {
    it('should build ruleset with agent identity principle', () => {
      const input: AgentRulesetInput = {
        name: 'test-agent',
        template: 'standard',
        adrs: [],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset.agent.name).toBe('test-agent');
      expect(ruleset.principles).toHaveLength(1);
      expect(ruleset.principles[0].id).toBe('AGT-01');
      expect(ruleset.principles[0].severity).toBe('MUST');
      expect(ruleset.principles[0].blocking).toBe(true);
    });

    it('should add enterprise principles for enterprise template', () => {
      const input: AgentRulesetInput = {
        name: 'enterprise-agent',
        template: 'enterprise',
        adrs: [],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      const principleIds = ruleset.principles.map(p => p.id);
      expect(principleIds).toContain('AGT-01');
      expect(principleIds).toContain('AGT-02');
      expect(principleIds).toContain('AGT-03');
      expect(ruleset.principles).toHaveLength(3);
    });

    it('should add hexagonal architecture principle when adr-0002 selected', () => {
      const input: AgentRulesetInput = {
        name: 'hex-agent',
        template: 'standard',
        adrs: ['adr-0002'],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      const principleIds = ruleset.principles.map(p => p.id);
      expect(principleIds).toContain('AGT-HXA-01');
      expect(ruleset.principles).toHaveLength(2);
    });

    it('should add testing pyramid principle when adr-0018 selected', () => {
      const input: AgentRulesetInput = {
        name: 'test-pyramid-agent',
        template: 'standard',
        adrs: ['adr-0018'],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      const principleIds = ruleset.principles.map(p => p.id);
      expect(principleIds).toContain('AGT-TP-01');
      expect(ruleset.principles[1].severity).toBe('SHOULD');
      expect(ruleset.principles[1].blocking).toBe(false);
    });

    it('should add ACL principle when acl ruleset selected', () => {
      const input: AgentRulesetInput = {
        name: 'acl-agent',
        template: 'standard',
        adrs: [],
        rulesets: ['acl'],
      };

      const ruleset = buildAgentRuleset(input);

      const principleIds = ruleset.principles.map(p => p.id);
      expect(principleIds).toContain('AGT-ACL-01');
      expect(ruleset.principles[1].blocking).toBe(true);
    });

    it('should include metadata with adrs and rulesets', () => {
      const input: AgentRulesetInput = {
        name: 'metadata-agent',
        template: 'minimal',
        adrs: ['adr-0002', 'adr-0018'],
        rulesets: ['acl', 'open-core'],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset.metadata.adrs).toEqual(['adr-0002', 'adr-0018']);
      expect(ruleset.metadata.rulesets).toEqual(['acl', 'open-core']);
    });

    it('should have correct ruleset structure', () => {
      const input: AgentRulesetInput = {
        name: 'structure-agent',
        template: 'standard',
        adrs: [],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset).toHaveProperty('agent');
      expect(ruleset).toHaveProperty('ruleset');
      expect(ruleset).toHaveProperty('principles');
      expect(ruleset).toHaveProperty('metadata');
      expect(ruleset.ruleset.type).toBe('agent');
      expect(ruleset.ruleset.scope).toBe('governance');
      expect(ruleset.ruleset.version).toBe('1.0');
    });

    it('should combine multiple ADRs and rulesets', () => {
      const input: AgentRulesetInput = {
        name: 'full-agent',
        template: 'enterprise',
        adrs: ['adr-0002', 'adr-0018', 'adr-0032'],
        rulesets: ['acl', 'open-core', 'inheritance'],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset.principles).toHaveLength(6);
      expect(ruleset.metadata.adrs).toHaveLength(3);
      expect(ruleset.metadata.rulesets).toHaveLength(3);
    });

    it('should set correct version and timestamp', () => {
      const input: AgentRulesetInput = {
        name: 'version-agent',
        template: 'standard',
        adrs: [],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset.agent.version).toBe('1.0.0');
      expect(ruleset.agent.installedAt).toBeDefined();
      expect(new Date(ruleset.agent.installedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle minimal template with no extra principles', () => {
      const input: AgentRulesetInput = {
        name: 'minimal-agent',
        template: 'minimal',
        adrs: [],
        rulesets: [],
      };

      const ruleset = buildAgentRuleset(input);

      expect(ruleset.principles).toHaveLength(1);
      expect(ruleset.principles[0].id).toBe('AGT-01');
    });
  });
});
