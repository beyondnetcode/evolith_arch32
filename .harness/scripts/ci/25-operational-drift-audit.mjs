#!/usr/bin/env node
/**
 * @file 25-operational-drift-audit.mjs
 * @description CI Step: Operational Capability & Efficiency Drift Audit (GT-147)
 *
 * Runs the reusable {@link drift-audit.mjs} evaluator over the numbered CI step
 * scripts (capability sources) and every accepted topology manifest, then emits
 * a versioned machine-readable report plus a concise human summary. Fails when
 * any error-severity drift is found (false success, unbounded external calls,
 * missing accepted-topology artifacts).
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { auditSources, auditTopology, summarize } from './drift-audit.mjs';
// GT-556/557: roots came from process.cwd(), so running from src/ crashed (or, worse,
// scanned a subset). The `existsSync` skip over TOPO_ROOTS meant a root that moved was
// silently dropped instead of failing. Both are now fail-closed.
import { REPO_ROOT, collectFiles, resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = REPO_ROOT;
const CI_DIR = '.harness/scripts/ci';
// GT-329: canonical topology roots — progressive-axis stays in reference/; advanced topologies in rulesets/
const TOPO_ROOT_KEYS = ['topologiesReference', 'topologiesRulesets'];

function capabilityScripts() {
  const ciDir = resolveKey('harnessCiScripts');
  const scripts = readdirSync(ciDir)
    .filter((f) => /^\d+-.*\.mjs$/.test(f) && !f.endsWith('.test.mjs'))
    .map((f) => ({ file: `${CI_DIR}/${f}`, source: readFileSync(resolve(ciDir, f), 'utf8') }));

  assertScanned(scripts.length, { what: 'CI capability scripts', where: 'harnessCiScripts' });
  return scripts;
}

function topologyManifests() {
  const files = collectFiles(TOPO_ROOT_KEYS, 'topology.manifest.json');
  assertScanned(files.length, { what: 'topology manifests', where: TOPO_ROOT_KEYS });

  return files.map((full) => {
    const dir = relativeToRoot(dirname(full));
    try {
      return { dir, manifest: JSON.parse(readFileSync(full, 'utf8')) };
    } catch (e) {
      return { dir, manifest: null, parseError: e.message, file: relativeToRoot(full) };
    }
  });
}

function main() {
  const report = auditSources(capabilityScripts());
  const exists = (rel) => existsSync(resolve(ROOT, rel));

  for (const t of topologyManifests()) {
    if (t.manifest === null) {
      report.findings.push({
        ruleId: 'TOPO-INVALID-MANIFEST',
        severity: 'error',
        title: `Unparseable topology manifest: ${t.parseError}`,
        file: t.file,
      });
      continue;
    }
    report.findings.push(...auditTopology(t.manifest, exists, t.dir));
  }

  report.counts = {
    error: report.findings.filter((f) => f.severity === 'error').length,
    warning: report.findings.filter((f) => f.severity === 'warning').length,
  };

  console.log('🔎 Operational Capability & Efficiency Drift Audit (GT-147)');
  console.log(summarize(report));
  console.log(`AUDIT ${JSON.stringify(report)}`);
  process.exit(report.counts.error > 0 ? 1 : 0);
}

main();
