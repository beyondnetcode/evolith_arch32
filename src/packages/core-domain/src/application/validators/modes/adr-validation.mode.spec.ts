/**
 * GT-312: ADR Validation Mode - Unit Tests
 */

import { AdrValidationMode } from './adr-validation.mode';
import { ValidationContext } from './validation-mode.interface';

describe('AdrValidationMode', () => {
  let mode: AdrValidationMode;

  beforeEach(() => {
    mode = new AdrValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when adrId is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        adrId: 'adr-0002',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return false when adrId is not provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };
      expect(mode.canHandle(context)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate ADR when adrId is provided', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        adrId: 'adr-0002',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('adr');
      expect(result.metadata).toEqual({ adrId: 'adr-0002' });
    });

    it('should return error for unknown ADR', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        adrId: 'adr-9999',
      };

      const result = await mode.validate(context);

      expect(result.status).toBe('failed');
      expect(result.issues[0].ruleId).toBe('ADR_UNKNOWN');
    });
  });
});
