/**
 * GT-608 · criteria 3 and 4 — the HITL seam, RUN.
 *
 * WHY THIS FILE IS NOT A UNIT TEST
 *
 * The row this closes does not record a missing implementation. Both halves were
 * written: `TrackerApprovalAdapter` + `TrackerApprovalHttpClient` here, and
 * `RuntimeApprovalEndpoints` in `evolith_tracker`. What was missing is that they
 * had never spoken. During the assessment two independent readers of the two
 * halves disagreed about whether the OPPOSITE endpoint existed at all — which is
 * exactly what an unexercised seam looks like from the inside. A test with a
 * stubbed `TrackerApprovalClient` would reproduce that defect precisely: it would
 * assert what this repository BELIEVES the Tracker does. So every hop below is a
 * real HTTP request:
 *
 *   test ──HTTP──▶ agent-runtime-api ──HTTP──▶ Tracker ──▶ PostgreSQL
 *        ◀──HTTP── /metrics                  ▲
 *   test ──HTTP── (the human resolving) ─────┘
 *
 * The Nest app is the REAL `AppModule` on a real port; the runtime inside it is
 * built by the REAL `createRuntimeFromEnv`, so the wiring under test is the wiring
 * that ships, not a fixture assembled here.
 *
 * WHAT MAKES IT RED
 *
 * Before the `harnessRoot` line in `runtime.factory.ts`, `createRuntimeFromEnv`
 * seeded the hardcoded 7-skill table and never read the manifest. `intent:
 * self_improving_loop` resolved to nothing, step 4 of the pipeline never ran, the
 * Tracker was never called and `evolith_hitl_approvals_total` stayed structurally
 * zero — the exact shape of the gap.
 *
 * HOW TO RUN IT
 *
 * Cross-repo, so it is env-gated and SKIPS (never silently passes) without a live
 * Tracker. `.harness/scripts/ci` does not run it; nothing in CI provisions a
 * Tracker + PostgreSQL yet. The CI-runnable guard on the wiring this depends on
 * lives in `runtime.factory.spec.ts` ("skill catalogue is derived from the
 * mounted manifest").
 *
 * 1. Start the Tracker (`evolith_tracker`) against its PostgreSQL, configured
 *    with a machine key, a designated approver authority, and a symmetric signing
 *    key for the human channel (ADR T-053 interim). Every value below is
 *    LOCAL-ONLY throwaway configuration:
 *
 *      ASPNETCORE_ENVIRONMENT=Development
 *      CoreMachine__Keys__0__TenantId=<tenant guid>
 *      CoreMachine__Keys__0__Key=<machine key, ≥32 chars>
 *      RuntimeApproval__Policies__0__TenantId=<same tenant guid>
 *      RuntimeApproval__Policies__0__ApproverAuthorities__0=tracker-admin
 *      Authentication__SigningKey=<hs256 secret>
 *      Authentication__Issuer=evolith-gt608
 *
 *    The dev-bypass scheme cannot drive this test: the Tracker binds
 *    `/runtime-approvals` to the CoreMachine scheme BY NAME precisely so the
 *    bypass cannot reach the gate, and granting additionally requires a
 *    designated authority the bypass principal does not carry.
 *
 * 2. Run this suite with the matching `GT608_*` variables (below).
 */

import { createHmac, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/** Tracker BFF base URL INCLUDING the version prefix, e.g. http://127.0.0.1:5100/api/v1 */
const TRACKER_BASE_URL = process.env.GT608_TRACKER_BASE_URL;
/** CoreMachine key the Tracker binds to a tenant (`CoreMachine:Keys:0:Key`). */
const TRACKER_MACHINE_KEY = process.env.GT608_TRACKER_MACHINE_KEY;
/** HS256 secret the Tracker validates human tokens with (`Authentication:SigningKey`). */
const TRACKER_JWT_SECRET = process.env.GT608_TRACKER_JWT_SECRET;
/** Tenant the machine key is bound to — the human must be the SAME tenant. */
const TRACKER_TENANT_ID = process.env.GT608_TRACKER_TENANT_ID;
const TRACKER_JWT_ISSUER = process.env.GT608_TRACKER_JWT_ISSUER ?? 'evolith-gt608';
const TRACKER_JWT_AUDIENCE = process.env.GT608_TRACKER_JWT_AUDIENCE ?? 'evolith-tracker';
/** Role the Tracker's `RuntimeApproval:Policies:*:ApproverAuthorities` designates. */
const APPROVER_ROLE = process.env.GT608_TRACKER_APPROVER_ROLE ?? 'tracker-admin';

const LIVE = Boolean(
  TRACKER_BASE_URL && TRACKER_MACHINE_KEY && TRACKER_JWT_SECRET && TRACKER_TENANT_ID,
);

/** The capability under test: declared `requiresApproval: true` in `.harness/manifest.yaml`. */
const GATED_CAPABILITY = 'self-improving-loop';
const GATED_INTENT = 'self_improving_loop';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const RUNTIME_API_KEY = 'gt608-runtime-integration-key';
/** Identity of the human approver. The Tracker names the approver; we never send it. */
const APPROVER_SUBJECT = '9f3c1a44-1111-4c22-9a55-777788889999';

// ─────────────────────────────────────────────────────────────────────────────
// Tracker wire helpers — the HUMAN channel and the read side of the ledger.
// The Core deliberately owns no resolve path (a second origin of a grant would
// stop the human gate from being one), so the test plays the human itself.
// ─────────────────────────────────────────────────────────────────────────────

function humanToken(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({
    iss: TRACKER_JWT_ISSUER,
    aud: TRACKER_JWT_AUDIENCE,
    tid: TRACKER_TENANT_ID,
    tenant_id: TRACKER_TENANT_ID,
    sub: APPROVER_SUBJECT,
    name: 'alice@evolith.dev',
    roles: APPROVER_ROLE,
    iat: now,
    nbf: now,
    exp: now + 600,
  });
  const sig = createHmac('sha256', TRACKER_JWT_SECRET!)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${sig}`;
}

interface TrackerApproval {
  status: string;
  approver: string | null;
  reason: string | null;
  approvalId: string;
}

/**
 * Read the ledger entry the RUNTIME opened, by re-posting its correlation id on
 * the machine channel. The Tracker is idempotent by `correlationId`, so this
 * returns the existing record rather than opening a second one — the same
 * property that makes a Core retry safe.
 */
async function readLedgerEntry(correlationId: string): Promise<TrackerApproval> {
  const res = await fetch(`${TRACKER_BASE_URL}/runtime-approvals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': TRACKER_MACHINE_KEY! },
    body: JSON.stringify({ skillId: GATED_CAPABILITY, intent: GATED_INTENT, correlationId }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as TrackerApproval;
}

/** A HUMAN decides, over the Tracker's human-only `/resolve` channel. */
async function humanResolves(
  approvalId: string,
  status: 'approved' | 'rejected',
  reason: string,
): Promise<TrackerApproval> {
  const res = await fetch(`${TRACKER_BASE_URL}/runtime-approvals/${approvalId}/resolve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken()}` },
    body: JSON.stringify({ status, reason }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as TrackerApproval;
}

// ─────────────────────────────────────────────────────────────────────────────

interface RuntimeResult {
  status: string;
  summary: string;
  trace: { approvedBy?: string; steps: string[]; capability?: string };
}

(LIVE ? describe : describe.skip)(
  'HITL approval across the Runtime↔Tracker seam, over real HTTP (GT-608)',
  () => {
    let app: INestApplication;
    let baseUrl: string;
    const savedEnv = { ...process.env };

    beforeAll(async () => {
      // The runtime is built from the environment by the real factory, so the
      // environment IS the wiring under test.
      process.env.AGENT_RUNTIME_PROFILE = 'dev';
      process.env.AGENT_RUNTIME_HARNESS_ROOT = resolve(REPO_ROOT, '.harness');
      process.env.AGENT_RUNTIME_WORKSPACE_ROOT = REPO_ROOT;
      process.env.AGENT_RUNTIME_POLICY_MODE = 'stub';
      process.env.AGENT_RUNTIME_APPROVAL_TRACKER_URL = TRACKER_BASE_URL;
      process.env.AGENT_RUNTIME_APPROVAL_TRACKER_KEY = TRACKER_MACHINE_KEY;
      process.env.AGENT_RUNTIME_API_KEY = RUNTIME_API_KEY;

      // Imported lazily so the env above is in place when the provider factory runs.
      // Booted through NestFactory — the same path `main.ts` takes — rather than a
      // testing module: the point of this file is that the shipping composition is
      // what runs.
      const { AppModule } = await import('../app.module');
      app = await NestFactory.create(AppModule, { logger: false });
      await app.listen(0);
      baseUrl = await app.getUrl();
    }, 60_000);

    afterAll(async () => {
      await app?.close();
      process.env = savedEnv;
    });

    /** POST the governed request to the runtime's own HTTP surface. */
    async function submitToRuntime(correlationId: string): Promise<RuntimeResult> {
      const res = await fetch(`${baseUrl}/v1/agent/handle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': RUNTIME_API_KEY },
        body: JSON.stringify({
          tenant: 'tenant_demo',
          product: 'evolith_core',
          initiative: 'init_hitl',
          intent: GATED_INTENT,
          tool: GATED_CAPABILITY,
          correlation_id: correlationId,
          parameters: { task: 'gt608 seam exercise', agent: '@winston' },
        }),
      });
      expect(res.status).toBe(201);
      return (await res.json()) as RuntimeResult;
    }

    /** Scrape the real `/metrics` and read one counter series. */
    async function counter(labelDecision: string): Promise<number> {
      const res = await fetch(`${baseUrl}/metrics`, {
        headers: { 'x-api-key': RUNTIME_API_KEY },
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      const line = body
        .split('\n')
        .find((l) => l.startsWith(`evolith_hitl_approvals_total{decision="${labelDecision}"`));
      return line ? Number(line.trim().split(/\s+/).pop()) : 0;
    }

    it('the DEPLOYED catalogue honours the manifest — the capability is routable and gated', async () => {
      // Precondition, asserted rather than assumed: if the service booted on the
      // hardcoded table this fails here, and every assertion below would be vacuous.
      const res = await fetch(`${baseUrl}/v1/agent/skills`, {
        headers: { 'x-api-key': RUNTIME_API_KEY },
      });
      expect(res.status).toBe(200);
      const catalogue = (await res.json()) as {
        skills: { id: string; requiresApproval?: boolean }[];
      };
      const gated = catalogue.skills.find((s) => s.id === GATED_CAPABILITY);
      expect(gated).toBeDefined();
      expect(gated!.requiresApproval).toBe(true);
    });

    it('pending → approved → executed → audited', async () => {
      const correlationId = `gt608-approve-${randomUUID()}`;
      const before = await counter('approved');

      // 1. PENDING — the runtime asks the live Tracker, which opens a ledger entry
      //    and answers `pending`. Not granted ⇒ nothing executes. Fail-closed.
      const first = await submitToRuntime(correlationId);
      expect(first.status).toBe('blocked');
      expect(first.summary).toMatch(/requires human approval/i);
      expect(first.trace.approvedBy).toBeUndefined();
      expect(first.trace.steps).toContain('approval-denied');
      expect(first.trace.steps).not.toContain('harness-execute');

      // 2. The entry exists in the TRACKER's ledger — proof the request crossed the
      //    repository boundary and was persisted there, not here.
      const opened = await readLedgerEntry(correlationId);
      expect(opened.status).toBe('pending');
      expect(opened.approver).toBeNull();

      // 3. APPROVED — by a human, on the human-only channel, in the other repo.
      const granted = await humanResolves(opened.approvalId, 'approved', 'gt608 seam exercise');
      expect(granted.status).toBe('approved');
      expect(granted.approver).toBe(APPROVER_SUBJECT);

      // 4. EXECUTED — the same governed request now runs the real capability.
      const second = await submitToRuntime(correlationId);
      expect(second.status).toBe('passed');
      expect(second.trace.steps).toContain('harness-execute');

      // 5. AUDITED — the approver on the runtime's trace is the one the TRACKER
      //    named. The Core never fills this in, so it can only have come across
      //    the wire; it is also the exact field the HITL counter reads.
      expect(second.trace.approvedBy).toBe(APPROVER_SUBJECT);
      const persisted = await readLedgerEntry(correlationId);
      expect(persisted.status).toBe('approved');
      expect(persisted.approver).toBe(APPROVER_SUBJECT);

      // 6. Criterion 4 — the counter moved because a run happened, not because a
      //    test incremented it.
      expect(await counter('approved')).toBe(before + 1);
    }, 60_000);

    it('pending → REJECTED → NOT executed (an approval that cannot refuse is decoration)', async () => {
      const correlationId = `gt608-reject-${randomUUID()}`;
      const before = await counter('approved');

      const first = await submitToRuntime(correlationId);
      expect(first.status).toBe('blocked');

      const opened = await readLedgerEntry(correlationId);
      const refused = await humanResolves(opened.approvalId, 'rejected', 'not this time');
      expect(refused.status).toBe('rejected');

      const second = await submitToRuntime(correlationId);
      expect(second.status).toBe('blocked');
      expect(second.trace.steps).toContain('approval-denied');
      expect(second.trace.steps).not.toContain('harness-execute');
      expect(second.trace.approvedBy).toBeUndefined();

      // A refusal must not move the approved series — conflating the two would
      // make the HITL signal report grants that never happened.
      expect(await counter('approved')).toBe(before);
    }, 60_000);
  },
);

// Visible in every run, including CI, so a skip is never mistaken for a pass.
if (!LIVE) {
  // eslint-disable-next-line no-console
  console.warn(
    '[GT-608] HITL Runtime↔Tracker integration SKIPPED: set GT608_TRACKER_BASE_URL, ' +
      'GT608_TRACKER_MACHINE_KEY, GT608_TRACKER_JWT_SECRET and GT608_TRACKER_TENANT_ID ' +
      'to run it against a live Tracker.',
  );
}
