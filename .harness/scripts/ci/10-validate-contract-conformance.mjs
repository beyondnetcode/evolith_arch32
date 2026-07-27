import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = path.resolve(process.env.EVOLITH_CONTRACT_ROOT || '.');
const MANIFEST = path.join(ROOT, 'src/rulesets/contracts/evolith-machine-contracts.json');

export function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function validateManifest(manifest, root = ROOT) {
  const errors = [];
  if (!/^\d+\.\d+\.\d+$/.test(manifest.contractVersion || '')) errors.push('contractVersion must use SemVer');
  if (manifest.compatibilityPolicy !== 'semver-major') errors.push('compatibilityPolicy must be semver-major');
  if (!Array.isArray(manifest.schemas) || manifest.schemas.length === 0) errors.push('schemas must not be empty');

  for (const schema of manifest.schemas || []) {
    const target = path.resolve(root, schema.path || '');
    if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) {
      errors.push(`Schema does not resolve: ${schema.path}`);
    } else if (sha256(target) !== schema.sha256) {
      errors.push(`Schema hash mismatch: ${schema.id}`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(schema.version || '')) errors.push(`Invalid schema version: ${schema.id}`);
  }

  // GT-563: this path missed the `src/` prefix in the src/ refactor (MANIFEST above was
  // migrated, this one was not), so readFileSync threw ENOENT and the script crashed before
  // reporting anything. Because the calling job was gated to workflow_dispatch and skipped,
  // that crash was never surfaced: this check has not actually validated since the refactor.
  const cliPackage = JSON.parse(fs.readFileSync(path.join(root, 'src/sdk/cli/package.json'), 'utf8'));
  if (manifest.producer?.package !== cliPackage.name || manifest.producer?.version !== cliPackage.version) {
    errors.push('Producer declaration does not match src/sdk/cli/package.json');
  }
  return errors;
}

export function validateConsumer(consumer, manifest) {
  const errors = [];
  if (consumer.contractVersion !== manifest.contractVersion) errors.push('Consumer contractVersion is not supported');
  for (const expected of manifest.schemas) {
    const pinned = consumer.schemas?.find((schema) => schema.id === expected.id);
    if (!pinned) errors.push(`Consumer does not pin schema: ${expected.id}`);
    else if (pinned.version !== expected.version || pinned.sha256 !== expected.sha256) {
      errors.push(`Consumer pin differs for schema: ${expected.id}`);
    }
  }
  return errors;
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  // GT-578: `validateManifest` pushes an error for an empty `schemas`, but the
  // consumer path and the whole hash comparison iterate `manifest.schemas || []`.
  // A manifest that parses with the key renamed would produce zero comparisons
  // and one generic error; the denominator makes the coverage explicit instead.
  assertScanned((manifest.schemas || []).length, {
    what: 'declared contract schemas',
    where: 'src/rulesets/contracts/evolith-machine-contracts.json#schemas',
  });
  const errors = validateManifest(manifest);
  const consumerFlag = process.argv.indexOf('--consumer');
  if (consumerFlag >= 0) {
    const consumerPath = path.resolve(process.argv[consumerFlag + 1] || '');
    if (!fs.existsSync(consumerPath)) errors.push(`Consumer manifest does not resolve: ${consumerPath}`);
    else errors.push(...validateConsumer(JSON.parse(fs.readFileSync(consumerPath, 'utf8')), manifest));
  }
  if (errors.length) {
    console.error(`❌ Contract conformance failed:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(
    `✅ Core producer and declared consumer contracts conform ` +
    `(${(manifest.schemas || []).length} schema(s) hashed and resolved).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) run();

