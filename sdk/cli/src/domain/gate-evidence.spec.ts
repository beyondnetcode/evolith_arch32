import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  GateEvidence,
  GateViolation,
  OutputMeta,
  createSuccessEnvelope,
  createErrorEnvelope,
  deriveVerdict,
  isGatePhase,
  isErrorCode,
  ERROR_CODES,
  GATE_PHASES,
} from './gate-evidence';

const SCHEMA_DIR = path.resolve(__dirname, '../../../../rulesets/schema');

function loadSchema(name: string): object {
  return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf-8'));
}

function buildAjv(): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

const errorViolation: GateViolation = {
  ruleId: 'PG-DESIGN-001',
  severity: 'error',
  location: 'reference/architecture/adrs/adr-matrix.json',
  message: 'ADR registry entry missing for decision "caching strategy"',
};

const warningViolation: GateViolation = {
  ruleId: 'PG-DESIGN-002',
  severity: 'warning',
  location: 'docs/design/bounded-context-map.md',
  message: 'Bounded context map has no last-reviewed date',
};

const meta: OutputMeta = {
  command: 'evolith gate evaluate',
  executedAt: '2026-06-10T12:00:00Z',
  durationMs: 182,
  correlationId: 'b54a93de-1f2c-4f6a-9be1-0a4f1f2c3d4e',
  context: { initiative: 'INIT-42', tenant: 'acme', phase: 'design' },
};

function sampleEvidence(overrides: Partial<GateEvidence> = {}): GateEvidence {
  return {
    gateId: 'design-baseline-approved',
    phase: 'design',
    verdict: 'failed',
    rulesetRef: 'rulesets/sdlc/phase-gates.rules.json',
    rulesetVersion: '1.2.0',
    violations: [errorViolation, warningViolation],
    evaluatedAt: '2026-06-10T12:00:00Z',
    evaluatedBy: 'agent',
    ...overrides,
  };
}

describe('GateEvidence domain contract (ADR-0073 / GT-02)', () => {
  describe('deriveVerdict', () => {
    it('fails the gate when any violation is an error', () => {
      expect(deriveVerdict([warningViolation, errorViolation])).toBe('failed');
    });

    it('passes the gate when violations are warnings only', () => {
      expect(deriveVerdict([warningViolation])).toBe('passed');
    });

    it('passes the gate with no violations', () => {
      expect(deriveVerdict([])).toBe('passed');
    });
  });

  describe('type guards', () => {
    it('accepts every contract phase and rejects others', () => {
      for (const phase of GATE_PHASES) {
        expect(isGatePhase(phase)).toBe(true);
      }
      expect(isGatePhase('phase-2')).toBe(false);
      expect(isGatePhase('')).toBe(false);
    });

    it('accepts every registered error code and rejects unregistered ones', () => {
      for (const code of ERROR_CODES) {
        expect(isErrorCode(code)).toBe(true);
      }
      expect(isErrorCode('SOMETHING_ELSE')).toBe(false);
    });
  });

  describe('gate-evidence.schema.json', () => {
    const validate = buildAjv().compile(loadSchema('gate-evidence.schema.json'));

    it('validates evidence built from the domain types', () => {
      expect(validate(sampleEvidence())).toBe(true);
    });

    it('validates a clean pass with zero violations', () => {
      expect(validate(sampleEvidence({ verdict: 'passed', violations: [] }))).toBe(true);
    });

    it('rejects an unknown verdict', () => {
      expect(validate({ ...sampleEvidence(), verdict: 'maybe' })).toBe(false);
    });

    it('rejects evidence without rulesetVersion', () => {
      const candidate: Record<string, unknown> = { ...sampleEvidence() };
      delete candidate.rulesetVersion;
      expect(validate(candidate)).toBe(false);
    });

    it('rejects violations missing an actionable message', () => {
      const candidate = sampleEvidence({
        violations: [{ ...errorViolation, message: '' }],
      });
      expect(validate(candidate)).toBe(false);
    });

    it('rejects undeclared extra properties', () => {
      expect(validate({ ...sampleEvidence(), score: 0.97 })).toBe(false);
    });
  });

  describe('output-envelope.schema.json', () => {
    const validate = buildAjv().compile(loadSchema('output-envelope.schema.json'));

    it('validates a success envelope carrying GateEvidence', () => {
      expect(validate(createSuccessEnvelope(sampleEvidence(), meta))).toBe(true);
    });

    it('validates an error envelope with a registered code', () => {
      const envelope = createErrorEnvelope('GATE_BLOCKED', 'Gate design-baseline-approved failed', meta, {
        violations: 1,
      });
      expect(validate(envelope)).toBe(true);
    });

    it('rejects a success envelope without data', () => {
      expect(validate({ success: true, meta })).toBe(false);
    });

    it('rejects a failure envelope without error', () => {
      expect(validate({ success: false, meta })).toBe(false);
    });

    it('rejects an unregistered error code', () => {
      const envelope = {
        success: false,
        error: { code: 'UNKNOWN_CODE', message: 'nope' },
        meta,
      };
      expect(validate(envelope)).toBe(false);
    });

    it('rejects meta without correlationId', () => {
      const { correlationId: _omitted, ...incompleteMeta } = meta;
      expect(validate(createSuccessEnvelope(sampleEvidence(), incompleteMeta as OutputMeta))).toBe(false);
    });

    it('rejects unknown context keys (context is a closed echo)', () => {
      const badMeta = { ...meta, context: { initiative: 'INIT-42', region: 'us-east-1' } };
      expect(validate({ success: true, data: sampleEvidence(), meta: badMeta })).toBe(false);
    });
  });
});
