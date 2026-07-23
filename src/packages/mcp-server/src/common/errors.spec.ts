import { ErrorCodes, ErrorCode, DomainException } from './errors';

describe('MCP errors', () => {
  describe('ErrorCodes', () => {
    it('has all expected error codes', () => {
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.NOT_IMPLEMENTED).toBe('NOT_IMPLEMENTED');
    });

    it('has 16 error codes', () => {
      expect(Object.keys(ErrorCodes)).toHaveLength(16);
    });
  });

  describe('DomainException', () => {
    it('has correct name and code', () => {
      const err = new DomainException('VALIDATION_FAILED', 'Invalid input');
      expect(err.name).toBe('DomainException');
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.message).toBe('[VALIDATION_FAILED] Invalid input');
    });

    it('includes details when provided', () => {
      const err = new DomainException('NOT_FOUND', 'Not found', { path: '/test' });
      expect(err.details).toEqual({ path: '/test' });
    });

    it('is an instance of Error', () => {
      const err = new DomainException('TEST', 'test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(DomainException);
    });
  });
});
