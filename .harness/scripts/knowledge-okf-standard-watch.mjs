#!/usr/bin/env node
/**
 * knowledge-okf-standard-watch.mjs — Vigía del estándar OKF (habilidad de Winston, @winston).
 *
 * Mantiene al día la proyección OKF (ADR-0105) frente a cambios upstream del estándar.
 * Es la contraparte "network, manual" del guard offline: NUNCA corre en un hook (evita
 * red en cada commit); se ejecuta a demanda y deja un lockfile que el pre-commit lee
 * offline para avisar STALE (regla de oro: avisa, nunca bloquea).
 *
 *   (sin flag)    baja el SPEC.md pineado, compara su hash contra el lock y actualiza checkedAt
 *   --accept      además reconoce el hash upstream como revisado (sha256 + reviewedAt = hoy)
 *   --init        crea el lockfile desde el upstream actual (primera vez)
 *   --json        salida machine-readable (sigue escribiendo el lock)
 *   --help
 *
 * Exit codes (advisory — este script no bloquea nada):
 *   0  al día (o inicializado / aceptado)
 *   10 el estándar cambió upstream y no ha sido reconocido (revisa ADR-0105, luego --accept)
 *   2  no se pudo verificar (red/parse) — el lock NO se toca
 *
 * Patrón espejo de adr-freshness-monitor.mjs (vigilar una fuente y clasificar).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const SPEC_URL =
  'https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/main/okf/SPEC.md';
export const LOCK_REL = 'reference/knowledge/canonical/okf-spec.lock.json';
export const STALE_DAYS = 30;
const ROOT = process.cwd();

// ── Utilidades puras (exportadas para tests) ──────────────────────────────────

/** Hash estable del contenido del spec (normaliza CRLF para evitar diffs espurios). */
export function sha256(text) {
  return createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

export function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.floor((b - a) / 86_400_000);
}

/** Frescura del vigía: ¿hace cuánto que no se baja el upstream? null checkedAt = nunca. */
export function staleness(lock, now, staleDays = STALE_DAYS) {
  const checkedAt = lock?.checkedAt || null;
  const days = checkedAt ? daysBetween(checkedAt, now) : null;
  return { checkedAt, daysSinceChecked: days, stale: days === null || days > staleDays, staleDays };
}

/**
 * Núcleo del vigía (puro: fetch inyectado). Devuelve { status, nextLock, exitCode, ... }.
 * status: 'initialized' | 'ok' | 'changed' | 'error'.
 */
export async function runWatch({ lock, fetchText, url = SPEC_URL, now, accept = false, init = false }) {
  let text;
  try {
    text = await fetchText(url);
  } catch (e) {
    return { status: 'error', message: e.message, exitCode: 2, nextLock: null };
  }
  const upstream = sha256(text);

  if (init || !lock) {
    const nextLock = {
      spec: 'OKF',
      version: lock?.version || '0.1',
      sourceUrl: url,
      sha256: upstream,
      checkedAt: now,
      reviewedAt: now,
      adr: 'ADR-0105',
    };
    return { status: 'initialized', upstream, nextLock, exitCode: 0 };
  }

  const changed = lock.sha256 !== upstream;
  const nextLock = { ...lock, sourceUrl: url, checkedAt: now };
  if (accept) {
    nextLock.sha256 = upstream;
    nextLock.reviewedAt = now;
  }
  return {
    status: changed ? 'changed' : 'ok',
    upstream,
    lockedHash: lock.sha256,
    nextLock,
    // 'changed' sin --accept es advisory (10); aceptado o al día = 0.
    exitCode: changed && !accept ? 10 : 0,
  };
}

// ── Wiring de FS / red / CLI ──────────────────────────────────────────────────

function readLock() {
  const abs = path.join(ROOT, LOCK_REL);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function writeLock(lock) {
  fs.writeFileSync(path.join(ROOT, LOCK_REL), `${JSON.stringify(lock, null, 2)}\n`);
}

async function httpFetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${url}`);
  return res.text();
}

function short(h) {
  return h ? `${h.slice(0, 12)}…` : '(none)';
}

function report(result, lock, now) {
  const s = staleness(result.nextLock || lock, now);
  console.log(`# OKF standard-watch (${SPEC_URL})`);
  console.log(`status:     ${result.status}`);
  if (result.status === 'error') {
    console.error(`error:      ${result.message} — lock intacto, frescura sin cambio.`);
    return;
  }
  console.log(`locked:     ${short(result.lockedHash ?? result.upstream)}`);
  console.log(`upstream:   ${short(result.upstream)}`);
  console.log(`checkedAt:  ${result.nextLock.checkedAt}  reviewedAt: ${result.nextLock.reviewedAt}`);
  console.log(`freshness:  ${s.stale ? 'STALE' : 'fresh'} (${s.daysSinceChecked ?? 'never'} d; umbral ${s.staleDays} d)`);
  if (result.status === 'changed') {
    console.log('');
    console.log('⚠️  El estándar OKF cambió upstream y NO ha sido reconocido.');
    console.log('    Acción de Winston: revisa el SPEC + [ADR-0105], ajusta knowledge-okf-project.mjs');
    console.log('    si hace falta, y confirma con:  node .harness/scripts/knowledge-okf-standard-watch.mjs --accept');
  } else if (result.status === 'initialized') {
    console.log('\n✅ Lockfile inicializado. Commitéalo (es metadato canónico, no derivado).');
  } else {
    console.log('\n✅ La proyección OKF está al día con el estándar.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node .harness/scripts/knowledge-okf-standard-watch.mjs [--init | --accept | --json]');
    return;
  }
  const now = new Date().toISOString().slice(0, 10);
  const lock = readLock();
  const result = await runWatch({
    lock,
    fetchText: httpFetchText,
    now,
    accept: args.includes('--accept'),
    init: args.includes('--init'),
  });

  if (result.status === 'error') {
    if (args.includes('--json')) console.log(JSON.stringify({ status: 'error', message: result.message }));
    else report(result, lock, now);
    process.exit(2);
  }

  writeLock(result.nextLock);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ status: result.status, ...staleness(result.nextLock, now), lock: result.nextLock }, null, 2));
  } else {
    report(result, lock, now);
  }
  process.exit(result.exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
