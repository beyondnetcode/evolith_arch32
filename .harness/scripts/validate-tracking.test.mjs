import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTrackingState } from './ci/08-validate-tracking.mjs';

function fixture(overrides = {}) {
  const section = '#### GT-01\n\n- **Done when:** complete\n';
  return {
    enRows: [{ id: 'GT-01', status: 'DONE' }],
    esRows: [{ id: 'GT-01', status: 'COMPLETADO' }],
    enContent: '**Progress:** 1 / 1 done · 0 in progress · 0 pending · 0 deferred',
    esContent: '**Progreso:** 1 / 1 completados · 0 en progreso · 0 pendientes · 0 diferidos',
    enSections: new Map([['GT-01', section]]),
    esSections: new Map([['GT-01', section]]),
    registry: {
      closures: [{
        id: 'GT-01',
        closedAt: '2026-06-10',
        closureCommit: 'ae21c92',
        evidence: ['reference/core/architecture/adrs/core/0073-unified-cli-output-contract.md'],
        validationCommands: ['node .harness/scripts/validate-docs.mjs'],
        dependencyDisposition: 'none',
      }],
    },
    ...overrides,
  };
}

test('accepts a completed gap with resolvable semantic evidence', () => {
  assert.deepEqual(validateTrackingState(fixture()), []);
});

test('rejects DONE without a closure record', () => {
  const errors = validateTrackingState(fixture({ registry: { closures: [] } }));
  assert.ok(errors.some((error) => error.includes('DONE without a closure evidence record')));
});

test('rejects unchecked criteria in a completed catalog section', () => {
  const sections = new Map([['GT-01', '#### GT-01\n\n- [ ] unresolved\n']]);
  const errors = validateTrackingState(fixture({ enSections: sections }));
  assert.ok(errors.some((error) => error.includes('unchecked closure criteria in EN')));
});

test('rejects closure evidence for a deferred gap', () => {
  const errors = validateTrackingState(fixture({
    enRows: [{ id: 'GT-01', status: 'DEFERRED' }],
    esRows: [{ id: 'GT-01', status: 'DIFERIDO' }],
    enContent: '**Progress:** 0 / 1 done · 0 in progress · 0 pending · 1 deferred',
    esContent: '**Progreso:** 0 / 1 completados · 0 en progreso · 0 pendientes · 1 diferido',
  }));
  assert.ok(errors.some((error) => error.includes('closure evidence but status is deferred')));
});
