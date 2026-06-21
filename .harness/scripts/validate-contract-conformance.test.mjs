import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConsumer } from './ci/10-validate-contract-conformance.mjs';

const manifest = {
  contractVersion: '1.0.0',
  schemas: [{ id: 'gate-evidence', version: '1.0.0', sha256: 'abc' }],
};

test('accepts an exactly pinned supported consumer', () => {
  assert.deepEqual(validateConsumer({
    contractVersion: '1.0.0',
    schemas: [{ id: 'gate-evidence', version: '1.0.0', sha256: 'abc' }],
  }, manifest), []);
});

test('rejects consumer drift', () => {
  assert.deepEqual(validateConsumer({
    contractVersion: '2.0.0',
    schemas: [{ id: 'gate-evidence', version: '1.0.0', sha256: 'different' }],
  }, manifest), [
    'Consumer contractVersion is not supported',
    'Consumer pin differs for schema: gate-evidence',
  ]);
});
