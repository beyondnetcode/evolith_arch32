import { ErrorCodes, ErrorCode, DomainException } from './errors';

describe('MCP errors', () => {
  describe('ErrorCodes', () => {
    it('has all expected error codes', () => {
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.NOT_IMPLEMENTED).toBe('NOT_IMPLEMENTED');
      // GT-606 — core/ADR-0093 §3 conflict contract.
      expect(ErrorCodes.CONCURRENCY_CONFLICT).toBe('CONCURRENCY_CONFLICT');
    });

    // The registry is append-only: renaming or reusing a code is a breaking
    // change for every consumer keying off it, so the whole set is asserted
    // rather than just its size. Adding a code is a one-line addition here.
    it('is the append-only registry, unchanged except by addition', () => {
      expect(Object.keys(ErrorCodes)).toEqual([
        'VALIDATION_FAILED',
        'SCHEMA_INVALID',
        'REPO_NOT_FOUND',
        'PHASE_INVALID',
        'RULESET_NOT_FOUND',
        'NOT_A_SATELLITE',
        'GATE_BLOCKED',
        'COMMAND_FAILED',
        'TIMEOUT',
        'IO_ERROR',
        'PATH_NOT_FOUND',
        'GIT_ERROR',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'CONCURRENCY_CONFLICT',
        'INTERNAL_ERROR',
        'NOT_IMPLEMENTED',
      ]);
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
