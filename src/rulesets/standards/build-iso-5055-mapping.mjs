#!/usr/bin/env node
/**
 * @file build-iso-5055-mapping.mjs
 * @description GT-598 — map the Evolith ruleset corpus against ISO/IEC 5055:2021.
 *
 * WHY THIS EXISTS
 * ---------------
 * The corpus is 100% proprietary, and every rule without a native handler was
 * being sized as "one handler to write". ISO/IEC 5055:2021 publishes 138
 * structural weaknesses, all of them CWE identifiers, across four measures
 * (Reliability, Security, Performance Efficiency, Maintainability). A rule whose
 * predicate IS one of those weaknesses does not need a bespoke handler: it needs
 * an adapter to an analyser that already decides it, and its coverage number
 * becomes countable by an external auditor.
 *
 * This script is the generator for that mapping. It walks the whole corpus,
 * assigns every rule either a 5055 weakness or an explicit "no international
 * equivalent", and refuses to emit a mapping that does not cover every rule it
 * found, or that cites a CWE outside the 138.
 *
 * WHAT IT IS NOT
 * --------------
 * It does not implement analysers, and `analyser.adoptable` is a *claim about
 * the shape of the rule*, not a verified integration. `yes` means an
 * off-the-shelf analyser already decides this predicate; `partial` means an
 * analyser yields a necessary-but-not-sufficient signal; `no` means the
 * predicate is repository- or product-specific and must be authored.
 *
 * USAGE
 *   node src/rulesets/standards/build-iso-5055-mapping.mjs           # write
 *   node src/rulesets/standards/build-iso-5055-mapping.mjs --check   # verify
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RULESETS = path.resolve(HERE, '..');
const WEAKNESSES = path.join(HERE, 'iso-5055-weaknesses.json');
const EVALUABILITY = path.join(HERE, 'native-evaluability-snapshot.json');
const OUT_JSON = path.join(HERE, 'iso-5055-mapping.json');
const OUT_CSV = path.join(HERE, 'iso-5055-mapping.csv');

const MAPPING_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// 1. Corpus discovery
// ---------------------------------------------------------------------------

/** Every `*.rules.json` under src/rulesets, repo-order stable. */
function collectRulesetFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectRulesetFiles(full, out);
    else if (entry.name.endsWith('.rules.json')) out.push(full);
  }
  return out;
}

/**
 * Normalise the four shapes a `*.rules.json` file takes in this corpus:
 *   - `{ rules: [...] }`           — the common case
 *   - `{ principles: [...] }`      — inheritance / manifesto style
 *   - `{ id, name, ... }`          — single-rule infrastructure files
 *   - gate / recommendation files  — no conformance rules at all
 */
function extractRules(file) {
  const rel = path.relative(RULESETS, file).split(path.sep).join('/');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = parsed.rules ?? parsed.principles;
  if (Array.isArray(list)) {
    return list
      .filter((r) => r && r.id)
      .map((r) => ({
        ruleId: String(r.id),
        sourceFile: rel,
        title: String(r.title ?? r.principle ?? r.name ?? r.id),
        severity: String(r.severity ?? ''),
        category: String(r.category ?? ''),
      }));
  }
  // Single-rule file: the rule metadata sits at the document root.
  if (parsed.id && (parsed.name || parsed.title)) {
    return [{
      ruleId: String(parsed.id),
      sourceFile: rel,
      title: String(parsed.name ?? parsed.title),
      severity: String(parsed.severity ?? ''),
      category: String(parsed.category ?? ''),
    }];
  }
  // Gate definitions and topology recommendations are not conformance rules.
  return [];
}

// ---------------------------------------------------------------------------
// 2. Classification tables
// ---------------------------------------------------------------------------

/**
 * What kind of thing the rule constrains. ISO/IEC 5055 measures the internal
 * structure of source code, so only `code-structure` is inside its scope by
 * construction; everything else is either code-adjacent hygiene an analyser can
 * still decide, or governance/process/architecture the standard does not model.
 */
const CLASS_BY_FILE = [
  ['adr/adr-0002-hexagonal-architecture', 'code-structure'],
  ['adr/adr-0005-cicd-quality-gates', 'process'],
  ['adr/adr-0010-multi-tenancy', 'architecture-decision'],
  ['adr/adr-0018-testing-pyramid', 'process'],
  ['adr/adr-0032-protocol-selection', 'architecture-decision'],
  ['adr/adr-0040-multi-runtime', 'architecture-decision'],
  ['adr/adr-0050-gitflow-branching', 'process'],
  ['adr/generated/', 'architecture-decision'],
  ['acl/', 'architecture-decision'],
  ['cli/', 'platform-surface'],
  ['cross-cutting/compliance-baseline', 'governance'],
  ['cross-cutting/definition-of-done', 'process'],
  ['cross-cutting/engineering-manifesto', 'code-structure'],
  ['cross-cutting/repository-taxonomy', 'code-hygiene'],
  ['evidence/', 'governance'],
  ['governance/', 'governance'],
  ['infrastructure/', 'deployment'],
  ['mcp/', 'platform-surface'],
  ['observability/', 'operations'],
  ['sdlc/dependency-pinning', 'supply-chain'],
  ['sdlc/quality-thresholds', 'code-hygiene'],
  ['security/', 'code-structure'],
  ['topologies/', 'topology'],
];

function classify(sourceFile) {
  for (const [prefix, kind] of CLASS_BY_FILE) if (sourceFile.startsWith(prefix)) return kind;
  return 'governance';
}

/**
 * The mapping itself, keyed by rule id.
 *
 * `cwes`      — CWE identifiers, every one of which must be in the 138.
 * `strength`  — `direct`  the rule's predicate IS that weakness;
 *               `partial` the weakness is a proxy or covers part of the rule.
 * `adoptable` — `yes` / `partial` / `no` (see the header).
 * `analysers` — concrete, existing checks. Named so the claim is falsifiable.
 */
const MAP = {
  // --- security/ : the part of the corpus that is squarely inside 5055 -------
  'SEC-INJ-01': { cwes: [78, 77], strength: 'direct', adoptable: 'yes',
    analysers: ['CodeQL js/command-line-injection', 'Semgrep javascript.lang.security.detect-child-process', 'SonarQube S2076'],
    note: 'Shell execution with interpolated user input is OS command injection verbatim.' },
  'SEC-INJ-02': { cwes: [77, 88], strength: 'partial', adoptable: 'partial',
    analysers: ['CodeQL taint tracking to child_process sinks'],
    note: 'Taint analysis proves the sink is unsanitised; it cannot prove an allowlist exists, which is what the rule actually demands.' },
  'SEC-PATH-01': { cwes: [22, 23, 36], strength: 'direct', adoptable: 'yes',
    analysers: ['CodeQL js/path-injection', 'Semgrep path-traversal rules', 'SonarQube S2083'] },
  'SEC-PATH-02': { cwes: [22], strength: 'direct', adoptable: 'yes',
    analysers: ['CodeQL js/path-injection'] },
  'SEC-TIMING-01': { cwes: [], strength: 'none', adoptable: 'yes',
    analysers: ['Semgrep javascript.lang.security.audit.timing-attack', 'CodeQL js/timing-attack'],
    note: 'CWE-208 (observable timing discrepancy) is NOT one of the 138, so this is adoptable from an analyser but not countable against 5055.' },
  'SEC-TIMING-02': { cwes: [], strength: 'none', adoptable: 'partial',
    analysers: ['Semgrep timing-attack rules'],
    note: 'Same as SEC-TIMING-01; the early-length-rejection variant needs a bespoke pattern.' },
  'SEC-RL-01': { cwes: [], strength: 'none', adoptable: 'partial',
    analysers: ['Semgrep express-rate-limit presence rules'],
    note: 'CWE-770 is not in the 138; presence of a limiter is checkable, correct configuration is not.' },
  'SEC-RL-02': { cwes: [789], strength: 'partial', adoptable: 'partial',
    analysers: ['Semgrep express-body-parser-limit'],
    note: 'Unbounded request bodies are the uncontrolled-allocation weakness reached through a framework default.' },
  'SEC-RL-03': { cwes: [], strength: 'none', adoptable: 'no',
    note: 'HTTP server timeout configuration has no 5055 weakness and no off-the-shelf check.' },

  // --- adr-0002 hexagonal architecture : layer structure --------------------
  'HXA-01': { cwes: [1054], strength: 'partial', adoptable: 'yes',
    analysers: ['dependency-cruiser', 'ArchUnit', 'eslint-plugin-boundaries'],
    note: 'Framework imports in the domain layer are a layering violation; 5055 models layering as the layer-skipping call.' },
  'HXA-02': { cwes: [1054], strength: 'partial', adoptable: 'yes', analysers: ['dependency-cruiser', 'ArchUnit'] },
  'HXA-03': { cwes: [1054], strength: 'partial', adoptable: 'yes', analysers: ['dependency-cruiser', 'ArchUnit'] },
  'HXA-04': { cwes: [1054, 1047], strength: 'direct', adoptable: 'yes',
    analysers: ['dependency-cruiser no-circular + layer rules', 'ArchUnit layeredArchitecture()'],
    note: 'Dependency direction is exactly what CWE-1054 and CWE-1047 measure.' },
  'HXA-05': { cwes: [], strength: 'none', adoptable: 'partial', analysers: ['ESLint no-restricted-imports'],
    note: 'AOP placement is an Evolith convention; import bans approximate it.' },
  'HXA-06': { cwes: [], strength: 'none', adoptable: 'no' },
  'HXA-07': { cwes: [], strength: 'none', adoptable: 'no',
    note: 'A property of the test process, not of code structure.' },

  // --- engineering manifesto : classic maintainability ----------------------
  'EM-S-01': { cwes: [1048, 1080, 1121], strength: 'partial', adoptable: 'yes',
    analysers: ['SonarQube complexity + size metrics', 'CAST ASCMM'],
    note: 'Single Responsibility is not a weakness; 5055 measures its symptoms (fan-out, file size, complexity).' },
  'EM-S-02': { cwes: [], strength: 'none', adoptable: 'no', note: 'Open/Closed has no structural signature.' },
  'EM-S-03': { cwes: [1055, 1074], strength: 'partial', adoptable: 'partial',
    analysers: ['SonarQube inheritance-depth rules'],
    note: 'Liskov violations are not decidable statically; inheritance shape is the available proxy.' },
  'EM-S-04': { cwes: [1064], strength: 'partial', adoptable: 'partial', analysers: ['SonarQube S107'] },
  'EM-S-05': { cwes: [1047], strength: 'partial', adoptable: 'yes',
    analysers: ['dependency-cruiser no-circular', 'ArchUnit'] },
  'EM-D-01': { cwes: [1041], strength: 'direct', adoptable: 'yes',
    analysers: ['PMD CPD', 'SonarQube duplication', 'jscpd'],
    note: 'DRY is CWE-1041 (redundant / copy-paste code) and clone detection is commodity.' },
  'EM-D-02': { cwes: [1051, 1052], strength: 'partial', adoptable: 'partial',
    analysers: ['SonarQube hard-coded literal rules'] },
  'EM-K-01': { cwes: [1121], strength: 'direct', adoptable: 'yes',
    analysers: ['SonarQube S3776 / cyclomatic complexity', 'ESLint complexity'] },
  'EM-K-02': { cwes: [1074], strength: 'partial', adoptable: 'partial', analysers: ['SonarQube inheritance depth'] },
  'EM-Y-01': { cwes: [561, 1041], strength: 'direct', adoptable: 'yes',
    analysers: ['SonarQube dead-code rules', 'ts-prune', 'knip'] },

  // --- quality thresholds ---------------------------------------------------
  'QT-01': { cwes: [], strength: 'none', adoptable: 'yes',
    analysers: ['Jest/Istanbul coverage', 'SonarQube coverage'],
    note: 'Coverage is a test measure, not a structural weakness; 5055 does not model it, but no handler is needed either.' },
  'QT-02': { cwes: [1121], strength: 'direct', adoptable: 'yes', analysers: ['SonarQube S3776', 'ESLint complexity'] },
  'QT-03': { cwes: [22, 78, 89, 79, 798, 732], strength: 'partial', adoptable: 'yes',
    analysers: ['CodeQL security suite', 'SonarQube security hotspots'],
    note: 'The rule is a threshold over the whole 5055 Security measure (74 weaknesses); the CWEs listed are representatives, not the closed set.' },
  'QT-04': { cwes: [], strength: 'none', adoptable: 'yes',
    analysers: ['SonarQube SQALE debt ratio', 'OMG ATDM V2'],
    note: 'Technical debt ratio is derived FROM 5055 by OMG ATDM V2, not a weakness in it. See GT-599.' },
  'QT-05': { cwes: [], strength: 'none', adoptable: 'no' },
  'QT-06': { cwes: [], strength: 'none', adoptable: 'no' },
  'QT-07': { cwes: [], strength: 'none', adoptable: 'no' },
  'QT-08': { cwes: [], strength: 'none', adoptable: 'partial', analysers: ['openapi-diff', 'Buf breaking'] },

  // --- taxonomy / naming ----------------------------------------------------
  'TAX-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint filenames', 'Checkstyle'],
    note: 'CWE-1099 (inconsistent naming) is not among the 138, but linters decide this rule outright.' },
  'TAX-02': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint @typescript-eslint/naming-convention'] },
  'TAX-03': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint @typescript-eslint/naming-convention'] },
  'TAX-04': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint @typescript-eslint/naming-convention'] },

  // --- multi-tenancy --------------------------------------------------------
  'MTN-01': { cwes: [1057], strength: 'partial', adoptable: 'partial',
    analysers: ['CAST ASCPEM/ASCSM data-access-outside-manager'],
    note: 'Data access outside the expected data manager is the structural half of "filtering happens in one layer".' },
  'MTN-02': { cwes: [1057], strength: 'partial', adoptable: 'no' },
  'MTN-04': { cwes: [732], strength: 'partial', adoptable: 'no',
    note: 'Cross-tenant reachability is a product invariant; no analyser knows what a tenant is here.' },

  // --- access control -------------------------------------------------------
  'ABAC-01': { cwes: [732], strength: 'partial', adoptable: 'no' },

  // --- dependency pinning / supply chain ------------------------------------
  'DEP-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm-package-json-lint', 'custom lint on package.json'] },
  'DEP-02': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm-package-json-lint'] },
  'DEP-03': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm-package-json-lint'] },
  'DEP-04': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['file presence check in any CI linter'] },
  'DEP-06': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm audit', 'OWASP Dependency-Check', 'Trivy'] },
  'DEP-07': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm audit', 'OSV-Scanner', 'Trivy'],
    note: 'CVE state in dependencies is SCA territory; ISO/IEC 5055 measures the code you own, not the code you import.' },
  'DEP-09': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['Renovate / Dependabot config presence'] },

  // --- definition of done ---------------------------------------------------
  'DOD-02': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['Istanbul / SonarQube coverage gate'] },
  'DOD-09': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint', 'Prettier --check'] },

  // --- gitflow --------------------------------------------------------------
  'GIT-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['branch-name regex in any CI'] },
  'GIT-04': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['semver tag regex'] },
  'GIT-08': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['commitlint @commitlint/config-conventional'] },

  // --- CI/CD gates ----------------------------------------------------------
  'CICD-01': { cwes: [], strength: 'none', adoptable: 'partial', analysers: ['workflow inspection'] },
  'CICD-02': { cwes: [], strength: 'none', adoptable: 'partial', analysers: ['workflow inspection'] },
  'CICD-03': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['gitleaks', 'trufflehog', 'GitHub secret scanning'] },

  // --- topology rules with a structural core --------------------------------
  'MM-R09': { cwes: [1047], strength: 'partial', adoptable: 'yes', analysers: ['dependency-cruiser', 'ArchUnit'] },
  'MM-R10': { cwes: [], strength: 'none', adoptable: 'yes',
    analysers: ['any AST analyser'],
    note: 'The rule literally requires that an AST analyser be in place; adopting one satisfies it.' },
  'MM-R12': { cwes: [1090], strength: 'partial', adoptable: 'partial', analysers: ['SonarQube feature-envy style rules'] },
  'SV-R02': { cwes: [1042], strength: 'partial', adoptable: 'partial',
    analysers: ['ESLint no-module-level-mutable-state style rules'],
    note: 'Serverless statelessness shows up as static/module-level mutable state.' },
  'AAI-R09': { cwes: [798], strength: 'partial', adoptable: 'partial', analysers: ['gitleaks', 'CodeQL js/hardcoded-credentials'] },

  // --- generated ADR-conformance rules with a structural core ---------------
  'CORE-0011-01': { cwes: [703, 390], strength: 'partial', adoptable: 'partial',
    analysers: ['SonarQube empty-catch rules'], note: 'Resiliency ADR; the analysable part is exception handling that does nothing.' },
  'CORE-0014-01': { cwes: [1049, 1067], strength: 'partial', adoptable: 'partial', analysers: ['CAST ASCPEM'] },
  'CORE-0037-01': { cwes: [407, 1050], strength: 'partial', adoptable: 'partial', analysers: ['CAST ASCPEM'] },
  'CORE-0049-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint naming-convention', 'SonarQube naming rules'] },
  'CORE-0056-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['ESLint', 'Checkstyle', 'dotnet format'] },
  'CORE-0071-01': { cwes: [1074, 1086], strength: 'partial', adoptable: 'partial', analysers: ['SonarQube inheritance metrics'] },
  'CORE-0087-01': { cwes: [732], strength: 'partial', adoptable: 'no' },
  'CORE-0091-01': { cwes: [798], strength: 'partial', adoptable: 'partial', analysers: ['gitleaks', 'CodeQL hardcoded credentials'] },
  'CORE-0092-01': { cwes: [835], strength: 'partial', adoptable: 'yes',
    analysers: ['SonarQube S2189 infinite loop', 'CodeQL js/loop-with-unreachable-exit'],
    note: 'The agent-loop ADR names circuit breakers; the code-level half is the unreachable-exit loop weakness.' },
  'CORE-0093-01': { cwes: [667], strength: 'partial', adoptable: 'yes',
    analysers: ['SonarQube locking rules', 'CodeQL concurrency queries'] },
  'CORE-0009-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['npm audit', 'OSV-Scanner', 'Renovate'] },
  'NODE-0003-01': { cwes: [], strength: 'none', adoptable: 'yes', analysers: ['tsc --strict', 'typescript-eslint strict config'] },
  'NODE-0038-01': { cwes: [390, 703], strength: 'partial', adoptable: 'partial', analysers: ['SonarQube empty-catch / ignored-return rules'] },
  'DOT-0065-01': { cwes: [], strength: 'none', adoptable: 'partial', analysers: ['Semgrep PII-in-logs patterns'] },
};

/** Why an unmapped rule is unmapped — by class, so the "no equivalent" claim is auditable. */
const NO_EQUIVALENT_REASON = {
  'architecture-decision':
    'Conformance to a recorded architecture decision. ISO/IEC 5055 measures source structure, not whether a decision was honoured.',
  process:
    'A property of the development process (pipeline, branch, review, test strategy), which is outside the scope of a source-code measure.',
  governance:
    'A governance invariant over Evolith artifacts (inheritance, open-core boundary, satellites, evidence). No international structural equivalent.',
  topology:
    'A contract of a named architecture topology. The predicate is about declared topology configuration, not about code structure.',
  'platform-surface':
    'A CLI / MCP surface contract. Specific to this product; no standards analyser models it.',
  operations: 'An operational telemetry expectation, evaluated from runtime evidence rather than source structure.',
  deployment: 'A deployment / chart packaging invariant, outside the scope of a source-code measure.',
  'supply-chain': 'Dependency-management hygiene. Covered by SCA tooling rather than by ISO/IEC 5055.',
  'code-hygiene': 'Code-adjacent convention with no ISO/IEC 5055 weakness, though a linter may still decide it.',
  'code-structure': 'Structural rule with no counterpart among the 138 weaknesses.',
};

// ---------------------------------------------------------------------------
// 3. Build
// ---------------------------------------------------------------------------

/**
 * Re-scope the handler backlog.
 *
 * GT-595 already established that the "~240 handlers to write" figure was wrong:
 * the real, decidable-from-the-repository backlog is the `unimplemented-native`
 * class. This folds the 5055 mapping onto exactly that class, plus the two
 * adapter classes, so the answer to "adopt or author?" is stated per class
 * instead of over the whole corpus, where it would be diluted by 129
 * documentation-only rules that nobody was ever going to implement.
 */
function backlogStats(entries, evaluabilityDoc) {
  const CLASSES = [
    'unimplemented-native',
    'needs-external-system',
    'needs-runtime',
    'documentation-only',
    'underspecified',
    'native-handler',
    'not-in-snapshot',
  ];
  const per = {};
  for (const cls of CLASSES) {
    const set = entries.filter((e) => e.nativeEvaluability === cls);
    if (set.length === 0) continue;
    const adoptable = set.filter((e) => e.analyser.adoptable === 'yes');
    const adoptablePartial = set.filter((e) => e.analyser.adoptable === 'partial');
    const mapped = set.filter((e) => e.iso5055.strength !== 'none');
    per[cls] = {
      rules: set.length,
      mappedToIso5055: mapped.length,
      analyserAdoptable: adoptable.length,
      analyserAdoptablePartial: adoptablePartial.length,
      adoptableRuleIds: adoptable.map((e) => e.ruleId),
      adoptablePartialRuleIds: adoptablePartial.map((e) => e.ruleId),
    };
  }
  const backlog = per['unimplemented-native'] ?? { rules: 0, analyserAdoptable: 0, analyserAdoptablePartial: 0, mappedToIso5055: 0 };
  return {
    source: 'native-evaluability-snapshot.json',
    sourceAuthority: evaluabilityDoc.capturedFrom,
    note:
      'The handler backlog is the `unimplemented-native` class only. `documentation-only` and `underspecified` rules are not handler work at all, and the two adapter classes are closed by the enforcer seam rather than by a rule handler.',
    realBacklogSize: backlog.rules,
    adoptableFromAnalyser: backlog.analyserAdoptable,
    adoptableFromAnalyserIncludingPartial: backlog.analyserAdoptable + backlog.analyserAdoptablePartial,
    adoptedFractionOfBacklog: backlog.rules === 0 ? 0 : Number((backlog.analyserAdoptable / backlog.rules).toFixed(4)),
    adoptedFractionOfBacklogIncludingPartial:
      backlog.rules === 0 ? 0 : Number(((backlog.analyserAdoptable + backlog.analyserAdoptablePartial) / backlog.rules).toFixed(4)),
    remainderToAuthor: backlog.rules - backlog.analyserAdoptable - backlog.analyserAdoptablePartial,
    byEvaluabilityClass: per,
  };
}

function build() {
  const weaknessDoc = JSON.parse(fs.readFileSync(WEAKNESSES, 'utf8'));
  const evaluabilityDoc = JSON.parse(fs.readFileSync(EVALUABILITY, 'utf8'));
  const known = new Set(Object.keys(weaknessDoc.weaknesses).map(Number));

  const files = collectRulesetFiles(RULESETS);
  if (files.length === 0) {
    throw new Error(`No *.rules.json found under ${RULESETS} — the corpus scan found nothing, which is never a real state.`);
  }

  const rules = files.flatMap(extractRules);
  if (rules.length === 0) {
    throw new Error(`Scanned ${files.length} ruleset files and extracted 0 rules — the extractor is wrong, not the corpus.`);
  }

  const seen = new Set();
  const entries = [];
  for (const r of rules) {
    const key = `${r.ruleId}@${r.sourceFile}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const kind = classify(r.sourceFile);
    const m = MAP[r.ruleId];
    const cwes = m?.cwes ?? [];
    for (const c of cwes) {
      if (!known.has(c)) {
        throw new Error(`${r.ruleId} cites CWE-${c}, which is not one of the ${known.size} ISO/IEC 5055 weaknesses.`);
      }
    }
    const measures = [...new Set(cwes.flatMap((c) => weaknessDoc.weaknesses[String(c)].measures))].sort();

    entries.push({
      ruleId: r.ruleId,
      sourceFile: r.sourceFile,
      title: r.title,
      severity: r.severity,
      ruleClass: kind,
      iso5055: {
        cwes,
        weaknesses: cwes.map((c) => weaknessDoc.weaknesses[String(c)].name),
        measures,
        strength: m?.strength ?? 'none',
      },
      analyser: {
        adoptable: m?.adoptable ?? 'no',
        examples: m?.analysers ?? [],
      },
      // Why the rule does not run natively today, from the captured Core triage.
      // `not-in-snapshot` means the Core corpus loader does not see this rule at
      // all (single-rule infrastructure files), which is itself worth knowing.
      nativeEvaluability: evaluabilityDoc.classes[r.ruleId] ?? 'not-in-snapshot',
      // An unmapped rule must always carry a stated reason: "no international
      // equivalent" is a claim, and a claim without a reason is the thing this
      // whole exercise exists to remove.
      note: m?.note ?? NO_EQUIVALENT_REASON[kind],
    });
  }

  entries.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.ruleId.localeCompare(b.ruleId));

  const mapped = entries.filter((e) => e.iso5055.strength !== 'none');
  const direct = entries.filter((e) => e.iso5055.strength === 'direct');
  const adoptYes = entries.filter((e) => e.analyser.adoptable === 'yes');
  const adoptPartial = entries.filter((e) => e.analyser.adoptable === 'partial');

  const doc = {
    $id: 'https://evolith.dev/rulesets/standards/iso-5055-mapping.json',
    title: 'Evolith ruleset corpus mapped to ISO/IEC 5055:2021',
    description:
      'One row per rule in the Evolith corpus: the ISO/IEC 5055 weakness it corresponds to (as CWE), or an explicit statement that it has no international equivalent, plus whether an existing standards-based analyser could already evaluate it. Generated by build-iso-5055-mapping.mjs — do not edit by hand.',
    version: MAPPING_VERSION,
    generatedBy: 'src/rulesets/standards/build-iso-5055-mapping.mjs',
    gap: 'GT-598',
    taxonomyNote:
      'ISO/IEC 25010:2023 (2nd edition) defines NINE product-quality characteristics: Functional suitability, Performance efficiency, Compatibility, Interaction capability (formerly Usability), Reliability, Security, Maintainability, Flexibility (formerly Portability) and Safety (new). ISO/IEC 5055 automates four of them: Reliability, Security, Performance efficiency and Maintainability. Any mapping to the 2011 eight-characteristic model is stale.',
    standard: weaknessDoc.standard,
    corpus: {
      rulesetFiles: files.length,
      rules: entries.length,
      note: 'Files that carry gate definitions or topology recommendations rather than conformance rules contribute no rows: architecture/topology-recommendation.rules.json and sdlc/phase-gates.rules.json.',
    },
    summary: {
      rules: entries.length,
      mappedToIso5055: mapped.length,
      mappedDirect: direct.length,
      mappedPartial: mapped.length - direct.length,
      noInternationalEquivalent: entries.length - mapped.length,
      adoptedFraction: Number((mapped.length / entries.length).toFixed(4)),
      analyserAdoptable: adoptYes.length,
      analyserAdoptablePartial: adoptPartial.length,
      analyserAdoptableFraction: Number((adoptYes.length / entries.length).toFixed(4)),
      analyserAdoptableFractionIncludingPartial: Number(((adoptYes.length + adoptPartial.length) / entries.length).toFixed(4)),
      byClass: Object.fromEntries(
        [...new Set(entries.map((e) => e.ruleClass))].sort().map((k) => {
          const set = entries.filter((e) => e.ruleClass === k);
          return [k, {
            rules: set.length,
            mapped: set.filter((e) => e.iso5055.strength !== 'none').length,
            adoptable: set.filter((e) => e.analyser.adoptable === 'yes').length,
          }];
        }),
      ),
    },
    // The number GT-598 actually exists to produce: what the "adopt instead of
    // author" move is worth against the REAL handler backlog, which GT-595
    // already cut from ~240 to 60.
    handlerBacklog: backlogStats(entries, evaluabilityDoc),
    rules: entries,
  };

  const csv = [
    'ruleId,sourceFile,ruleClass,cwes,iso5055Measures,mappingStrength,analyserAdoptable,nativeEvaluability',
    ...entries.map((e) =>
      [
        e.ruleId,
        e.sourceFile,
        e.ruleClass,
        e.iso5055.cwes.map((c) => `CWE-${c}`).join(' '),
        e.iso5055.measures.join(' '),
        e.iso5055.strength,
        e.analyser.adoptable,
        e.nativeEvaluability,
      ].map((v) => (String(v).includes(',') ? `"${v}"` : String(v))).join(','),
    ),
  ].join('\n') + '\n';

  return { doc, csv, json: JSON.stringify(doc, null, 2) + '\n' };
}

// ---------------------------------------------------------------------------
// 4. Entry point
// ---------------------------------------------------------------------------

const CHECK = process.argv.includes('--check');
const { doc, csv, json } = build();

if (CHECK) {
  const problems = [];
  for (const [file, expected] of [[OUT_JSON, json], [OUT_CSV, csv]]) {
    if (!fs.existsSync(file)) problems.push(`${path.basename(file)} is missing`);
    else if (fs.readFileSync(file, 'utf8') !== expected) problems.push(`${path.basename(file)} is stale — re-run without --check`);
  }
  if (problems.length > 0) {
    console.error('GT-598: ISO/IEC 5055 mapping is out of date:');
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log(
    `GT-598: ISO/IEC 5055 mapping up to date — ${doc.summary.rules} rules, ` +
      `${doc.summary.mappedToIso5055} mapped (${(doc.summary.adoptedFraction * 100).toFixed(1)}%), ` +
      `${doc.summary.analyserAdoptable} analyser-adoptable.`,
  );
} else {
  fs.writeFileSync(OUT_JSON, json);
  fs.writeFileSync(OUT_CSV, csv);
  console.log(`Wrote ${path.relative(process.cwd(), OUT_JSON)} and ${path.relative(process.cwd(), OUT_CSV)}`);
  console.log(JSON.stringify(doc.summary, null, 2));
}
