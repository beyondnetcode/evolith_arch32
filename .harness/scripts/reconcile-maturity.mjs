import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(process.env.EVOLITH_MATURITY_ROOT || '.');
const VISION_DIR = path.join(ROOT, 'reference/governance/standards/vision');
const BOARD = path.join(VISION_DIR, 'gap-tracking.md');
const REGISTRY = path.join(VISION_DIR, 'gap-closure-evidence.json');
const CLI_PACKAGE = path.join(ROOT, 'sdk/cli/package.json');
const OUTPUT = path.join(VISION_DIR, 'maturity-reconciliation.json');

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

export function buildSnapshot(root = ROOT) {
  const board = parseBoard(fs.readFileSync(path.join(root, 'reference/governance/standards/vision/gap-tracking.md'), 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'reference/governance/standards/vision/gap-closure-evidence.json'), 'utf8'));
  const cliPackage = JSON.parse(fs.readFileSync(path.join(root, 'sdk/cli/package.json'), 'utf8'));
  const closures = registry.closures || [];

  if (closures.length !== board.counts.done) {
    throw new Error(`Closure evidence count (${closures.length}) differs from DONE count (${board.counts.done})`);
  }

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
    externalProducts: [
      { name: 'Evolith Tracker', maturityIncluded: false, reason: 'Independent product repository and evidence lifecycle' },
      { name: 'Evolith Product Suite', maturityIncluded: false, reason: 'Product strategy scope is not Core implementation evidence' },
    ],
    sources: [
      'reference/governance/standards/vision/gap-tracking.md',
      'reference/governance/standards/vision/gap-closure-evidence.json',
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

