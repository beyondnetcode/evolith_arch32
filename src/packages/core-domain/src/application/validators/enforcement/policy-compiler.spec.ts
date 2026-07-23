import {
  compileRule,
  compileRuleset,
  type CompilableRule,
  type EnforceBlock,
} from './policy-compiler';

describe('policy-compiler', () => {
  describe('compileRule', () => {
    it('returns fallback for non-enforcer rules', () => {
      const rule: CompilableRule = { id: 'TEST-01', enforce: { engine: 'native', tool: 'test' } };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.fallback).toBe('native');
        expect(outcome.ruleId).toBe('TEST-01');
      }
    });

    it('returns fallback for rules without enforce block', () => {
      const rule: CompilableRule = { id: 'TEST-02' };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('fallback');
    });

    it('returns fallback when tool has no registered compiler', () => {
      const rule: CompilableRule = {
        id: 'TEST-03',
        enforce: { engine: 'enforcer', tool: 'unknown-tool' },
      };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('fallback');
      if (outcome.kind === 'fallback') {
        expect(outcome.fallback).toBe('skip');
      }
    });

    it('compiles dependency-cruiser cycle rules', () => {
      const rule: CompilableRule = {
        id: 'TEST-04',
        enforce: { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node' },
        category: 'cycle',
      };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('compiled');
      if (outcome.kind === 'compiled') {
        expect(outcome.tool).toBe('dependency-cruiser');
        expect(outcome.check).toHaveProperty('to');
      }
    });

    it('compiles dependency-cruiser rules with config', () => {
      const rule: CompilableRule = {
        id: 'TEST-05',
        enforce: {
          engine: 'enforcer',
          tool: 'dependency-cruiser',
          config: { from: { path: 'src/' }, to: { path: 'lib/' } },
        },
      };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('compiled');
    });

    it('returns fallback for boundary rules without config', () => {
      const rule: CompilableRule = {
        id: 'TEST-06',
        enforce: { engine: 'enforcer', tool: 'dependency-cruiser' },
        category: 'boundary',
      };
      const outcome = compileRule(rule);
      expect(outcome.kind).toBe('fallback');
    });
  });

  describe('compileRuleset', () => {
    it('partitions rules into compiled and fallbacks', () => {
      const rules: CompilableRule[] = [
        { id: 'NATIVE-01', enforce: { engine: 'native', tool: 'test' } },
        { id: 'ENFORCER-01', enforce: { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node' }, category: 'cycle' },
        { id: 'ENFORCER-02', enforce: { engine: 'enforcer', tool: 'unknown-tool' } },
      ];

      const result = compileRuleset(rules);
      expect(result.compiled).toHaveLength(1);
      expect(result.fallbacks).toHaveLength(1);
    });

    it('ignores non-enforcer rules', () => {
      const rules: CompilableRule[] = [
        { id: 'NATIVE-01', enforce: { engine: 'native', tool: 'test' } },
        { id: 'OPA-01', enforce: { engine: 'opa', tool: 'test' } },
      ];

      const result = compileRuleset(rules);
      expect(result.compiled).toHaveLength(0);
      expect(result.fallbacks).toHaveLength(0);
    });

    it('handles empty ruleset', () => {
      const result = compileRuleset([]);
      expect(result.compiled).toHaveLength(0);
      expect(result.fallbacks).toHaveLength(0);
    });
  });
});
