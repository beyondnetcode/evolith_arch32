/**
 * Artifact Registry — tracks deliverables per step with change detection.
 *
 * @module artifact-registry
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const STATE_DIR = resolve(import.meta.dirname, '..', 'state');
const MANIFEST_FILE = resolve(STATE_DIR, 'artifact-manifest.json');

/**
 * Ensure state directory exists.
 */
function ensureStateDir() {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

/**
 * Read the artifact manifest from disk.
 *
 * @returns {Object} Artifact manifest
 */
function readManifest() {
  ensureStateDir();
  if (!existsSync(MANIFEST_FILE)) {
    return { artifacts: {}, instances: {} };
  }
  return JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'));
}

/**
 * Atomically write the artifact manifest to disk.
 *
 * @param {Object} manifest - Artifact manifest
 */
function writeManifestSync(manifest) {
  ensureStateDir();
  const tmpFile = `${MANIFEST_FILE}.tmp.${Date.now()}`;
  writeFileSync(tmpFile, JSON.stringify(manifest, null, 2), 'utf-8');
  renameSync(tmpFile, MANIFEST_FILE);
}

/**
 * Register artifacts produced by a step.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {string} stepId - Step that produced the artifacts
 * @param {Array<string>} artifactPaths - Paths to deliverable files
 * @returns {Object} Registered artifact metadata
 */
export function registerArtifacts(instanceId, stepId, artifactPaths) {
  const manifest = readManifest();

  if (!manifest.instances[instanceId]) {
    manifest.instances[instanceId] = {};
  }

  const registered = [];

  for (const path of artifactPaths) {
    const artifactKey = `${instanceId}:${path}`;
    const metadata = {
      path,
      instanceId,
      stepId,
      registeredAt: new Date().toISOString(),
      hash: computeFileHash(path),
      exists: existsSync(resolve(import.meta.dirname, '..', '..', path)),
    };

    manifest.artifacts[artifactKey] = metadata;
    manifest.instances[instanceId][path] = artifactKey;
    registered.push(metadata);
  }

  writeManifestSync(manifest);
  return registered;
}

/**
 * Validate that expected artifacts exist and haven't changed.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {string} stepId - Step expecting artifacts
 * @param {Array<string>} expectedPaths - Expected artifact paths
 * @returns {Object} Validation result { valid, missing, changed }
 */
export function validateArtifacts(instanceId, stepId, expectedPaths) {
  const manifest = readManifest();
  const result = { valid: true, missing: [], changed: [], details: [] };

  for (const path of expectedPaths) {
    const artifactKey = `${instanceId}:${path}`;
    const artifact = manifest.artifacts[artifactKey];

    const fullPath = resolve(import.meta.dirname, '..', '..', path);
    const fileExists = existsSync(fullPath);

    if (!fileExists) {
      result.missing.push(path);
      result.valid = false;
      result.details.push({ path, status: 'missing' });
      continue;
    }

    if (artifact) {
      const currentHash = computeFileHash(path);
      if (currentHash !== artifact.hash) {
        result.changed.push({ path, oldHash: artifact.hash, newHash: currentHash });
        result.details.push({ path, status: 'changed', oldHash: artifact.hash, newHash: currentHash });
      } else {
        result.details.push({ path, status: 'unchanged' });
      }
    } else {
      result.details.push({ path, status: 'new' });
    }
  }

  return result;
}

/**
 * Get all artifacts for a workflow instance.
 *
 * @param {string} instanceId - Workflow instance ID
 * @returns {Array} List of artifact metadata objects
 */
export function getArtifactsForInstance(instanceId) {
  const manifest = readManifest();
  return Object.values(manifest.artifacts).filter(a => a.instanceId === instanceId);
}

/**
 * Get all artifacts produced by a specific step.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {string} stepId - Step ID
 * @returns {Array} List of artifact metadata objects
 */
export function getArtifactsForStep(instanceId, stepId) {
  const manifest = readManifest();
  return Object.values(manifest.artifacts).filter(
    a => a.instanceId === instanceId && a.stepId === stepId
  );
}

/**
 * Clear artifacts for a workflow instance.
 *
 * @param {string} instanceId - Workflow instance ID
 * @returns {number} Number of artifacts cleared
 */
export function clearArtifacts(instanceId) {
  const manifest = readManifest();
  let count = 0;

  for (const [key, artifact] of Object.entries(manifest.artifacts)) {
    if (artifact.instanceId === instanceId) {
      delete manifest.artifacts[key];
      count++;
    }
  }

  delete manifest.instances[instanceId];
  writeManifestSync(manifest);
  return count;
}

/**
 * Compute a SHA-256 hash of a file's contents.
 *
 * @param {string} relativePath - Path relative to repository root
 * @returns {string} Hex-encoded hash or 'missing'
 */
function computeFileHash(relativePath) {
  const fullPath = resolve(import.meta.dirname, '..', '..', relativePath);
  if (!existsSync(fullPath)) return 'missing';

  const content = readFileSync(fullPath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Get a summary of artifact health across all instances.
 *
 * @returns {Object} Health summary
 */
export function getArtifactHealthSummary() {
  const manifest = readManifest();
  const summary = {
    totalArtifacts: Object.keys(manifest.artifacts).length,
    totalInstances: Object.keys(manifest.instances).length,
    missingArtifacts: 0,
    existingArtifacts: 0,
  };

  for (const artifact of Object.values(manifest.artifacts)) {
    if (artifact.exists) {
      summary.existingArtifacts++;
    } else {
      summary.missingArtifacts++;
    }
  }

  return summary;
}
