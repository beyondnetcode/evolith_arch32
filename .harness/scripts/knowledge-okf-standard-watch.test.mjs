import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256, daysBetween, staleness, runWatch, STALE_DAYS } from './knowledge-okf-standard-watch.mjs';

const SPEC = '# OKF v0.1\n\nrequired: type\n';
const fetchOk = async () => SPEC;
const fetchChanged = async () => SPEC + '\n## New section\n';
const fetchFail = async () => {
  throw new Error('HTTP 503');
};

test('sha256 es estable y normaliza CRLF', () => {
  assert.equal(sha256(SPEC), sha256(SPEC.replace(/\n/g, '\r\n')));
  assert.notEqual(sha256(SPEC), sha256(SPEC + 'x'));
});

test('daysBetween cuenta días de calendario', () => {
  assert.equal(daysBetween('2026-07-01', '2026-07-31'), 30);
  assert.equal(daysBetween('2026-07-07', '2026-07-07'), 0);
});

test('staleness marca STALE si nunca se chequeó o pasó el umbral', () => {
  assert.equal(staleness(null, '2026-07-07').stale, true);
  assert.equal(staleness({ checkedAt: '2026-07-07' }, '2026-07-07').stale, false);
  assert.equal(staleness({ checkedAt: '2026-05-01' }, '2026-07-07').stale, true);
  assert.equal(staleness({ checkedAt: '2026-07-07' }, '2026-07-07').staleDays, STALE_DAYS);
});

test('runWatch --init crea el lock desde el upstream', async () => {
  const r = await runWatch({ lock: null, fetchText: fetchOk, now: '2026-07-07', init: true });
  assert.equal(r.status, 'initialized');
  assert.equal(r.exitCode, 0);
  assert.equal(r.nextLock.sha256, sha256(SPEC));
  assert.equal(r.nextLock.checkedAt, '2026-07-07');
  assert.equal(r.nextLock.reviewedAt, '2026-07-07');
  assert.equal(r.nextLock.adr, 'ADR-0105');
});

test('runWatch "al día" actualiza checkedAt pero no reviewedAt', async () => {
  const lock = { spec: 'OKF', version: '0.1', sha256: sha256(SPEC), checkedAt: '2026-06-01', reviewedAt: '2026-06-01' };
  const r = await runWatch({ lock, fetchText: fetchOk, now: '2026-07-07' });
  assert.equal(r.status, 'ok');
  assert.equal(r.exitCode, 0);
  assert.equal(r.nextLock.checkedAt, '2026-07-07'); // el chequeo refresca la frescura
  assert.equal(r.nextLock.reviewedAt, '2026-06-01'); // pero no re-revisa
  assert.equal(r.nextLock.sha256, lock.sha256);
});

test('runWatch detecta cambio upstream como advisory (exit 10), sin tocar sha256', async () => {
  const lock = { sha256: sha256(SPEC), checkedAt: '2026-06-01', reviewedAt: '2026-06-01' };
  const r = await runWatch({ lock, fetchText: fetchChanged, now: '2026-07-07' });
  assert.equal(r.status, 'changed');
  assert.equal(r.exitCode, 10);
  assert.equal(r.nextLock.sha256, lock.sha256); // NO se acepta solo por detectar
  assert.equal(r.nextLock.checkedAt, '2026-07-07');
});

test('runWatch --accept reconoce el nuevo hash y baja a exit 0', async () => {
  const lock = { sha256: sha256(SPEC), checkedAt: '2026-06-01', reviewedAt: '2026-06-01' };
  const r = await runWatch({ lock, fetchText: fetchChanged, now: '2026-07-07', accept: true });
  assert.equal(r.status, 'changed');
  assert.equal(r.exitCode, 0); // aceptado
  assert.equal(r.nextLock.sha256, sha256(SPEC + '\n## New section\n'));
  assert.equal(r.nextLock.reviewedAt, '2026-07-07');
  // `accepted` distingue "el upstream cambió" de "esta corrida lo reconoció":
  // sin él, --accept imprimía el aviso de "NO ha sido reconocido" tras reconocerlo.
  assert.equal(r.accepted, true);
});

test('runWatch sin --accept deja accepted=false sobre un cambio upstream', async () => {
  const lock = { sha256: sha256(SPEC), checkedAt: '2026-06-01', reviewedAt: '2026-06-01' };
  const r = await runWatch({ lock, fetchText: fetchChanged, now: '2026-07-07' });
  assert.equal(r.status, 'changed');
  assert.equal(r.accepted, false);
  assert.equal(r.exitCode, 10);
  assert.equal(r.nextLock.sha256, sha256(SPEC)); // el hash NO se mueve sin reconocer
});

test('runWatch falla cerrado en error de red sin tocar el lock', async () => {
  const lock = { sha256: 'abc', checkedAt: '2026-06-01' };
  const r = await runWatch({ lock, fetchText: fetchFail, now: '2026-07-07' });
  assert.equal(r.status, 'error');
  assert.equal(r.exitCode, 2);
  assert.equal(r.nextLock, null); // lock intacto
});
