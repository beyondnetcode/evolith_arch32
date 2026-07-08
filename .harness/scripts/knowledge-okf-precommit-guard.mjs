#!/usr/bin/env node
/**
 * knowledge-okf-precommit-guard.mjs — Guarda OKF del pre-commit (offline). Corre SIEMPRE
 * (antes del selector de modo CI, incluso en skip), pero paga costo solo cuando importa.
 *
 * Modelo PUBLICADO (ADR-0105 opción B): el bundle OKF vive commiteado en
 * reference/knowledge/okf/. Las precauciones cambian de "no lo commitees" a "no dejes que
 * el bundle publicado mienta":
 *   1. Si stageas cambios del corpus (canonical/ o knowledge.index.yaml), corre --verify.
 *      Si el bundle publicado quedó desincronizado -> BLOQUEA (regenera y re-stagea).
 *   2. AVISA (nunca bloquea) si el vigía del estándar OKF no corre hace > STALE_DAYS.
 *
 * Costo: si no tocaste el corpus, el guard es ~ms (sin regenerar). Fail-open: cualquier
 * error inesperado NO bloquea el commit; solo el drift de sincronía devuelve exit 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { staleness, LOCK_REL } from './knowledge-okf-standard-watch.mjs';

const ROOT = process.cwd();
const CANONICAL_PREFIX = 'reference/knowledge/canonical/';
const INDEX_PATH = 'reference/knowledge/knowledge.index.yaml';

// ── Puras (exportadas para tests) ─────────────────────────────────────────────

/** ¿El archivo es corpus autoral que afecta la proyección? (excluye el lockfile .json) */
export function isSourcePath(p) {
  if (p === INDEX_PATH) return true;
  return p.startsWith(CANONICAL_PREFIX) && (p.endsWith('.yaml') || p.endsWith('.md'));
}

export function sourceStaged(files) {
  return files.filter(isSourcePath);
}

// ── Wiring ────────────────────────────────────────────────────────────────────

function stagedFiles() {
  const r = spawnSync('git', ['diff', '--cached', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').split('\n').filter(Boolean);
}

function main() {
  try {
    // 1) Si cambió el corpus, el bundle publicado debe estar al día.
    if (sourceStaged(stagedFiles()).length) {
      const r = spawnSync('node', ['.harness/scripts/knowledge-okf-project.mjs', '--verify'], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      if (r.status !== 0) {
        console.error('❌ [OKF] Cambiaste el corpus pero el bundle publicado no está al día (ADR-0105).');
        process.exit(1);
      }
    }

    // 2) Nudge no bloqueante: ¿el vigía del estándar está fresco?
    const abs = path.join(ROOT, LOCK_REL);
    const now = new Date().toISOString().slice(0, 10);
    if (!fs.existsSync(abs)) {
      console.log('ℹ️  [OKF] Sin lockfile del estándar. Inicialízalo: knowledge-okf-standard-watch.mjs --init');
    } else {
      const s = staleness(JSON.parse(fs.readFileSync(abs, 'utf8')), now);
      if (s.stale) {
        console.log(
          `⚠️  [OKF] Vigía del estándar STALE (${s.daysSinceChecked ?? 'nunca'} d > ${s.staleDays} d). ` +
            'Corre: node .harness/scripts/knowledge-okf-standard-watch.mjs',
        );
      }
    }
    process.exit(0);
  } catch (e) {
    // Fail-open: un bug del guard no debe romper commits.
    console.log(`ℹ️  [OKF] guard omitido (${e.message}).`);
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
