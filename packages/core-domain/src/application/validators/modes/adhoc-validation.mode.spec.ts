/**
 * GT-312: Ad-hoc Validation Mode - Unit Tests
 */

import { AdhocValidationMode } from './adhoc-validation.mode';
import { ValidationContext } from './validation-mode.interface';

describe('AdhocValidationMode', () => {
  let mode: AdhocValidationMode;

  beforeEach(() => {
    mode = new AdhocValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when filePath is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        filePath: 'src/domain/user.ts',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return true when customRules are provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        customRules: [{ id: 'custom-rule', check: () => true }],
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return false when neither filePath nor customRules are provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };
      expect(mode.canHandle(context)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return skipped status when no file or custom rules', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('adhoc');
      expect(result.status).toBe('skipped');
    });
  });
});
