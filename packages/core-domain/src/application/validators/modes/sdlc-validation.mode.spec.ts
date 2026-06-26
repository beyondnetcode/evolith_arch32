/**
 * GT-312: SDLC Validation Mode - Unit Tests
 */

import { SdlcValidationMode } from './sdlc-validation.mode';
import { ValidationContext } from './validation-mode.interface';

describe('SdlcValidationMode', () => {
  let mode: SdlcValidationMode;

  beforeEach(() => {
    mode = new SdlcValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when phase is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        phase: 'f1',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return true when topology is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        topology: 'modular-monolith',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return false when neither phase nor topology is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };
      expect(mode.canHandle(context)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return skipped status when no phase or topology', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('sdlc');
      expect(result.rulesChecked).toBe(0);
    });

    it('should validate phases when phase is provided', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        phase: 'f1',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('sdlc');
      expect(result.metadata).toEqual({ phasesValidated: ['f1'] });
    });
  });
});
