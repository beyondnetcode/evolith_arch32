import {
  generateCorrelationId,
  success,
  failure,
  toErrorEnvelope,
} from './envelopes';
import { DomainException, ErrorCodes } from './errors';

const META = { correlationId: 'evl-test', tool: 'evolith-validate', durationMs: 5, timestamp: 'T0' };

describe('envelopes', () => {
  describe('generateCorrelationId', () => {
    it('prefixes with evl- and is unique', () => {
      const a = generateCorrelationId();
      const b = generateCorrelationId();
      expect(a).toMatch(/^evl-[0-9a-f-]{36}$/);
      expect(a).not.toEqual(b);
    });
  });

  describe('success', () => {
    it('wraps data with success=true and meta', () => {
      const env = success({ ok: 1 }, META);
      expect(env.success).toBe(true);
      expect(env.data).toEqual({ ok: 1 });
      expect(env.meta).toEqual({ ...META, schemaVersion: expect.any(String) });
    });

    it('defaults the timestamp when not supplied', () => {
      const env = success(null, { correlationId: 'c', tool: 't', durationMs: 0 });
      expect(env.meta.timestamp).toEqual(expect.any(String));
      expect(new Date(env.meta.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('failure', () => {
    it('builds an error envelope without details', () => {
      const env = failure(ErrorCodes.VALIDATION_FAILED, 'boom', META);
      expect(env.success).toBe(false);
      expect(env.error).toEqual({ code: 'VALIDATION_FAILED', message: 'boom' });
    });

    it('includes details when provided', () => {
      const env = failure(ErrorCodes.IO_ERROR, 'io', META, { path: '/x' });
      expect(env.error.details).toEqual({ path: '/x' });
    });
  });

  describe('toErrorEnvelope', () => {
    it('preserves DomainException code and details', () => {
      const ex = new DomainException(ErrorCodes.REPO_NOT_FOUND, 'missing', { dir: '/r' });
      const env = toErrorEnvelope(ex, META);
      expect(env.error.code).toBe('REPO_NOT_FOUND');
      expect(env.error.message).toContain('missing');
      expect(env.error.details).toEqual({ dir: '/r' });
    });

    it('maps a plain Error to INTERNAL_ERROR', () => {
      const env = toErrorEnvelope(new Error('kaboom'), META);
      expect(env.error.code).toBe('INTERNAL_ERROR');
      expect(env.error.message).toBe('kaboom');
    });

    it('maps a non-Error throw to INTERNAL_ERROR with stringified message', () => {
      const env = toErrorEnvelope('just a string', META);
      expect(env.error.code).toBe('INTERNAL_ERROR');
      expect(env.error.message).toBe('just a string');
    });
  });
});
