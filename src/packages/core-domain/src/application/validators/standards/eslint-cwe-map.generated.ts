/**
 * GENERATED from src/rulesets/standards/eslint-cwe-map.json — do not edit by hand.
 * Regenerate: node .harness/scripts/generate-eslint-cwe-map.mjs
 *
 * GT-664 — the map is COMPILED IN rather than read from the corpus at runtime,
 * for the reason GT-662 paid for once already: the core-api Dockerfile copies
 * `src/rulesets` to `/app/corpus/rulesets`, so a baked-in relative require from
 * a domain module points at a path that does not exist in the image and the
 * service dies at boot with MODULE_NOT_FOUND. `/health` never answers, and from
 * outside a crash-loop is indistinguishable from a slow boot.
 *
 * Only the fields the domain evaluates are carried across. The `rationale` on
 * every row and the `rejected` list stay in the JSON, because they are for a
 * human deciding whether to believe the row, not for the lookup.
 *
 * `eslint-cwe-map.spec.ts` asserts this constant still equals the JSON.
 */
export const ESLINT_CWE_MAP = {
  "provenance": {
    "class": "human-claim",
    "whatThisIs": "A reading of each ESLint rule's own documented purpose against each CWE's own Description, written by a person and reviewable line by line. The `rationale` on every row is the argument; if the argument is wrong, the row is wrong.",
    "whatThisIsNot": "Anything ESLint says. ESLint rule metadata carries `description`, `recommended` and `helpUri` and NO taxonomy identifier of any kind — there is no CWE, no OWASP, no CERT field to read. Nothing in this file was produced by running a tool, and no row may ever be presented as one.",
    "whyItIsSeparableInTheReport": "A finding whose CWE the analyser declared and a finding whose CWE we inferred are not the same evidence. Collapsing them would let a table written in an afternoon inherit the authority of a static analyser's own taxonomy work, so the adapter keeps the two apart all the way into the violation message and the coverage advisory.",
    "confidenceLevels": {
      "exact": "The ESLint rule's documented purpose and the CWE's Description name the same defect. A finding is an instance of the weakness.",
      "broad": "The rule fires on a set that CONTAINS the weakness but is wider than it, or the CWE is phrased for a language family that JavaScript is read into by analogy. A finding is evidence of the weakness, not proof of it. Every `broad` row says which way it is loose."
    },
    "verifiedAgainst": {
      "eslint": "9.39.4 — rule ids and `meta.docs.description` read from the installed package, not from memory",
      "cwe": "cwe.mitre.org definition pages, read 2026-08-09; Description / Extended Description / Applicable Languages quoted in the rationales",
      "iso5055Index": "src/rulesets/standards/iso-5055-weaknesses.json — every `cwe` below is one of the 138 the standard names",
      "scope": "ESLint CORE rules only. A plugin rule id means whatever the installed plugin version means, and this file cannot claim that."
    },
    "regenerateCompiledCopy": "node .harness/scripts/generate-eslint-cwe-map.mjs"
  },
  "entries": [
    {
      "ruleId": "no-fallthrough",
      "cwe": 484,
      "cweName": "Omitted Break Statement in Switch",
      "confidence": "exact"
    },
    {
      "ruleId": "default-case",
      "cwe": 478,
      "cweName": "Missing Default Case in Multiple Condition Expression",
      "confidence": "exact"
    },
    {
      "ruleId": "no-unreachable",
      "cwe": 561,
      "cweName": "Dead Code",
      "confidence": "exact"
    },
    {
      "ruleId": "no-dupe-else-if",
      "cwe": 561,
      "cweName": "Dead Code",
      "confidence": "exact"
    },
    {
      "ruleId": "no-duplicate-case",
      "cwe": 561,
      "cweName": "Dead Code",
      "confidence": "exact"
    },
    {
      "ruleId": "for-direction",
      "cwe": 835,
      "cweName": "Loop with Unreachable Exit Condition ('Infinite Loop')",
      "confidence": "exact"
    },
    {
      "ruleId": "no-unmodified-loop-condition",
      "cwe": 835,
      "cweName": "Loop with Unreachable Exit Condition ('Infinite Loop')",
      "confidence": "broad"
    },
    {
      "ruleId": "no-cond-assign",
      "cwe": 480,
      "cweName": "Use of Incorrect Operator",
      "confidence": "broad"
    },
    {
      "ruleId": "eqeqeq",
      "cwe": 597,
      "cweName": "Use of Wrong Operator in String Comparison",
      "confidence": "broad"
    },
    {
      "ruleId": "no-unsafe-negation",
      "cwe": 783,
      "cweName": "Operator Precedence Logic Error",
      "confidence": "exact"
    },
    {
      "ruleId": "no-unsafe-optional-chaining",
      "cwe": 476,
      "cweName": "NULL Pointer Dereference",
      "confidence": "broad"
    },
    {
      "ruleId": "complexity",
      "cwe": 1121,
      "cweName": "Excessive McCabe Cyclomatic Complexity",
      "confidence": "exact"
    },
    {
      "ruleId": "max-params",
      "cwe": 1064,
      "cweName": "Invokable Control Element with Signature Containing an Excessive Number of Parameters",
      "confidence": "exact"
    },
    {
      "ruleId": "max-lines",
      "cwe": 1080,
      "cweName": "Source Code File with Excessive Number of Lines of Code",
      "confidence": "exact"
    }
  ],
  "thresholdDependent": [
    "complexity",
    "max-params",
    "max-lines"
  ]
} as const;
