/**
 * GT-312: Architecture Validation Mode - Unit Tests
 */

import { ArchitectureValidationMode } from './architecture-validation.mode';
import { ValidationContext } from './validation-mode.interface';

describe('ArchitectureValidationMode', () => {
  let mode: ArchitectureValidationMode;

  beforeEach(() => {
    mode = new ArchitectureValidationMode();
  });

  describe('canHandle', () => {
    it('should return true when topology is provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        topology: 'modular-monolith',
      };
      expect(mode.canHandle(context)).toBe(true);
    });

    it('should return false when topology is not provided', () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
      };
      expect(mode.canHandle(context)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate architecture when topology is provided', async () => {
      const context: ValidationContext = {
        satellitePath: '/test',
        engine: 'native',
        topology: 'modular-monolith',
      };

      const result = await mode.validate(context);

      expect(result.mode).toBe('architecture');
      expect(result.metadata).toEqual({ topology: 'modular-monolith' });
    });
  });
});
