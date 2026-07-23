import {
  generateCorrelationId,
  success,
  failure,
  toErrorEnvelope,
  MCP_ENVELOPE_SCHEMA_VERSION,
  type MetaInput,
} from './envelopes';

describe('envelopes', () => {
  const meta: MetaInput = {
    correlationId: 'evl-test-123',
    tool: 'evolith-validate',
    durationMs: 150,
  };

  describe('generateCorrelationId', () => {
    it('generates ID with evl- prefix', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^evl-/);
    });

    it('generates unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('success', () => {
    it('creates success envelope with data', () => {
      const envelope = success({ result: 'ok' }, meta);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual({ result: 'ok' });
    });

    it('includes meta with schema version', () => {
      const envelope = success({}, meta);
      expect(envelope.meta.schemaVersion).toBe(MCP_ENVELOPE_SCHEMA_VERSION);
    });

    it('uses custom timestamp when provided', () => {
      const envelope = success({}, { ...meta, timestamp: '2026-01-01T00:00:00Z' });
      expect(envelope.meta.executedAt).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('failure', () => {
    it('creates error envelope without details', () => {
      const envelope = failure('NOT_IMPLEMENTED', 'Tool not found', meta);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('NOT_IMPLEMENTED');
      expect(envelope.error.message).toBe('Tool not found');
    });

    it('creates error envelope with details', () => {
      const envelope = failure('VALIDATION_FAILED', 'Invalid', meta, { path: '/test' });
      expect(envelope.error.details).toEqual({ path: '/test' });
    });
  });

  describe('toErrorEnvelope', () => {
    it('wraps Error objects', () => {
      const err = new Error('test error');
      const envelope = toErrorEnvelope(err, meta);
      expect(envelope.success).toBe(false);
      expect(envelope.error.message).toBe('test error');
    });

    it('wraps non-Error values', () => {
      const envelope = toErrorEnvelope('string error', meta);
      expect(envelope.success).toBe(false);
      expect(envelope.error.message).toBe('string error');
    });
  });
});
