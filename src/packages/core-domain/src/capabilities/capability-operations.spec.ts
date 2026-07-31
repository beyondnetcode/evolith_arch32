import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import {
  OPERATION_SCHEMA_DIALECT,
  capabilityOperationsFingerprint,
  checkCapabilityOperations,
  type CapabilityOperation,
} from './capability-operations';
import { CAPABILITY_OPERATIONS } from './capability-operations.generated';
import { buildCapabilityManifest } from './capabilities-manifest';

/**
 * GT-583 criterion 3, for the artifacts this gap generates: every per-operation
 * schema the manifest publishes must COMPILE under JSON Schema 2020-12, not
 * merely declare the dialect. Ajv's 2020 entry point is the check — a schema
 * that uses a draft-07-only keyword, or misuses a 2020-12 one, fails to compile
 * and turns this red.
 *
 * Deliberately scoped: this covers the generated operation catalog. The 154
 * `src/rulesets/**\/*.schema.json` ruleset files still pin draft-07 and are NOT
 * migrated here.
 */
describe('capability operations (GT-583)', () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  it('the generated catalog is non-empty and structurally sound', () => {
    // Anti-vacuous first: every assertion below is trivially true for [].
    expect(CAPABILITY_OPERATIONS.length).toBeGreaterThanOrEqual(40);
    expect(checkCapabilityOperations(CAPABILITY_OPERATIONS)).toEqual([]);
  });

  it('every operation carries an inputSchema AND an outputSchema', () => {
    const missing = CAPABILITY_OPERATIONS.filter((op) => !op.inputSchema || !op.outputSchema).map(
      (op) => op.name,
    );
    expect(missing).toEqual([]);
  });

  it('every operation schema compiles under JSON Schema 2020-12', () => {
    const failures: string[] = [];
    for (const op of CAPABILITY_OPERATIONS) {
      for (const side of ['inputSchema', 'outputSchema'] as const) {
        try {
          ajv.compile(op[side] as object);
        } catch (e) {
          failures.push(`${op.name}.${side}: ${(e as Error).message}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('the 2020-12 compiler REJECTS a schema that is not valid 2020-12', () => {
    // Without this, "every schema compiled" is a claim about an oracle that has
    // never been seen refusing anything.
    expect(() =>
      ajv.compile({
        $schema: OPERATION_SCHEMA_DIALECT,
        type: 'object',
        properties: { broken: { type: 'not-a-json-schema-type' } },
      }),
    ).toThrow();
  });

  it('every operation schema declares the 2020-12 dialect', () => {
    const wrong = CAPABILITY_OPERATIONS.flatMap((op) =>
      (['inputSchema', 'outputSchema'] as const)
        .filter((side) => (op[side] as Record<string, unknown>).$schema !== OPERATION_SCHEMA_DIALECT)
        .map((side) => `${op.name}.${side}`),
    );
    expect(wrong).toEqual([]);
  });

  it('the manifest publishes the generated catalog and its fingerprint', () => {
    const manifest = buildCapabilityManifest();
    expect(manifest.operations).toEqual([...CAPABILITY_OPERATIONS]);
    expect(manifest.operationsSha256).toBe(capabilityOperationsFingerprint(CAPABILITY_OPERATIONS));
  });

  describe('the structural check REJECTS what it claims to reject', () => {
    const sound: CapabilityOperation = CAPABILITY_OPERATIONS[0];

    it('rejects an empty catalog rather than fingerprinting nothing', () => {
      expect(checkCapabilityOperations([]).join('\n')).toContain('EMPTY');
    });

    it('rejects an operation with no schemas', () => {
      const broken = [
        { ...sound, inputSchema: undefined as unknown as CapabilityOperation['inputSchema'] },
      ];
      expect(checkCapabilityOperations(broken).join('\n')).toContain('inputSchema is not an object');
    });

    it('rejects a schema pinned to draft-07', () => {
      const legacy = [
        {
          ...sound,
          inputSchema: { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object' },
        },
      ];
      expect(checkCapabilityOperations(legacy).join('\n')).toContain('draft-07');
    });

    it('rejects duplicate operation names', () => {
      expect(checkCapabilityOperations([sound, sound]).join('\n')).toContain('duplicate operation');
    });
  });

  it('the fingerprint moves when any single schema moves', () => {
    const before = capabilityOperationsFingerprint(CAPABILITY_OPERATIONS);
    const tampered = CAPABILITY_OPERATIONS.map((op, i) =>
      i === 0 ? { ...op, description: `${op.description} (tampered)` } : op,
    );
    expect(capabilityOperationsFingerprint(tampered)).not.toBe(before);
  });
});
