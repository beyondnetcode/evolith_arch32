// GT-343 stage 5 — namespace anti-collision guard.
// Locks the phase/topology vocabulary unification so it cannot regress:
//   1. No canonical SDLC phase id may use the deprecated F# namespace.
//   2. SDLC phase ids and topology ids must be disjoint sets.
//   3. No topology manifest may use the legacy `progressiveAxis.phase` key
//      (it was renamed to `maturityLevel` — phase is an SDLC concept).
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Canonical SDLC phase ids — mirrors GATE_PHASES /
// packages/core-domain/src/domain/sdlc/phase-id.ts (kept in sync by this guard).
const SDLC_PHASE_IDS = ['discovery', 'design', 'construction', 'qa', 'release'];

const errors = [];

// (1) SDLC phase ids must not reuse the F# (architecture maturity) namespace.
for (const id of SDLC_PHASE_IDS) {
  if (/^f[1-5]$/i.test(id)) errors.push(`SDLC phase id '${id}' reuses the deprecated F# namespace`);
}

// Collect topology ids + check manifests for the legacy key.
const manifestRoots = [
  path.join(root, 'reference', 'architecture', 'topologies'),
  path.join(root, 'rulesets', 'topologies'),
];
const topologyIds = new Set();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'topology.manifest.json') {
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch (e) {
        errors.push(`${path.relative(root, full)}: invalid JSON (${e.message})`);
        continue;
      }
      if (manifest.metadata?.id) topologyIds.add(manifest.metadata.id);
      const axis = manifest.spec?.compatibility?.progressiveAxis;
      if (axis && Object.prototype.hasOwnProperty.call(axis, 'phase')) {
        errors.push(`${path.relative(root, full)}: uses legacy 'progressiveAxis.phase' — rename to 'maturityLevel' (GT-343)`);
      }
    }
  }
}
manifestRoots.forEach(walk);

// (2) topology ids and SDLC phase ids must be disjoint.
for (const id of topologyIds) {
  if (SDLC_PHASE_IDS.includes(id)) errors.push(`topology id '${id}' collides with an SDLC phase id`);
}

if (errors.length > 0) {
  console.error('Phase/topology namespace guard failed:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log(
  `Phase/topology namespace guard OK: ${SDLC_PHASE_IDS.length} SDLC phase ids disjoint from ${topologyIds.size} topology ids; no legacy progressiveAxis.phase.`,
);
