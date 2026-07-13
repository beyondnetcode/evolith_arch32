/**
 * GT-145 — Truthful RAG index synchronization.
 *
 * Deterministic markdown chunking + a provider-neutral sync that really embeds,
 * upserts and deletes through the {@link createRagAdapter} port, emits a
 * machine-readable receipt, and fails closed on any adapter/embedding/
 * persistence error. Changed files re-index (stale chunks pruned — no orphans);
 * deleted files remove their chunks.
 */

import { createHash } from 'node:crypto';

export const RECEIPT_SCHEMA_VERSION = '1.0';
const CHUNK_MAX_CHARS = 512 * 4;

function sha16(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function splitLongSection(text) {
  if (text.length <= CHUNK_MAX_CHARS) return [text];
  const parts = [];
  let current = '';
  for (let block of text.split(/(?=^### )/m)) {
    if (current && current.length + block.length > CHUNK_MAX_CHARS) {
      parts.push(current.trim());
      current = '';
    }
    while (block.length > CHUNK_MAX_CHARS) {
      parts.push(block.slice(0, CHUNK_MAX_CHARS));
      block = block.slice(CHUNK_MAX_CHARS);
    }
    current += block;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Chunk a markdown document at H2 boundaries. Deterministic chunk ids. */
export function chunkMarkdown(content, sourceFile, corpusVersion = 'unknown') {
  const chunks = [];
  let heading = '__header__';
  let buffer = [];
  const adrMatch = sourceFile.match(/\/(\d{4})-/);
  const adrId = adrMatch ? adrMatch[1] : null;

  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (!text) return;
    const base = sha16(`${sourceFile}::${heading}`);
    const parts = splitLongSection(text);
    parts.forEach((part, index) => {
      chunks.push({
        chunk_id: sha16(`${base}::${index}`),
        source_file: sourceFile,
        section_heading: parts.length === 1 ? heading : `${heading} (${index + 1}/${parts.length})`,
        adr_id: adrId,
        language: 'en',
        corpus_version: corpusVersion,
        token_estimate: Math.ceil(part.length / 4),
        text: part,
        text_preview: part.slice(0, 120).replace(/\n/g, ' '),
      });
    });
  };

  for (const line of String(content).split('\n')) {
    if (line.startsWith('## ')) {
      flush();
      heading = line.slice(3).trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return chunks;
}

/** Convenience: just the deterministic chunk ids for a document. */
export function chunkIds(content, sourceFile, corpusVersion) {
  return chunkMarkdown(content, sourceFile, corpusVersion).map((c) => c.chunk_id);
}

function metadataOf(chunk) {
  const { text, ...meta } = chunk; // store metadata + preview, not the full text body
  return meta;
}

/**
 * Synchronize the index through a port adapter.
 *
 * @param {object}   args
 * @param {object}   args.adapter      from createRagAdapter()
 * @param {Array}    [args.changed]    [{ sourceFile, content, priorChunkIds? }]
 * @param {Array}    [args.deleted]    [{ sourceFile, chunkIds }]
 * @param {string}   [args.corpusVersion]
 * @param {number}   [args.batchSize]
 * @returns {Promise<object>} machine-readable receipt
 */
export async function syncIndex({ adapter, changed = [], deleted = [], corpusVersion = 'unknown', batchSize = 32 }) {
  if (!adapter || typeof adapter.embed !== 'function') {
    throw new Error('syncIndex requires a valid RAG adapter');
  }
  // ADR-0090 §3 / ADR-0112 §1 — the embedding model id is part of corpus
  // identity so cache invalidation tracks a model swap (a re-embed). Adapters
  // that expose their effective model id fold it into corpus_version; adapters
  // that do not (e.g. the memory stand-in) leave it unchanged.
  const effectiveCorpusVersion = adapter.embeddingModelId
    ? `${corpusVersion}+${adapter.embeddingModelId}`
    : corpusVersion;
  const receipt = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    corpusVersion: effectiveCorpusVersion,
    provider: adapter.name,
    durable: !!adapter.durable,
    upserted: [],
    deleted: [],
    files: {},
    telemetry: { batches: 0, estTokens: 0, embedCalls: 0 },
  };

  for (const file of changed) {
    const chunks = chunkMarkdown(file.content, file.sourceFile, effectiveCorpusVersion);
    const liveIds = new Set(chunks.map((c) => c.chunk_id));

    // Prune stale chunks that no longer exist in the re-indexed file (no orphans).
    if (Array.isArray(file.priorChunkIds) && file.priorChunkIds.length) {
      const stale = file.priorChunkIds.filter((id) => !liveIds.has(id));
      if (stale.length) {
        await adapter.delete(stale);
        receipt.deleted.push(...stale);
      }
    }

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const vectors = await adapter.embed(batch.map((c) => c.text));
      receipt.telemetry.embedCalls += 1;
      if (!Array.isArray(vectors) || vectors.length !== batch.length) {
        throw new Error('embedding returned an unexpected vector count');
      }
      const records = batch.map((c, j) => ({ id: c.chunk_id, vector: vectors[j], metadata: metadataOf(c) }));
      await adapter.upsert(records);
      receipt.upserted.push(...batch.map((c) => c.chunk_id));
      receipt.telemetry.batches += 1;
      receipt.telemetry.estTokens += batch.reduce((n, c) => n + c.token_estimate, 0);
    }
    receipt.files[file.sourceFile] = chunks.length;
  }

  for (const d of deleted) {
    if (Array.isArray(d.chunkIds) && d.chunkIds.length) {
      await adapter.delete(d.chunkIds);
      receipt.deleted.push(...d.chunkIds);
    }
    receipt.files[d.sourceFile] = 0;
  }

  receipt.counts = {
    upserted: receipt.upserted.length,
    deleted: receipt.deleted.length,
    files: Object.keys(receipt.files).length,
  };
  return receipt;
}
