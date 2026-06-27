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
import { resolve } from 'node:path';
import { auditSources, auditTopology, summarize } from './drift-audit.mjs';

const ROOT = process.cwd();
const CI_DIR = '.harness/scripts/ci';
// GT-329: canonical topology roots — progressive-axis stays in reference/; advanced topologies in rulesets/
const TOPO_ROOTS = [
  'reference/architecture/topologies',
  'rulesets/topologies',
];

function capabilityScripts() {
  return readdirSync(resolve(ROOT, CI_DIR))
    .filter((f) => /^\d+-.*\.mjs$/.test(f) && !f.endsWith('.test.mjs'))
    .map((f) => ({ file: `${CI_DIR}/${f}`, source: readFileSync(resolve(ROOT, CI_DIR, f), 'utf8') }));
}

function topologyManifests() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === 'topology.manifest.json') {
        try {
          out.push({ dir, manifest: JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')) });
        } catch (e) {
          out.push({ dir, manifest: null, parseError: e.message, file: rel });
        }
      }
    }
  };
  for (const root of TOPO_ROOTS) {
    if (existsSync(resolve(ROOT, root))) walk(root);
  }
  return out;
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
