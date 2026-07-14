import { parseSecuritySarif, isSarifToolFailure, SECURITY_CATEGORY } from './sarif-security-adapter';

// A real Checkov-shaped SARIF 2.1.0 log.
const CHECKOV_SARIF = JSON.stringify({
  version: '2.1.0',
  runs: [
    {
      tool: { driver: { name: 'Checkov' } },
      results: [
        { ruleId: 'CKV_AWS_20', level: 'error', message: { text: 'S3 Bucket has an ACL defined which allows public access.' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'main.tf' }, region: { startLine: 2 } } }] },
        { ruleId: 'CKV2_AWS_62', level: 'error', message: { text: 'Ensure S3 buckets should have event notifications enabled.' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'main.tf' }, region: { startLine: 1 } } }] },
      ],
    },
  ],
});

describe('SARIF security adapters (GT-521 — Checkov/Trivy/Conftest)', () => {
  it('ingests security SARIF into Violations tagged category=security', () => {
    const v = parseSecuritySarif(CHECKOV_SARIF);
    expect(v).toHaveLength(2);
    expect(v.every((x) => x.category === SECURITY_CATEGORY)).toBe(true);
    expect(v[0]).toMatchObject({ ruleId: 'CKV_AWS_20', tool: 'Checkov', severity: 'error', file: 'main.tf', line: 2 });
    expect(v[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it('yields [] for a clean scan and never false-passes a real tool failure', () => {
    const clean = JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 'Trivy' } }, results: [] }] });
    expect(parseSecuritySarif(clean)).toEqual([]);
    // a clean scan (valid SARIF) even with a non-zero exit is NOT a failure
    expect(isSarifToolFailure({ stdout: clean, stderr: '', exitCode: 1 })).toBe(false);
    // no SARIF + non-zero exit IS a failure (missing binary / crash) → skip
    expect(isSarifToolFailure({ stdout: 'command not found', stderr: 'trivy: not found', exitCode: 127 })).toBe(true);
    expect(parseSecuritySarif('garbage')).toEqual([]);
  });
});
