/**
 * GT-377 AC-3 — architecture guard regression test.
 *
 * Asserts that the stateless-Core repository ban actually fails when a
 * `*Repository` for a business entity that Core treats as pure context
 * (product / initiative / evidence / decision) appears — and, crucially, does
 * NOT fire for legitimate infrastructure repositories. This is the negative test
 * proving the guard from `gap-reference-catalog.md` "#### GT-377" AC-3 ("ESLint
 * boundary guard fails CI if a `*Repository` for product/initiative/evidence/
 * decision appears") is wired and effective, not merely declared.
 *
 * It exercises the SAME rule object that ships in `eslint.config.mjs` by
 * importing it from the shared `eslint.guards.cjs` (single source of truth), and
 * runs it through ESLint's synchronous flat-config `Linter` — no config-file
 * dynamic import, so it is jest/ts-jest safe.
 *
 * The banned identifiers below live ONLY inside string literals (lint input),
 * never as real code, so this spec itself stays green under `lint:boundaries`.
 */
import { Linter } from 'eslint';

// require (not import) so the runtime object matches what ESLint expects, free of
// ts-jest ESM-interop wrapping (`@typescript-eslint/parser` sets `__esModule`).
const tsParser = require('@typescript-eslint/parser') as Linter.Parser;
const { STATELESS_CORE_REPOSITORY_BAN } = require('../../eslint.guards.cjs') as {
  STATELESS_CORE_REPOSITORY_BAN: { selector: string; message: string };
};

const GUARD_RULE = 'no-restricted-syntax';

const linter = new Linter({ configType: 'flat' });

function guardErrors(code: string): string[] {
  const messages = linter.verify(code, {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      [GUARD_RULE]: ['error', STATELESS_CORE_REPOSITORY_BAN],
    },
  });
  return messages
    .filter((m) => m.ruleId === GUARD_RULE && m.severity === 2)
    .map((m) => m.message);
}

describe('GT-377 AC-3 — stateless-Core repository guard', () => {
  const BANNED_ENTITIES = ['Product', 'Initiative', 'Evidence', 'Decision'];

  it.each(BANNED_ENTITIES)(
    'FAILS when a %sRepository is imported and referenced',
    (entity) => {
      const code = [
        `import { ${entity}Repository } from '../infrastructure/persistence';`,
        `export function use(repo: ${entity}Repository): void { void repo; }`,
        '',
      ].join('\n');

      const errors = guardErrors(code);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((m) => m.includes('GT-377'))).toBe(true);
    },
  );

  it.each(BANNED_ENTITIES)(
    'FAILS when a %sRepository interface is declared inline',
    (entity) => {
      const code = `export interface ${entity}Repository { findById(id: string): unknown; }\n`;

      const errors = guardErrors(code);

      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it.each([
    'AuditRepository',
    'SubscriptionRepository',
    'DeliveryRepository',
    'createRepository',
    'getRepository',
  ])('does NOT flag the legitimate identifier %s (no false positive)', (ident) => {
    const code = [
      `import { ${ident} } from '../infrastructure/persistence';`,
      `export const ref = ${ident};`,
      '',
    ].join('\n');

    expect(guardErrors(code)).toEqual([]);
  });

  it('produces zero guard errors for a clean evaluation module', () => {
    const code = [
      "import type { EvaluationContext } from './contracts';",
      'export function evaluate(ctx: EvaluationContext): EvaluationContext { return ctx; }',
      '',
    ].join('\n');

    expect(guardErrors(code)).toEqual([]);
  });
});
