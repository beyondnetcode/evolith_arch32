/**
 * GT-312: Composable Validation Engine - Unit Tests
 */

import { ComposableValidationEngine } from './composable-validation-engine';
import { ValidationContext, ValidationMode } from './validation-mode.interface';

describe('ComposableValidationEngine', () => {
  let engine: ComposableValidationEngine;

  beforeEach(() => {
    engine = new ComposableValidationEngine();
  });

  describe('registerMode', () => {
    it('should register a validation mode', () => {
      const mockMode: ValidationMode = {
        name: 'ruleset',
        canHandle: () => true,
        validate: async () => ({
          mode: 'ruleset',
          status: 'passed',
          rulesChecked: 1,
          issues: [],
        }),
      };

      engine.registerMode(mockMode);
      expect(engine).toBeDefined();
    });
  });

  describe('resolveModes', () => {
    it('should resolve modes based on context', () => {
      const mockMode: ValidationMode = {
        name: 'architecture',
        canHandle: (ctx) => !!ctx.topology,
        validate: async () => ({
          mode: 'architecture',
          status: 'passed',
          rulesChecked: 1,
          issues: [],
        }),
      };

      engine.registerMode(mockMode);

      const contextWithTopology: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        topology: 'modular-monolith',
      };

      const contextWithoutTopology: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };

      expect(engine.resolveModes(contextWithTopology)).toHaveLength(1);
      expect(engine.resolveModes(contextWithoutTopology)).toHaveLength(0);
    });

    it('should fallback to ruleset mode when no modes match', () => {
      const mockRulesetMode: ValidationMode = {
        name: 'ruleset',
        canHandle: () => false,
        validate: async () => ({
          mode: 'ruleset',
          status: 'passed',
          rulesChecked: 1,
          issues: [],
        }),
      };

      engine.registerMode(mockRulesetMode);

      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };

      const resolved = engine.resolveModes(context);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].name).toBe('ruleset');
    });
  });

  describe('execute', () => {
    it('should execute all resolved modes and return unified result', async () => {
      const mockMode1: ValidationMode = {
        name: 'architecture',
        canHandle: (ctx) => !!ctx.topology,
        validate: async () => ({
          mode: 'architecture',
          status: 'passed',
          rulesChecked: 5,
          issues: [
            { ruleId: 'R1', status: 'pass', message: 'Rule 1 passed', severity: 'info' },
            { ruleId: 'R2', status: 'pass', message: 'Rule 2 passed', severity: 'info' },
          ],
        }),
      };

      const mockMode2: ValidationMode = {
        name: 'ruleset',
        canHandle: (ctx) => !!ctx.rulesetId,
        validate: async () => ({
          mode: 'ruleset',
          status: 'failed',
          rulesChecked: 3,
          issues: [
            { ruleId: 'R3', status: 'pass', message: 'Rule 3 passed', severity: 'info' },
            { ruleId: 'R4', status: 'fail', message: 'Rule 4 failed', severity: 'error' },
          ],
        }),
      };

      engine.registerMode(mockMode1);
      engine.registerMode(mockMode2);

      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        topology: 'modular-monolith',
        rulesetId: 'compliance-baseline',
      };

      const result = await engine.execute(context);

      expect(result.status).toBe('failed');
      expect(result.modes).toHaveLength(2);
      expect(result.totalRulesChecked).toBe(8);
      expect(result.failedRules).toBe(1);
      expect(result.passedRules).toBe(7);
      expect(result.performanceMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle mode execution errors gracefully', async () => {
      const failingMode: ValidationMode = {
        name: 'adhoc',
        canHandle: () => true,
        validate: async () => {
          throw new Error('Mode execution failed');
        },
      };

      engine.registerMode(failingMode);

      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };

      const result = await engine.execute(context);

      expect(result.status).toBe('failed');
      expect(result.modes).toHaveLength(1);
      expect(result.modes[0].issues[0].ruleId).toBe('MODE_EXECUTION_ERROR');
    });

    it('should merge results from multiple modes correctly', async () => {
      const mode1: ValidationMode = {
        name: 'sdlc',
        canHandle: (ctx) => !!ctx.phase,
        validate: async () => ({
          mode: 'sdlc',
          status: 'passed',
          rulesChecked: 10,
          issues: Array.from({ length: 10 }, (_, i) => ({
            ruleId: `SDLC-${i}`,
            status: 'pass' as const,
            message: `SDLC rule ${i} passed`,
            severity: 'info' as const,
          })),
        }),
      };

      const mode2: ValidationMode = {
        name: 'adr',
        canHandle: (ctx) => !!ctx.adrId,
        validate: async () => ({
          mode: 'adr',
          status: 'warning',
          rulesChecked: 5,
          issues: [
            { ruleId: 'ADR-1', status: 'pass', message: 'ADR 1 passed', severity: 'info' },
            { ruleId: 'ADR-2', status: 'warn', message: 'ADR 2 warning', severity: 'warning' },
          ],
        }),
      };

      engine.registerMode(mode1);
      engine.registerMode(mode2);

      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        phase: 'f1',
        adrId: 'adr-0002',
      };

      const result = await engine.execute(context);

      expect(result.status).toBe('warning');
      expect(result.totalRulesChecked).toBe(15);
      expect(result.modes).toHaveLength(2);
      expect(result.modes[0].mode).toBe('sdlc');
      expect(result.modes[1].mode).toBe('adr');
    });
  });
});
