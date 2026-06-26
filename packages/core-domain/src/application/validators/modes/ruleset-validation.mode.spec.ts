/**
 * GT-312: Ruleset Validation Mode - Unit Tests
 */

import { RulesetValidationMode } from './ruleset-validation.mode';
import { ValidationContext } from './validation-mode.interface';

describe('RulesetValidationMode', () => {
  let mode: RulesetValidationMode;

  beforeEach(() => {
    mode = new RulesetValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when rulesetId is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        rulesetId: 'compliance-baseline',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return false when rulesetId is not provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };
      expect(mode.canHandle(context)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate ruleset when rulesetId is provided', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        rulesetId: 'compliance-baseline',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('ruleset');
      expect(result.metadata).toEqual({ rulesetId: 'compliance-baseline' });
    });
  });
});
