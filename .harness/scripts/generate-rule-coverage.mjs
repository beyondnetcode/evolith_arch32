#!/usr/bin/env node

/**
 * Manifest-driven Native/OPA coverage report.
 *
 * This low-cost gate verifies declared topology artifacts and rule-ID coverage.
 * GT-149 owns executable OPA evaluation and semantic differential testing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MANIFEST_ROOT = path.join('reference', 'core', 'architecture', 'topologies');
const SATELLITE_CONTRACT = path.join('src', 'rulesets', 'governance', 'satellite-contracts.rules.json');

function walk(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target, predicate);
    return entry.isFile() && predicate(target) ? [target] : [];
  });
}

function readJson(filePath, errors) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { errors.push(`${filePath}: invalid JSON (${error.message})`); return undefined; }
}

function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function opaRuleIds(content) {
  const ids = [...content.matchAll(/violations\[\{\s*"id"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
  return [...new Set(ids)];
}

function validateSatelliteReferences(root, errors) {
  const contractPath = path.join(root, SATELLITE_CONTRACT);
  const contract = readJson(contractPath, errors);
  if (!contract) return;
  for (const [name, declared] of Object.entries(contract.reference || {})) {
    if (typeof declared !== 'string' || /^https?:\/\//.test(declared)) continue;
    const target = path.resolve(path.dirname(contractPath), declared);
    if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
      errors.push(`${relative(root, contractPath)} reference.${name} does not resolve: ${declared}`);
    }
  }
}

export function validateTopologyRuleCoverage(root = process.cwd()) {
  const errors = [];
  const warnings = [];
  const rows = [];
  const declaredArtifacts = new Set();
  const acceptedDirectories = [];
  const globalNativeIds = new Map();
  const manifests = walk(path.join(root, MANIFEST_ROOT), (file) => path.basename(file) === 'topology.manifest.json').sort();
  if (manifests.length === 0) errors.push(`No topology manifests found under ${MANIFEST_ROOT}`);

  for (const manifestPath of manifests) {
    const manifest = readJson(manifestPath, errors);
    if (!manifest) continue;
    const topology = manifest.metadata?.id || relative(root, manifestPath);
    const accepted = manifest.metadata?.status === 'accepted';
    if (accepted) acceptedDirectories.push(path.dirname(manifestPath));
    const nativePaths = manifest.spec?.artifacts?.rulesets || [];
    const opaPaths = manifest.spec?.artifacts?.opaPolicies || [];
    const nativeIds = [];
    const opaIds = [];
    const report = (message) => (accepted ? errors : warnings).push(message);
    if (nativePaths.length === 0) report(`${topology}: manifest has no Native ruleset`);
    if (opaPaths.length === 0) report(`${topology}: manifest has no OPA policy`);

    for (const declared of nativePaths) {
      const target = path.resolve(root, declared);
      declaredArtifacts.add(target);
      if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
        report(`${topology}: Native ruleset does not resolve: ${declared}`);
        continue;
      }
      const ruleset = readJson(target, errors);
      const ids = ruleset?.rules?.map((rule) => rule?.id).filter(Boolean) || [];
      if (ids.length === 0) report(`${topology}: Native ruleset has no rule IDs: ${declared}`);
      if (new Set(ids).size !== ids.length) report(`${topology}: Native ruleset has duplicate rule IDs: ${declared}`);
      for (const id of ids) {
        nativeIds.push(id);
        if (globalNativeIds.has(id)) report(`${topology}: duplicate Native rule ID ${id} also declared by ${globalNativeIds.get(id)}`);
        else globalNativeIds.set(id, topology);
      }
    }

    for (const declared of opaPaths) {
      const target = path.resolve(root, declared);
      declaredArtifacts.add(target);
      if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
        report(`${topology}: OPA policy does not resolve: ${declared}`);
        continue;
      }
      const ids = opaRuleIds(fs.readFileSync(target, 'utf8'));
      opaIds.push(...ids);
      if (new Set(ids).size !== ids.length) report(`${topology}: OPA policy has duplicate rule IDs: ${declared}`);
    }

    const nativeSet = new Set(nativeIds);
    const opaSet = new Set(opaIds);
    const missingInOpa = nativeIds.filter((id) => !opaSet.has(id));
    const orphanedInOpa = opaIds.filter((id) => !nativeSet.has(id));
    if (missingInOpa.length) report(`${topology}: Native rule IDs missing in OPA (GT-149): ${missingInOpa.join(', ')}`);
    if (orphanedInOpa.length) report(`${topology}: OPA rule IDs missing in Native ruleset (GT-149): ${orphanedInOpa.join(', ')}`);
    rows.push({ topology, status: manifest.metadata?.status || 'unknown', native: nativeSet.size, opa: opaSet.size, aligned: missingInOpa.length === 0 && orphanedInOpa.length === 0 });
  }

  for (const artifact of walk(path.join(root, MANIFEST_ROOT), (file) => file.endsWith('.rules.json') || (file.endsWith('.rego') && !file.endsWith('.test.rego')))) {
    const acceptedArtifact = acceptedDirectories.some((directory) => path.resolve(artifact).startsWith(`${path.resolve(directory)}${path.sep}`));
    if (!declaredArtifacts.has(path.resolve(artifact))) {
      (acceptedArtifact ? errors : warnings).push(`Unreferenced topology rule artifact: ${relative(root, artifact)}`);
    }
  }
  validateSatelliteReferences(root, errors);
  return { rows, errors, warnings };
}

export function formatCoverageReport({ rows, errors, warnings = [] }) {
  const lines = [
    '=== Topology Native/OPA Rule Coverage Matrix ===',
    '| Topology | Status | Native IDs | OPA IDs | Coverage |',
    '|---|---|---:|---:|---|',
    ...rows.map((row) => `| ${row.topology} | ${row.status} | ${row.native} | ${row.opa} | ${row.aligned ? 'PASS' : 'WARN (GT-149)'} |`),
  ];
  if (warnings.length) lines.push('', 'Warnings:', ...warnings.map((warning) => `- ${warning}`));
  if (errors.length) lines.push('', 'Errors:', ...errors.map((error) => `- ${error}`));
  return lines.join('\n');
}

function run() {
  const result = validateTopologyRuleCoverage();
  console.log(formatCoverageReport(result));
  if (result.errors.length) process.exit(1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) run();
