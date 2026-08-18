#!/usr/bin/env node

/**
 * GT-588, criterion 3 — the rule that makes the ledger load-bearing is RUN, in CI,
 * on the path that blocks a merge.
 *
 * ## What was wrong
 *
 * `audit-transparency.rule.ts` (`AUD-TRANSP-01…04`) and its negative tests existed,
 * and `grep -rn "AUD-TRANSP" src/rulesets .harness .github` returned **0**. No
 * workflow ran `evolith audit verify`; its only caller was the CLI command itself.
 * A rule CI never runs is the ornament this row was opened to replace — a governance
 * check whose failure nobody would ever see is indistinguishable from one that
 * cannot fail.
 *
 * ## What this guard actually asserts
 *
 * Not "the ledger verifies" — this repository has no ledger, which is the gap and is
 * reported below as exactly that. What it asserts is the property whose quiet loss
 * would make every future green meaningless: **each of the four rules can still fire,
 * and fires on the state it was written for.** Four ledgers are built from the real
 * signing stack in `@beyondnet/evolith-core-domain`, each damaged a specific way, and
 * `evolith audit verify` is run over each:
 *
 *   intact chain, anchored out of band   -> 04
 *   blocking FAIL flipped to PASS        -> 02 + 04   (the receipt stops verifying)
 *   entry deleted from the middle        -> 02 + 03 + 04
 *   absent ledger                        -> 01
 *
 * `04` rides along on every case that has a ledger at all, because these fixtures can
 * only be signed with the development key — which is the open half of this row, showing
 * up in its own test data. The deletion case carries BOTH `02` and `03` and that pair is
 * the point: `03` sees the hole in the numbering, `02` sees that the endorsed tree head
 * no longer matches. Either alone would miss half of the attack. The guard asserts the
 * exact set, so a rule that starts firing where it should not is as red as one that stopped.
 *
 * The first case is the one worth reading twice. The chain is cryptographically
 * perfect and the verdict is still FAIL, because the key was minted by the process
 * that signed with it. `AUD-TRANSP-04` is the refusal to let a green `02` be read as
 * non-repudiation, and this guard fails if that refusal ever stops happening.
 *
 * ## What it deliberately does NOT do
 *
 * It does not fail the build over this repository's own missing ledger. Nothing here
 * emits one — `AuditService` has zero production constructions — and turning that
 * into a red build would block every merge on work that is blocked on external key
 * custody. The state is PRINTED on every run, labelled as the open gap, so it cannot
 * be mistaken for a pass. When a recorder is wired to an externally-held key, the
 * repository's own ledger becomes a case in the table above rather than a note.
 *
 * Usage:
 *   node .harness/scripts/ci/69-validate-audit-transparency-gate.mjs
 *   node .harness/scripts/ci/69-validate-audit-transparency-gate.mjs --verbose
 *
 * Exit codes:
 *   0 - every rule fired exactly where it should, and nowhere else
 *   1 - a rule stopped firing (or fired where it should not), or the CLI/dist needed
 *       to ask the question is not built
 */

import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScannedPerSource, ZeroCoverageError } from '../lib/coverage.mjs';

const CLI_ENTRY = 'src/sdk/cli/dist/main.js';
const CORE_DIST = 'src/packages/core-domain/dist';

/** Every case this guard exercises: what it damages, and which rule must notice. */
const CASES = [
  {
    id: 'intact-anchored',
    expect: ['AUD-TRANSP-04'],
    what: 'an intact chain anchored out of band still FAILS on the development identity',
  },
  {
    id: 'tampered-statement',
    // `04` rides along on every case that HAS a ledger, because the fixtures can only
    // be signed with a development key — which is the gap this row is open on.
    expect: ['AUD-TRANSP-02', 'AUD-TRANSP-04'],
    what: 'flipping a blocking FAIL to PASS in the readable decision stops its receipt verifying',
  },
  {
    id: 'entry-deleted',
    // Both, and the pair is the point: `03` sees the hole in the numbering, `02` sees
    // that the endorsed root no longer matches. Either alone would miss half the attack.
    expect: ['AUD-TRANSP-02', 'AUD-TRANSP-03', 'AUD-TRANSP-04'],
    what: 'a deleted middle entry breaks contiguity AND the tree head',
  },
  {
    id: 'absent-ledger',
    expect: ['AUD-TRANSP-01'],
    what: 'no ledger at all is a finding, not a vacuous pass',
  },
];

/** Build a real 5-entry ledger with the shipped signing stack. */
async function buildLedger(coreDist) {
  const load = async (rel) => import(pathToFileURL(join(coreDist, rel)).href);
  const infra = await load('infrastructure/transparency/index.js');
  const { TransparencyRecorderService } = await load('application/services/transparency-recorder.service.js');

  const hasher = new infra.NodeSha256Hasher();
  const issuerKey = infra.createDevelopmentSigningKey({ role: 'issuer' });
  const serviceKey = infra.createDevelopmentSigningKey({ role: 'transparency-service' });

  const entries = [];
  const recorder = new TransparencyRecorderService(
    new infra.Ed25519StatementSigner(issuerKey, hasher),
    new infra.MerkleTransparencyService(serviceKey, hasher),
    { append: async (e) => { entries.push(e); }, readAll: async () => entries },
  );

  for (let i = 0; i < 5; i++) {
    await recorder.record({
      statementId: `decision-${i}`,
      subject: `gate/quality-${i}`,
      eventType: 'gate.evaluated',
      verdict: i === 3 ? 'FAIL' : 'PASS',
      occurredAt: `2026-08-1${i}T10:00:00.000Z`,
      tenantId: 'tenant-a',
      actor: 'ci@evolith',
      payload: { score: 80 + i, blocking: i === 3 },
    });
  }

  const anchors = [
    { keyId: issuerKey.identity.keyId, publicKeySpki: issuerKey.identity.publicKeySpki },
    { keyId: serviceKey.identity.keyId, publicKeySpki: serviceKey.identity.publicKeySpki },
  ];
  return { entries, anchors };
}

/** Damage a ledger the way each case names, and write it out. Returns the file path. */
export function materialiseCase(caseId, entries, dir) {
  const path = join(dir, `${caseId}.jsonl`);
  if (caseId === 'absent-ledger') return join(dir, 'does-not-exist.jsonl');

  const copy = JSON.parse(JSON.stringify(entries));
  if (caseId === 'tampered-statement') {
    // The single most valuable edit an attacker could make: flip the blocking FAIL in
    // the READABLE decision, which is what a human reads and what the COSE bytes are
    // signed over. The signature still verifies against its own payload; the mismatch
    // between the two is what fails.
    copy[3].decision.verdict = 'PASS';
  }
  if (caseId === 'entry-deleted') {
    // Every surviving receipt is still individually valid — this is exactly the
    // attack `03` exists for and `02` cannot see.
    copy.splice(2, 1);
  }
  writeFileSync(path, copy.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  return path;
}

/** Run `evolith audit verify` and return the rule ids it reported. */
function runVerify(root, ledgerPath, anchorsPath) {
  const args = [CLI_ENTRY, 'audit', 'verify', '--ledger', ledgerPath, '--format', 'json'];
  if (anchorsPath) args.push('--trust-anchors', anchorsPath);

  const proc = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let parsed;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    throw new Error(`audit verify emitted no JSON (exit ${proc.status}): ${String(proc.stdout).slice(-300)}`);
  }
  // On a FAILING verdict the payload rides in `error.details` — see the GT-588 note in
  // `audit.command.ts`. Reading only `data` here would have made this guard blind on
  // every case that finds something, which is every case worth having.
  const payload = parsed.data ?? parsed.error?.details ?? {};
  const violations = payload.violations ?? [];
  return {
    ruleIds: [...new Set(violations.map((v) => v.ruleId))].sort(),
    entryCount: payload.entryCount ?? 0,
    cryptographicallyIntact: payload.cryptographicallyIntact ?? false,
    exitCode: proc.status,
  };
}

function preflight(root) {
  const missing = [];
  if (!existsSync(resolve(root, CLI_ENTRY))) missing.push(`${CLI_ENTRY} (npm run build --workspace src/sdk/cli)`);
  if (!existsSync(resolve(root, CORE_DIST, 'infrastructure/transparency/index.js'))) {
    missing.push(`${CORE_DIST} (npm run build --workspace @beyondnet/evolith-core-domain)`);
  }
  return missing;
}

async function main() {
  const verbose = process.argv.includes('--verbose');
  const root = REPO_ROOT;

  console.log('🔏 Audit transparency gate — the four rules are RUN, not merely declared (GT-588)');

  // Fail closed: a guard that could not ask the question has not answered it.
  const missing = preflight(root);
  if (missing.length > 0) {
    console.error('❌ the transparency rule cannot be exercised, so nothing was checked:');
    for (const m of missing) console.error(`   - missing ${m}`);
    process.exit(1);
  }

  const dir = mkdtempSync(join(tmpdir(), 'gt588-audit-'));
  const findings = [];
  let exercised = 0;

  try {
    const { entries, anchors } = await buildLedger(resolve(root, CORE_DIST));
    const anchorsPath = join(dir, 'anchors.json');
    writeFileSync(anchorsPath, JSON.stringify(anchors, null, 2), 'utf8');

    for (const testCase of CASES) {
      const ledgerPath = materialiseCase(testCase.id, entries, dir);
      const result = runVerify(root, ledgerPath, anchorsPath);
      exercised += 1;

      const got = result.ruleIds;
      const missingIds = testCase.expect.filter((id) => !got.includes(id));
      // An unexpected id is reported too: a rule firing where it should not is the
      // same class of defect as one that stopped firing.
      const unexpected = got.filter((id) => !testCase.expect.includes(id));

      if (missingIds.length > 0) {
        findings.push(`${testCase.id}: expected ${missingIds.join(', ')} and got ${got.join(', ') || '(nothing)'} — ${testCase.what}`);
      }
      if (unexpected.length > 0) {
        findings.push(`${testCase.id}: unexpected ${unexpected.join(', ')} (expected exactly ${testCase.expect.join(', ')})`);
      }
      if (verbose) {
        console.log(
          `   · ${testCase.id}: ${got.join(', ') || '(clean)'} · entries ${result.entryCount} · ` +
            `cryptographically intact: ${result.cryptographicallyIntact}`,
        );
      }
    }

    // The `04` case restated, because it is the one a reader will doubt: the intact
    // chain verified and still failed.
    const intact = runVerify(root, materialiseCase('intact-anchored', entries, dir), anchorsPath);
    if (!intact.cryptographicallyIntact) {
      findings.push('intact-anchored: the chain did not verify cryptographically — the fixture, not the rule, is broken');
    }

    try {
      assertScannedPerSource(
        { 'damaged ledgers exercised': exercised, 'ledger entries signed': entries.length },
        { what: 'transparency gate inputs' },
      );
    } catch (err) {
      if (err instanceof ZeroCoverageError) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
      }
      throw err;
    }

    console.log(`   ${exercised} damaged ledger(s) exercised over ${entries.length} signed entries; every AUD-TRANSP rule was executed.`);

    // This repository's OWN state, printed and never used as a pass.
    const own = runVerify(root, resolve(root, 'logs', 'transparency.jsonl'), undefined);
    console.log(
      `   this repository's ledger: ${own.entryCount} entry(ies), reporting ${own.ruleIds.join(', ') || '(nothing)'}. ` +
        'THIS IS NOT A PASS — it is the open half of GT-588: nothing in production emits a ledger,',
    );
    console.log(
      '   and the only runnable signing key is a development one, so a wired recorder would still be a self-attestation.',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (findings.length > 0) {
    console.error(`❌ ${findings.length} transparency rule(s) no longer behave as written:`);
    for (const f of findings) console.error(`   - ${f}`);
    console.error('   A rule that stopped being able to fail turns every future green into an ornament.');
    process.exit(1);
  }

  console.log('✓ 69-validate-audit-transparency-gate: AUD-TRANSP-01…04 each fired on the state they were written for.');
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('❌ audit transparency gate failed:', err.message);
    process.exit(1);
  });
}

export { CASES };
