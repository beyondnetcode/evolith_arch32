import {
  EvolithError,
  PlatformNotFoundError,
  PhaseTransitionError,
  CatalogLoadError,
  ToolValidationError,
  CommandExecutionError,
  ValidationError,
  UserCancelledError,
  isEvolithError,
  getErrorCode,
  getErrorContext,
} from './index';

describe('errors', () => {
  describe('EvolithError', () => {
    it('has correct name and properties', () => {
      const err = new EvolithError('test message', 'TEST_CODE', { key: 'value' });
      expect(err.name).toBe('EvolithError');
      expect(err.message).toBe('test message');
      expect(err.code).toBe('TEST_CODE');
      expect(err.context).toEqual({ key: 'value' });
    });

    it('is an instance of Error', () => {
      const err = new EvolithError('test', 'CODE');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(EvolithError);
    });
  });

  describe('PlatformNotFoundError', () => {
    it('has correct code and context', () => {
      const err = new PlatformNotFoundError('node', 'Install from nodejs.org');
      expect(err.code).toBe('PLATFORM_NOT_FOUND');
      expect(err.context).toEqual({ platform: 'node', hint: 'Install from nodejs.org' });
      expect(err.message).toContain('node');
    });
  });

  describe('PhaseTransitionError', () => {
    it('has correct code and context', () => {
      const err = new PhaseTransitionError('pending', 'approved', 'gate not passed');
      expect(err.code).toBe('PHASE_TRANSITION_ERROR');
      expect(err.context).toEqual({ from: 'pending', to: 'approved', reason: 'gate not passed' });
    });
  });

  describe('CatalogLoadError', () => {
    it('has correct code and context', () => {
      const err = new CatalogLoadError('runtimes', 'file not found');
      expect(err.code).toBe('CATALOG_LOAD_ERROR');
      expect(err.context).toEqual({ catalog: 'runtimes' });
    });
  });

  describe('ToolValidationError', () => {
    it('has correct code and context', () => {
      const err = new ToolValidationError('evolith-validate', 'missing config');
      expect(err.code).toBe('TOOL_VALIDATION_ERROR');
      expect(err.context).toEqual({ tool: 'evolith-validate' });
    });
  });

  describe('CommandExecutionError', () => {
    it('has correct code and context', () => {
      const err = new CommandExecutionError('npm install', 1, 'ENOENT');
      expect(err.code).toBe('COMMAND_EXECUTION_ERROR');
      expect(err.context).toEqual({ command: 'npm install', exitCode: 1, stderr: 'ENOENT' });
    });
  });

  describe('ValidationError', () => {
    it('has correct code and context', () => {
      const err = new ValidationError(['field required', 'invalid format']);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.context).toEqual({ errors: ['field required', 'invalid format'] });
    });
  });

  describe('UserCancelledError', () => {
    it('has default message', () => {
      const err = new UserCancelledError();
      expect(err.code).toBe('USER_CANCELLED');
      expect(err.message).toBe('User cancelled the operation');
    });

    it('accepts custom message', () => {
      const err = new UserCancelledError('custom cancel');
      expect(err.message).toBe('custom cancel');
    });
  });

  describe('isEvolithError', () => {
    it('returns true for EvolithError instances', () => {
      expect(isEvolithError(new EvolithError('test', 'CODE'))).toBe(true);
      expect(isEvolithError(new PlatformNotFoundError('node'))).toBe(true);
    });

    it('returns false for non-EvolithError', () => {
      expect(isEvolithError(new Error('test'))).toBe(false);
      expect(isEvolithError(null)).toBe(false);
      expect(isEvolithError('string')).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('returns code for EvolithError', () => {
      expect(getErrorCode(new EvolithError('test', 'MY_CODE'))).toBe('MY_CODE');
    });

    it('returns UNKNOWN_ERROR for non-EvolithError', () => {
      expect(getErrorCode(new Error('test'))).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getErrorContext', () => {
    it('returns context for EvolithError', () => {
      const err = new EvolithError('test', 'CODE', { key: 'val' });
      expect(getErrorContext(err)).toEqual({ key: 'val' });
    });

    it('returns undefined for non-EvolithError', () => {
      expect(getErrorContext(new Error('test'))).toBeUndefined();
    });
  });
});
