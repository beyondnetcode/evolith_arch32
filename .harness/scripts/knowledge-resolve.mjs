#!/usr/bin/env node
/**
 * knowledge-resolve.mjs — M0 resolver/loader for the Evolith Core Knowledge OS.
 *
 * Reads reference/knowledge/knowledge.index.yaml and lets any agent/human:
 *   --list                 list product + packs
 *   --pack <id>            print a pack manifest + its authored body (the "boot expert" bundle)
 *   --freshness            drift/freshness gate: reviewBy (warn/STALE) + oracle checks (fail)
 *
 * This is the LOCAL surface for M0. The hosted REST/MCP surface reuses the existing
 * corpus-resource.handler (src/packages/mcp-server). Read-only; run from repo root.
 *
 * Design invariants (see reference/knowledge/README.md):
 *   - STALE (reviewBy in the past) is a WARNING, never blocks.
 *   - Oracle drift (a referenced file/symbol vanished) BLOCKS with exit 1.
 *   - Authored text is always rehydrated from source files, never from a preview.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const KNOWLEDGE_DIR = 'reference/knowledge';
const INDEX = path.join(KNOWLEDGE_DIR, 'knowledge.index.yaml');

function load(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`missing file: ${rel}`);
  return yaml.load(fs.readFileSync(abs, 'utf8'));
}

function loadIndex() {
  if (!fs.existsSync(path.join(ROOT, INDEX))) {
    console.error(`No knowledge index at ${INDEX}. Run from the repo root.`);
    process.exit(2);
  }
  return load(INDEX);
}

function resolvePack(entry) {
  const manifestRel = path.join(KNOWLEDGE_DIR, entry.manifest);
  return { entry, manifestRel, pack: load(manifestRel) };
}

function cmdList() {
  const idx = loadIndex();
  console.log(`# Knowledge Index: ${idx.metadata.id}@${idx.metadata.version} (${idx.metadata.status})`);
  console.log(`product: ${idx.spec.product}`);
  const packs = idx.spec.packs || [];
  console.log(`packs (${packs.length}):`);
  for (const p of packs) {
    console.log(`  - ${p.id}  [${p.layer}]  dependsOn=${JSON.stringify(p.dependsOn || [])}`);
  }
}

function cmdPack(id) {
  const idx = loadIndex();
  const entry = (idx.spec.packs || []).find((p) => p.id === id);
  if (!entry) { console.error(`pack not found: ${id}`); process.exit(1); }
  const { pack } = resolvePack(entry);
  console.log(`# Pack: ${pack.metadata.id}@${pack.metadata.version} (${pack.metadata.status})`);
  console.log(`boundedContext: ${pack.spec.boundedContext}`);
  console.log(`references: ${JSON.stringify(pack.spec.references || {})}`);
  const authored = pack.spec.authored || {};
  const files = [].concat(authored.domain || [], authored.glossary || [], authored.prompts || []);
  if (files.length === 0) {
    console.log('\n(authored body vacío en M0 — se llena en M1)');
    return;
  }
  for (const f of files) {
    const rel = path.join(KNOWLEDGE_DIR, f);
    console.log(`\n----- ${rel} -----`);
    console.log(fs.readFileSync(path.join(ROOT, rel), 'utf8')); // rehidratar SIEMPRE desde la fuente
  }
}

function cmdFreshness() {
  const idx = loadIndex();
  const today = new Date().toISOString().slice(0, 10);
  let stale = 0, failed = 0;

  const checkReviewBy = (meta, label) => {
    if (meta?.reviewBy && meta.reviewBy < today) {
      console.log(`STALE  ${label}: reviewBy ${meta.reviewBy} < ${today}`);
      stale++;
    }
  };

  const product = load(path.join(KNOWLEDGE_DIR, idx.spec.product));
  checkReviewBy(product.metadata, `product ${product.metadata.id}`);

  for (const entry of idx.spec.packs || []) {
    const { pack } = resolvePack(entry);
    checkReviewBy(pack.metadata, `pack ${pack.metadata.id}`);
    for (const a of pack.spec.oracle?.assertions || []) {
      let ok = true;
      if (a.kind === 'link-check') {
        ok = fs.existsSync(path.join(ROOT, a.target));
        if (!ok) console.log(`FAIL   pack ${pack.metadata.id} ${a.id}: link-check missing ${a.target}`);
      } else if (a.kind === 'symbol-exists') {
        const abs = path.join(ROOT, a.file);
        ok = fs.existsSync(abs) && fs.readFileSync(abs, 'utf8').includes(a.target);
        if (!ok) console.log(`FAIL   pack ${pack.metadata.id} ${a.id}: symbol '${a.target}' not in ${a.file}`);
      }
      if (!ok && a.onDrift === 'fail') failed++;
    }
  }

  console.log(`\nfreshness: ${stale} STALE (warning), ${failed} FAILED (blocking)`);
  process.exit(failed > 0 ? 1 : 0); // regla de oro: STALE nunca bloquea; solo el drift de oráculo
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === '--list') cmdList();
  else if (cmd === '--pack') cmdPack(arg);
  else if (cmd === '--freshness') cmdFreshness();
  else {
    console.log('Usage: node .harness/scripts/knowledge-resolve.mjs [--list | --pack <id> | --freshness]');
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(`error: ${e.message}`);
  process.exit(2);
}
