import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONTRACTS_PACKAGE_VERSION,
  CONTRACT_SET_SHA256,
  MACHINE_CONTRACT_SET,
  SUPPORTED_CONSUMER_IDS,
  contractSetFingerprint,
} from './machine-contract-set';

// Repo root is four levels up from this file: src/packages/contracts/src/schemas
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');
// Contract-set schema paths (`rulesets/schema/...`) are relative to `src/`.
const SRC_ROOT = join(REPO_ROOT, 'src');

describe('MACHINE_CONTRACT_SET', () => {
  it('is versioned with a valid SemVer matching the package version', () => {
    expect(MACHINE_CONTRACT_SET.contractVersion).toBe(CONTRACTS_PACKAGE_VERSION);
    expect(CONTRACTS_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('advertises a first-class `external` consumer (closes the single-consumer gap)', () => {
    expect(SUPPORTED_CONSUMER_IDS).toContain('evolith_tracker');
    expect(SUPPORTED_CONSUMER_IDS).toContain('external');
  });

  it('exposes a stable, recomputable sha256 of the schema set', () => {
    expect(CONTRACT_SET_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(contractSetFingerprint(MACHINE_CONTRACT_SET)).toBe(CONTRACT_SET_SHA256);
  });

  // Drift guard: the declared per-schema sha256 must match the real schema
  // files (the single source of truth). If a schema changes without updating
  // this descriptor + a version bump, this fails.
  it.each(MACHINE_CONTRACT_SET.schemas.map((s) => [s.id, s] as const))(
    'schema %s hashes to its declared sha256',
    (_id, schema) => {
      const bytes = readFileSync(join(SRC_ROOT, schema.path));
      const actual = createHash('sha256').update(bytes).digest('hex');
      expect(actual).toBe(schema.sha256);
    },
  );

  it('stays byte-consistent with the producer machine-contracts descriptor', () => {
    const raw = JSON.parse(
      readFileSync(
        join(REPO_ROOT, 'src', 'rulesets', 'contracts', 'evolith-machine-contracts.json'),
        'utf8',
      ),
    ) as { schemas: { id: string; path: string; sha256: string }[] };

    // Every schema the producer declares must be present with the same hash.
    for (const producer of raw.schemas) {
      const declared = MACHINE_CONTRACT_SET.schemas.find((s) => s.id === producer.id);
      expect(declared).toBeDefined();
      expect(declared?.path).toBe(producer.path);
      expect(declared?.sha256).toBe(producer.sha256);
    }
  });
});
