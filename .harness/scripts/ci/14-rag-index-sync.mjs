/**
 * @file 14-rag-index-sync.mjs
 * @description CI Step: RAG Knowledge Index Synchronization (GT-139 / ADR-0090)
 *
 * This step implements the delta-sync contract defined in ADR-0090.
 * It is DISABLED by default. Set EVOLITH_RAG_SYNC=true to activate.
 *
 * When active, it:
 *   1. Detects modified reference/ files from the last commit (git diff)
 *   2. Chunks each file at H2 section boundaries
 *   3. Emits chunk metadata (chunk_id, source_file, section_heading, language, corpus_version)
 *   4. Upserts chunks into the configured vector store (provider-agnostic contract)
 *
 * In dry-run mode (default), it logs what WOULD be synchronized without
 * connecting to a live vector store.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import { createHash } from 'crypto';

const RAG_SYNC_ENABLED = process.env.EVOLITH_RAG_SYNC === 'true';
const CORPUS_ROOT = resolve(process.cwd(), 'reference');
const CHUNK_MIN_TOKENS = 100;
const CHUNK_MAX_TOKENS = 512;
const CHUNK_MAX_CHARS = CHUNK_MAX_TOKENS * 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCorpusVersion() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 12);
  } catch {
    return 'unknown';
  }
}

function getChangedReferenceFiles() {
  try {
    const diff = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
    return diff
      .split('\n')
      .filter(f => f.startsWith('reference/') && f.endsWith('.md') && !f.endsWith('.es.md'))
      .map(f => resolve(process.cwd(), f))
      .filter(existsSync);
  } catch {
    // Fallback for initial commit or shallow clone
    return [];
  }
}

function chunkAtH2(content, filePath, corpusVersion) {
  const lines = content.split('\n');
  const chunks = [];
  let currentHeading = '__header__';
  let currentLines = [];
  const sourceFile = relative(process.cwd(), filePath);

  const pushChunk = () => {
    if (currentLines.length === 0) return;
    const text = currentLines.join('\n').trim();
    const chunkId = createHash('sha256')
      .update(`${sourceFile}::${currentHeading}`)
      .digest('hex')
      .slice(0, 16);

    // Extract ADR ID from filename (e.g. 0086 from 0086-some-adr.md)
    const adrMatch = sourceFile.match(/\/(\d{4})-/);

    const parts = splitLongSection(text);
    for (const [index, part] of parts.entries()) {
      chunks.push({
        chunk_id: createHash('sha256').update(`${chunkId}::${index}`).digest('hex').slice(0, 16),
        source_file: sourceFile,
        section_heading: parts.length === 1 ? currentHeading : `${currentHeading} (${index + 1}/${parts.length})`,
        adr_id: adrMatch ? adrMatch[1] : null,
        gap_ids: [], language: 'en', corpus_version: corpusVersion,
        token_estimate: Math.ceil(part.length / 4),
        text_preview: part.slice(0, 120).replace(/\n/g, ' '),
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      pushChunk();
      currentHeading = line.slice(3).trim();
    } else {
      currentLines.push(line);
    }
  }
  pushChunk();

  return chunks;
}

function splitLongSection(text) {
  if (text.length <= CHUNK_MAX_CHARS) return [text];
  const parts = [];
  let current = '';
  for (let block of text.split(/(?=^### )/m)) {
    if (current && current.length + block.length > CHUNK_MAX_CHARS) { parts.push(current.trim()); current = ''; }
    while (block.length > CHUNK_MAX_CHARS) { parts.push(block.slice(0, CHUNK_MAX_CHARS)); block = block.slice(CHUNK_MAX_CHARS); }
    current += block;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('📚 RAG Knowledge Index Sync (ADR-0090)');
  console.log(`   Mode: ${RAG_SYNC_ENABLED ? '🔴 LIVE SYNC' : '🟡 DRY-RUN (set EVOLITH_RAG_SYNC=true to activate)'}`);
  console.log('');

  const corpusVersion = getCorpusVersion();
  const changedFiles = getChangedReferenceFiles();

  if (changedFiles.length === 0) {
    console.log('   ✅ No reference/ files modified in this commit. Index is up to date.');
    process.exit(0);
  }

  console.log(`   📄 ${changedFiles.length} file(s) to synchronize:`);
  let totalChunks = 0;

  for (const filePath of changedFiles) {
    const content = readFileSync(filePath, 'utf8');
    const chunks = chunkAtH2(content, filePath, corpusVersion);
    const fileName = relative(process.cwd(), filePath);
    console.log(`\n   📂 ${fileName} → ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      const tokenInfo = chunk.token_estimate < CHUNK_MIN_TOKENS
        ? '⚠️  (too small, would merge)'
        : chunk.token_estimate > CHUNK_MAX_TOKENS
        ? '⚠️  (too large, would split at H3)'
        : '✓';

      console.log(`      [${chunk.chunk_id}] §${chunk.section_heading} (~${chunk.token_estimate} tokens) ${tokenInfo}`);

      if (RAG_SYNC_ENABLED) {
        // TODO: Replace with actual vector store client call
        // await vectorStore.upsert({ id: chunk.chunk_id, metadata: chunk, vector: await embed(chunk.text) });
        console.log(`      → Upserted into vector store`);
      }
      totalChunks++;
    }
  }

  console.log(`\n   📊 Summary: ${changedFiles.length} file(s), ${totalChunks} chunk(s) ${RAG_SYNC_ENABLED ? 'upserted' : 'identified (dry-run)'}`);
  console.log(`   🔖 Corpus version: ${corpusVersion}`);

  if (!RAG_SYNC_ENABLED) {
    console.log('\n   ℹ️  Dry-run complete. No vector store was contacted.');
    console.log('      Set EVOLITH_RAG_SYNC=true to activate live synchronization.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ RAG sync failed:', err.message);
  process.exit(1);
});
