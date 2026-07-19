import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureOpa } from '../opa-runtime.mjs';

const ROOT = process.cwd();
// GT-KB Fase 0: the sovereign location per ADR-0097 ("candidate entry gate is a
// YAML file in product/research/intake/") and knowledge.index.yaml
// spec.references.knowledgeIntake. The old constant pointed at a directory that
// does not exist, so this gate never saw the real KI/SRC records.
const INTAKE_DIR = 'product/research/intake';
const KI_SCHEMA = 'src/rulesets/schema/knowledge-intake.schema.json';
const SRC_SCHEMA = 'src/rulesets/schema/source-registry.schema.json';
const PROJ_SCHEMA = 'src/rulesets/schema/knowledge-projection.schema.json';
// The corpus lives in two roots and must be read from BOTH: the five advanced
// topologies are canonical under src/rulesets (GT-329), the progressive axis
// stays under reference/. Scanning only one silently halves the accepted-topology
// set, which would reject valid `related_topology` values as unknown.
const MANIFEST_ROOTS = [
  path.join('src', 'rulesets', 'topologies'),
  path.join('reference', 'core', 'architecture', 'topologies'),
];
const MANIFEST_ROOT = MANIFEST_ROOTS.join(' + ');
const OPA_POLICY = 'src/rulesets/opa/knowledge-intake.rego';
const OPA_TEST = 'src/rulesets/opa/knowledge-intake.test.rego';

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

function loadAcceptedTopologyIds(root, errors) {
  const ids = new Set();
  const manifests = MANIFEST_ROOTS.flatMap((rel) =>
    walk(path.join(root, rel), (file) => path.basename(file) === 'topology.manifest.json')
  );
  for (const manifestPath of manifests) {
    const manifest = readJson(manifestPath, errors);
    if (manifest && manifest.metadata?.status === 'accepted') {
      ids.add(manifest.metadata.id);
    }
  }
  if (ids.size === 0) errors.push(`No accepted topology manifests found under ${MANIFEST_ROOT}`);
  return ids;
}

function fixKiFile(filePath, root = ROOT) {
  const intakePath = path.join(root, INTAKE_DIR);
  const fullPath = path.join(intakePath, filePath);
  if (!fs.existsSync(fullPath)) return false;

  let content;
  try { content = yaml.load(fs.readFileSync(fullPath, 'utf8')); }
  catch { return false; }

  let changed = false;
  const now = new Date().toISOString().split('T')[0];

  if (!content.review?.review_freshness) {
    if (!content.review) content.review = {};
    content.review.review_freshness = now;
    changed = true;
  }

  // GT-KB Fase 0 — REMOVED: this block used to auto-fill promoted_at/promoted_by
  // (writing '17-validate-knowledge-intake.mjs' as the promoter) for any
  // non-candidate status. That was a governance defect on three counts:
  //   1. It defeated this script's OWN check (a non-candidate status requires
  //      promoted_at/promoted_by) — the auto-fill ran first, so it never fired.
  //   2. It recorded a CI script as the promotion authority, contradicting
  //      ADR-0097, which reserves 'evaluated' to @winston and 'accepted'/
  //      'executable' to the Architecture Board.
  //   3. It broke dual-engine parity: the Native side silently satisfied what
  //      OPA rule KI-R06 exists to flag.
  // Promotion metadata is now authored by a human and validated, never invented.

  if (changed) {
    const updated = yaml.dump(content, { lineWidth: -1, quotingType: '"' });
    fs.writeFileSync(fullPath, updated, 'utf8');
  }

  return changed;
}

export function validateKnowledgeIntake(root = ROOT) {
  const errors = [];
  const intakePath = path.join(root, INTAKE_DIR);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const kiValidate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, KI_SCHEMA), 'utf8')));
  const srcValidate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, SRC_SCHEMA), 'utf8')));
  const acceptedTopologyIds = loadAcceptedTopologyIds(root, errors);

  // ADR-0115 — both axes live here: KI-* (external work) and KO-* (emergent
  // observation). Before this the glob was KI-only, so a KO record was silently
  // ignored and the gate reported green without ever having looked at it.
  const kiFiles = fs.existsSync(intakePath) ? fs.readdirSync(intakePath).filter((file) => /^(KI|KO)-[A-Z0-9-]+\.ya?ml$/.test(file)).sort() : [];
  const srcFiles = fs.existsSync(intakePath) ? fs.readdirSync(intakePath).filter((file) => /^SRC-[A-Z0-9-]+\.ya?ml$/.test(file)).sort() : [];

  if (!kiFiles.length) errors.push(`${INTAKE_DIR} must contain at least one KI-*.yaml or KO-*.yaml candidate`);

  const knownKiIds = new Set();
  const knownSrcIds = new Set();
  const srcKiLinks = new Map();

  for (const file of kiFiles) {
    const relative = `${INTAKE_DIR}/${file}`;
    let candidate;
    try { candidate = yaml.load(fs.readFileSync(path.join(intakePath, file), 'utf8')); }
    catch (error) { errors.push(`${relative}: invalid YAML (${error.message})`); continue; }
    if (!kiValidate(candidate)) {
      errors.push(`${relative}: ${ajv.errorsText(kiValidate.errors, { separator: '; ' })}`);
      continue;
    }
    if (candidate?.promotion?.status === 'executable' && candidate?.source?.rights_status === 'citation-and-synthesis-only') {
      errors.push(`${relative}: executable promotion cannot retain a citation-and-synthesis-only source as its sole evidence`);
    }
    knownKiIds.add(candidate.knowledge_id);

    const topologies = candidate?.assessment?.topologies || [];
    for (const t of topologies) {
      if (!acceptedTopologyIds.has(t)) {
        errors.push(`${relative}: topology "${t}" is not a known accepted topology ID`);
      }
    }
    const related = candidate?.assessment?.related_topologies || [];
    for (const t of related) {
      if (!acceptedTopologyIds.has(t)) {
        errors.push(`${relative}: related_topology "${t}" is not a known accepted topology ID`);
      }
    }
    if (candidate.source_registry_id) knownSrcIds.add(candidate.source_registry_id);

    const p = candidate.promotion || {};
    const validTransitions = { candidate: ['evaluated', 'retired'], evaluated: ['accepted', 'retired'], accepted: ['executable', 'retired'], executable: ['retired'], retired: [] };
    const prevStatus = candidate._previous_status || 'candidate';
    if (p.status && p.status !== prevStatus) {
      const allowed = validTransitions[prevStatus] || [];
      if (!allowed.includes(p.status)) {
        errors.push(`${relative}: invalid promotion transition ${prevStatus} → ${p.status}`);
      }
    }
    if (p.status !== 'candidate') {
      if (!p.promoted_at) errors.push(`${relative}: non-candidate status requires promoted_at`);
      if (!p.promoted_by) errors.push(`${relative}: non-candidate status requires promoted_by`);
    }
    if ((p.status === 'accepted' || p.status === 'executable') && !p.adr) {
      errors.push(`${relative}: ${p.status} status requires a non-null ADR reference`);
    }
    if (p.status === 'retired' && !p.disposition) {
      errors.push(`${relative}: retired status requires a non-null disposition reason`);
    }
  }

  for (const file of srcFiles) {
    const relative = `${INTAKE_DIR}/${file}`;
    let entry;
    try { entry = yaml.load(fs.readFileSync(path.join(intakePath, file), 'utf8')); }
    catch (error) { errors.push(`${relative}: invalid YAML (${error.message})`); continue; }
    if (!srcValidate(entry)) {
      errors.push(`${relative}: ${ajv.errorsText(srcValidate.errors, { separator: '; ' })}`);
      continue;
    }
    knownSrcIds.add(entry.source_registry_id);
    srcKiLinks.set(entry.source_registry_id, entry.ki_links || []);
  }

  // Only the EXTERNAL axis owes a SRC-* registry entry: that record carries the
  // licensing and retention terms of a third-party work. An emergent KO-*
  // observation has no rights holder, so demanding one would be meaningless —
  // its evidentiary duty is discharged by origin.evidence_ref under KO-R03.
  for (const kiId of knownKiIds) {
    if (!kiId.startsWith('KI-')) continue;
    const srcId = [...knownSrcIds].find((s) => {
      const links = srcKiLinks.get(s) || [];
      return links.includes(kiId);
    });
    if (!srcId) {
      errors.push(`KI-* candidate ${kiId} has no corresponding SRC-* entry linking back to it`);
    }
  }

  for (const [srcId, kiLinks] of srcKiLinks) {
    for (const kiLink of kiLinks) {
      if (!knownKiIds.has(kiLink)) {
        errors.push(`SRC-* entry ${srcId} references unreferenced KI-* candidate ${kiLink}`);
      }
    }
  }

  const projectionPath = path.join(root, INTAKE_DIR, 'approved-projection.json');
  if (fs.existsSync(projectionPath)) {
    const projValidate = ajv.compile(JSON.parse(fs.readFileSync(path.join(root, PROJ_SCHEMA), 'utf8')));
    let projection;
    try { projection = JSON.parse(fs.readFileSync(projectionPath, 'utf8')); }
    catch (error) { errors.push(`${INTAKE_DIR}/approved-projection.json: invalid JSON (${error.message})`); }
    if (projection) {
      if (!projValidate(projection)) {
        errors.push(`${INTAKE_DIR}/approved-projection.json: ${ajv.errorsText(projValidate.errors, { separator: '; ' })}`);
      } else {
        const approvedSet = new Set(projection.approved_knowledge_ids || []);
        const excludedStatuses = new Set(['candidate', 'retired']);
        for (const kiId of approvedSet) {
          const kiFile = kiFiles.find((f) => f.startsWith(kiId));
          if (!kiFile) {
            errors.push(`approved-projection includes ${kiId} but no corresponding KI-* file exists`);
            continue;
          }
          const candidate = yaml.load(fs.readFileSync(path.join(intakePath, kiFile), 'utf8'));
          const status = candidate?.promotion?.status;
          if (excludedStatuses.has(status)) {
            errors.push(`approved-projection includes ${kiId} which has excluded status "${status}"`);
          }
          if (candidate?.source?.rights_status === 'citation-and-synthesis-only') {
            errors.push(`approved-projection includes ${kiId} with rights-restricted source (citation-and-synthesis-only)`);
          }
        }
        const allKiIds = [...knownKiIds];
        for (const kiId of allKiIds) {
          if (!approvedSet.has(kiId)) continue;
          const candidate = yaml.load(fs.readFileSync(path.join(intakePath, kiFiles.find((f) => f.startsWith(kiId))), 'utf8'));
          const status = candidate?.promotion?.status;
          if (status === 'accepted' || status === 'executable') {
            if (!approvedSet.has(kiId)) {
              errors.push(`${kiId} has promotion status "${status}" but is not in approved-projection`);
            }
          }
        }
      }
    }
  }

  return { files: kiFiles, srcFiles, errors };
}

async function run() {
  const fixMode = process.argv.includes('--fix');

  if (fixMode) {
    console.log('🔧 Knowledge Intake Auto-Fix Mode');
    const intakePath = path.join(ROOT, INTAKE_DIR);
    const kiFiles = fs.existsSync(intakePath)
      ? fs.readdirSync(intakePath).filter((f) => /^KI-[A-Z0-9-]+\.ya?ml$/.test(f))
      : [];

    let fixedCount = 0;
    for (const file of kiFiles) {
      if (fixKiFile(file, ROOT)) {
        console.log(`   Fixed: ${INTAKE_DIR}/${file}`);
        fixedCount++;
      }
    }
    if (fixedCount === 0) {
      console.log('   No fixable issues found.');
    } else {
      console.log(`   Fixed ${fixedCount} file(s). Re-validating...`);
    }
  }

  const result = validateKnowledgeIntake();
  const opa = await ensureOpa(ROOT);
  try { execFileSync(opa.binary, ['test', '--format=json', OPA_POLICY, OPA_TEST], { cwd: ROOT, encoding: 'utf8' }); }
  catch (error) { result.errors.push(`OPA policy tests failed: ${error.stderr || error.message}`); }
  if (result.errors.length) {
    console.error(`❌ Knowledge intake validation failed:\n- ${result.errors.join('\n- ')}`);
    process.exit(1);
  }
  const external = result.files.filter((f) => f.startsWith('KI-')).length;
  const emergent = result.files.filter((f) => f.startsWith('KO-')).length;
  console.log(`✅ Knowledge intake validation passed for ${external} external (KI-*) + ${emergent} emergent (KO-*) candidate(s) and ${result.srcFiles.length} SRC registry entr(ies); Native and OPA controls verified.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
