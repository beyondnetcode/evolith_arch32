// @ts-check
/**
 * Root ESLint flat config — GT-664.
 *
 * WHAT THIS IS FOR
 * ----------------
 * It is not a style policy. Every package that lints for architecture keeps its
 * own `eslint.config.mjs` and runs it from its own directory (`lint:boundaries`),
 * and none of that changes: ESLint resolves a flat config by walking up from the
 * working directory, so a package run still finds the package's config first.
 *
 * This file exists so that Evolith Core, treated as its own satellite, has an
 * analyser configured to look for something. The ISO/IEC 5055 pack
 * (`src/rulesets/standards/iso-5055.rules.json`) runs ESLint and reads its
 * findings through the hand-written table in
 * `src/rulesets/standards/eslint-cwe-map.json`. With no root config, `eslint .`
 * at the repository root exits 2 with an empty report, the adapter throws, and
 * all four ISO/IEC 5055 rules SKIP — which is the correct fail-closed behaviour
 * and also no measurement at all.
 *
 * THE RULES BELOW ARE EXACTLY THE ONES THE TABLE MAPS
 * ---------------------------------------------------
 * One rule per mapped row, at ESLint's own default options where it has them.
 * That is deliberate on both counts:
 *
 *   - Enabling a rule the table does NOT map would produce findings that reach
 *     no measure — noise in the report and nothing in the measurement.
 *   - `complexity`, `max-params` and `max-lines` count against a maximum the
 *     adopter chooses, and CWE-1121 / CWE-1064 / CWE-1080 leave that maximum
 *     open. Taking ESLint's own defaults (20, 3, 300) means the number this
 *     repository publishes rests on a threshold somebody else set, not one
 *     chosen after seeing the result.
 *
 * Reported as `error` only so ESLint emits them; the pack is `blocking: false`
 * and no build fails because of this file.
 *
 * WHAT IT DOES NOT MEASURE
 * ------------------------
 * The table reaches 11 of the 138 weaknesses ISO/IEC 5055 names, and NONE of the
 * 18 in Performance Efficiency. Turning on more ESLint rules cannot change that;
 * only a mapping argument that survives review can, and the ones examined for
 * Performance Efficiency did not (see `rejected` in the map).
 */
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/build/**',
      '**/.next/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['src/**/*.ts', '.harness/scripts/**/*.mjs', 'src/rulesets/**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    // Inline directives are ignored, and that is the point rather than a
    // convenience: a comment in a source file must not be able to switch off a
    // weakness the measurement is supposed to count. It also keeps this config
    // from tripping over `eslint-disable` comments naming plugin rules it does
    // not load, which ESLint reports as findings of their own.
    //
    // The cost is visible and counted: ESLint answers with one "this directive
    // has no effect" warning per suppressed comment (39 on this tree). Those
    // carry no rule id, so they reach no measure and land in the coverage
    // report's "carried no CWE at all" tally, where a reader can see how much of
    // the run was noise instead of having it quietly dropped.
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
    rules: {
      // → CWE-484, Reliability + Maintainability
      'no-fallthrough': 'error',
      // → CWE-478, Maintainability
      'default-case': 'error',
      // → CWE-561, Maintainability
      'no-unreachable': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      // → CWE-835, Security + Reliability
      'for-direction': 'error',
      'no-unmodified-loop-condition': 'error',
      // → CWE-480, Security + Reliability + Maintainability
      'no-cond-assign': 'error',
      // → CWE-597, Reliability
      eqeqeq: 'error',
      // → CWE-783, Security + Maintainability
      'no-unsafe-negation': 'error',
      // → CWE-476, Reliability
      'no-unsafe-optional-chaining': 'error',
      // → CWE-1121 / CWE-1064 / CWE-1080, Maintainability. Threshold-dependent:
      // ESLint's own defaults, quoted here because the counts are meaningless
      // without them.
      complexity: 'error',
      'max-params': 'error',
      'max-lines': 'error',
    },
  },
];
