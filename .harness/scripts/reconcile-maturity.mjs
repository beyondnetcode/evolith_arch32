import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(process.env.EVOLITH_MATURITY_ROOT || '.');
const VISION_DIR = path.join(ROOT, 'reference/governance/standards/vision');
const BOARD = path.join(VISION_DIR, 'gap-tracking.md');
const REGISTRY = path.join(VISION_DIR, 'gap-closure-evidence.json');
const CLI_PACKAGE = path.join(ROOT, 'sdk/cli/package.json');
const RUNTIME_EVIDENCE = path.join(VISION_DIR, 'maturity-evidence.json');
const OUTPUT = path.join(VISION_DIR, 'maturity-reconciliation.json');
const EVIDENCE_STATUSES = new Set(['PASS', 'BLOCKED']);
const REQUIRED_CHECKS = new Set(['cli-baseline', 'coverage', 'documentation', 'release']);

function countFiles(directory, pattern, excludePattern) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return total + countFiles(target, pattern, excludePattern);
    return total + Number(pattern.test(entry.name) && (!excludePattern || !excludePattern.test(entry.name)));
  }, 0);
}

export function parseBoard(content) {
  const lastUpdated = content.match(/\*\*Last Updated:\*\* (\d{4}-\d{2}-\d{2})/)?.[1];
  const statuses = [...content.matchAll(/^\| \[`GT-\d+`]\([^)]*\) .*\| `(DONE|PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
    .map((match) => match[1]);
  const counts = {
    total: statuses.length,
    done: statuses.filter((status) => status === 'DONE').length,
    pending: statuses.filter((status) => status === 'PENDING').length,
    inProgress: statuses.filter((status) => status === 'IN-PROGRESS').length,
    deferred: statuses.filter((status) => status === 'DEFERRED').length,
  };
  if (!lastUpdated || counts.total === 0) throw new Error('Could not parse the canonical gap board');
  return { lastUpdated, counts };
}

function commitExists(root, commit) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function validateRuntimeEvidence(evidence, board, root = ROOT, now = new Date()) {
  const errors = [];
  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  const activeGaps = new Set(
    [...board.content.matchAll(/^\| \[`(GT-\d+)`]\([^)]*\) .*\| `(PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
      .map((match) => match[1]),
  );
  const ids = new Set();

  if (evidence?.schemaVersion !== '1.0.0') errors.push('Unsupported maturity evidence schemaVersion');
  if (evidence?.asOf !== board.lastUpdated) errors.push('Maturity evidence date differs from the gap board');

  for (const check of checks) {
    if (!check?.id || ids.has(check.id)) errors.push(`Invalid or duplicate maturity check: ${check?.id || '<missing>'}`);
    ids.add(check?.id);
    if (!EVIDENCE_STATUSES.has(check?.status)) errors.push(`${check?.id} has unsupported status`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(check?.observedAt || '')) {
      errors.push(`${check?.id} has invalid observedAt`);
    } else {
      const ageDays = Math.floor((now - new Date(`${check.observedAt}T00:00:00Z`)) / 86400000);
      if (ageDays < 0 || ageDays > 30) errors.push(`${check.id} evidence is stale or future-dated`);
    }
    if (!/^[0-9a-f]{7,40}$/i.test(check?.commit || '') || !commitExists(root, check.commit)) {
      errors.push(`${check?.id} references an unavailable commit`);
    }
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(check?.source || '')) {
      errors.push(`${check?.id} has an invalid workflow source`);
    }
    if (typeof check?.summary !== 'string' || !check.summary.trim()) errors.push(`${check?.id} lacks a summary`);
    if (check?.status === 'BLOCKED' && (!check.gap || !activeGaps.has(check.gap))) {
      errors.push(`${check?.id} must map BLOCKED evidence to an active gap`);
    }
    if (check?.status === 'PASS' && check?.gap) errors.push(`${check.id} PASS evidence cannot declare a blocking gap`);
  }

  for (const required of REQUIRED_CHECKS) {
    if (!ids.has(required)) errors.push(`Missing required maturity check: ${required}`);
  }
  return errors;
}

export function buildSnapshot(root = ROOT) {
  const boardContent = fs.readFileSync(path.join(root, 'reference/governance/standards/vision/gap-tracking.md'), 'utf8');
  const board = { ...parseBoard(boardContent), content: boardContent };
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'reference/governance/standards/vision/gap-closure-evidence.json'), 'utf8'));
  const cliPackage = JSON.parse(fs.readFileSync(path.join(root, 'sdk/cli/package.json'), 'utf8'));
  const runtimeEvidence = JSON.parse(fs.readFileSync(path.join(root, 'reference/governance/standards/vision/maturity-evidence.json'), 'utf8'));
  const closures = registry.closures || [];

  if (closures.length !== board.counts.done) {
    throw new Error(`Closure evidence count (${closures.length}) differs from DONE count (${board.counts.done})`);
  }
  const evidenceErrors = validateRuntimeEvidence(runtimeEvidence, board, root);
  if (evidenceErrors.length) throw new Error(`Invalid runtime maturity evidence:\n- ${evidenceErrors.join('\n- ')}`);

  return {
    schemaVersion: '1.0.0',
    scope: 'evolith-core',
    asOf: board.lastUpdated,
    gaps: board.counts,
    evidence: {
      closureRecords: closures.length,
      cliPackage: `${cliPackage.name}@${cliPackage.version}`,
      adrCount: countFiles(path.join(root, 'reference/architecture/adrs'), /^\d{4}-.*\.md$/, /\.es\.md$/),
      rulesetCount: countFiles(path.join(root, 'rulesets'), /\.rules\.json$/),
      schemaCount: countFiles(path.join(root, 'rulesets/schema'), /\.schema\.json$/),
    },
    readiness: runtimeEvidence.checks,
    externalProducts: [
      { name: 'Evolith Tracker', maturityIncluded: false, reason: 'Independent product repository and evidence lifecycle' },
      { name: 'Evolith Product Suite', maturityIncluded: false, reason: 'Product strategy scope is not Core implementation evidence' },
    ],
    sources: [
      'reference/governance/standards/vision/gap-tracking.md',
      'reference/governance/standards/vision/gap-closure-evidence.json',
      'reference/governance/standards/vision/maturity-evidence.json',
      'reference/governance/standards/vision/inventory-summary.md',
      'sdk/cli/package.json',
    ],
    validationCommands: [
      'node .harness/scripts/reconcile-maturity.mjs --check',
      'node .harness/scripts/validate-tracking.mjs',
      'npm test --workspace sdk/cli -- --runInBand',
    ],
  };
}

function serialize(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function run() {
  const expected = serialize(buildSnapshot());
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
      console.error('❌ Maturity reconciliation is stale. Run: node .harness/scripts/reconcile-maturity.mjs');
      process.exit(1);
    }
    console.log('✅ Maturity reconciliation matches the canonical Core evidence.');
    return;
  }
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log(`✅ Generated ${path.relative(ROOT, OUTPUT)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
