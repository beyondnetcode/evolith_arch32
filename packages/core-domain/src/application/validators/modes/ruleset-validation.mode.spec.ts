/**
 * GT-312: Ruleset Validation Mode - Unit Tests
 */

import { RulesetValidationMode } from './ruleset-validation.mode';
import { ValidationContext } from './validation-mode.interface';
import path from 'path';

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
    it.each([
      ['compliance-baseline', 7],
      ['definition-of-done', 10],
      ['engineering-manifesto', 10],
    ])('should validate %s ruleset when rulesetId is provided', async (rulesetId, expectedRuleCount) => {
      const repoRoot = path.resolve(__dirname, '../../../../../..');
      const context: ValidationContext = {
        satellitePath: repoRoot,
        corePath: repoRoot,
        engine: 'native',
        rulesetId,
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('ruleset');
      expect(result.status).toBe('passed');
      expect(result.rulesChecked).toBe(expectedRuleCount);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: 'RULESET-LOADED',
            status: 'pass',
          }),
        ]),
      );
      expect(result.metadata).toEqual({ rulesetId });
    });
  });
});
