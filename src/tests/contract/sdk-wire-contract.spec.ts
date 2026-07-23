/**
 * GT-565 — SDK ⇄ wire contract (runtime half).
 *
 * THE DEFECT THIS CLOSES
 * ----------------------
 * `@beyondnet/evolith-sdk` types drifted from the API they claim to describe,
 * and the SDK's own suite could not notice: `sdk.spec.ts` mocks `fetch` to
 * return the shape the SDK *invented*, then asserts on it. A test whose
 * expectation is authored by the thing under test is self-confirming — the SDK
 * could rename every field and stay green.
 *
 * This suite breaks that circularity by sourcing the expectation from two
 * places the SDK does not control:
 *
 *   1. `tsc` over `sdk-type-contract.types.ts` — the SDK's PUBLIC types are
 *      asserted, at compile time, to be identical to the `core-domain`
 *      contracts the producers return. Catches drift on EITHER side, costs
 *      nothing at runtime.
 *
 *   2. A REAL core-api response — the app is booted through the Nest testing
 *      module and its actual HTTP output is validated against `WireCheck`
 *      descriptors whose key set and per-key optionality are TYPE-DERIVED from
 *      the SDK types. The checker therefore cannot drift from the type it
 *      enforces, and the payload it judges is produced by the controller, not
 *      by a mock.
 *
 * WHY BOTH (and why neither alone is sufficient)
 * ----------------------------------------------
 * Layer 1 alone is blind to a controller that changes what it returns without
 * touching the domain type — e.g. `architecture.controller.ts` picking a
 * different branch, or a controller reshaping/omitting fields on the way out.
 * The domain type would still match the SDK type while the wire diverged from
 * both. Only a real response catches that.
 *
 * Layer 2 alone is blind to fields that happen to be absent from the sample
 * response (an empty `violations[]` exercises no element), to optional-vs-
 * required distinctions the wire does not happen to exhibit, and to surfaces
 * this suite does not boot. Only the compiler catches those.
 *
 * Together they satisfy the required property: change a controller's response
 * shape, or change an SDK type, without changing the other, and this suite
 * fails.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';
import { EnvelopeInterceptor } from '../../apps/core-api/src/infrastructure/interceptors/envelope.interceptor';
import { HttpExceptionFilter } from '../../apps/core-api/src/infrastructure/filters/http-exception.filter';
import {
  WIRE_GATE_EVIDENCE,
  WIRE_GATE_VIOLATION,
  WIRE_VALIDATION_RESULT,
  WIRE_VALIDATION_ISSUE,
  type FieldContract,
} from './sdk-type-contract.types';

const execFileAsync = promisify(execFile);

// __dirname is <repo>/src/tests/contract → three levels up is the repo root,
// which is where the canonical gate registry (reference/governance/sdlc/gates/)
// and the rulesets corpus live.
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TYPE_CONTRACT_PROJECT = path.join(__dirname, 'tsconfig.sdk-type-contract.json');
const TYPE_CONTRACT_FILE = 'sdk-type-contract.types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// The wire assertion
// ─────────────────────────────────────────────────────────────────────────────

type AnyWireCheck = Record<string, FieldContract<boolean>>;

/**
 * Assert that `payload` — a real response body — is exactly described by the
 * SDK's declared type, as captured by `contract`.
 *
 * Three independent failure modes, each mapping to a real drift scenario:
 *   • missing   → the SDK declares a field the API does not emit (invented)
 *   • extra     → the API emits a field the SDK does not declare (undeclared)
 *   • mistyped  → both know the field, but its value is not of the declared type
 *
 * Returns a list of human-readable problems rather than throwing, so a single
 * test failure reports every drift at once instead of only the first.
 */
function diffAgainstSdkType(
  payload: Record<string, unknown>,
  contract: AnyWireCheck,
  where: string,
): string[] {
  const problems: string[] = [];
  const declared = Object.keys(contract);
  const emitted = Object.keys(payload);

  for (const key of declared) {
    const field = contract[key];
    const present = Object.prototype.hasOwnProperty.call(payload, key) && payload[key] !== undefined;

    if (!present) {
      // A required SDK field the wire never sends is an invented field: every
      // consumer that trusts the type will read `undefined` at runtime.
      if (field.required) {
        problems.push(
          `${where}.${key}: SDK declares it as REQUIRED (${field.declaredAs}) but the API did not emit it`,
        );
      }
      continue;
    }

    if (!field.accepts(payload[key])) {
      problems.push(
        `${where}.${key}: SDK declares ${field.declaredAs} but the API emitted ` +
          `${JSON.stringify(payload[key])} (${typeof payload[key]})`,
      );
    }
  }

  for (const key of emitted) {
    if (payload[key] === undefined) continue;
    if (!declared.includes(key)) {
      problems.push(
        `${where}.${key}: the API emits this field but the SDK type does not declare it ` +
          `(value: ${JSON.stringify(payload[key])})`,
      );
    }
  }

  return problems;
}

function expectDescribedBySdk(
  payload: Record<string, unknown>,
  contract: AnyWireCheck,
  where: string,
): void {
  const problems = diffAgainstSdkType(payload, contract, where);
  if (problems.length > 0) {
    throw new Error(
      `The SDK type does not describe the wire.\n\n` +
        problems.map((p) => `  • ${p}`).join('\n') +
        `\n\nActual ${where} payload:\n${JSON.stringify(payload, null, 2)}\n`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GT-565 — @beyondnet/evolith-sdk types describe the real wire', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Layer 1 — compile-time identity, SDK public types vs core-domain contracts.
  //
  // Shelled out rather than imported because this jest project runs ts-jest with
  // `diagnostics: { warnOnly: true }` (jest.config.js), under which a type error
  // in an imported file is a console warning, not a failure. Running `tsc` in a
  // child process with its own strict project restores the teeth.
  // ───────────────────────────────────────────────────────────────────────────
  describe('compile-time: SDK public types are identical to the domain contract', () => {
    it('type-checks sdk-type-contract.types.ts under a strict project', async () => {
      let stdout = '';
      try {
        // Resolve the workspace's own tsc and run it on this process's node
        // binary. `npx tsc` would work locally but can reach for the registry
        // on a cold CI cache; require.resolve keeps it hermetic and pins the
        // exact TypeScript the repo builds with.
        const tscBin = require.resolve('typescript/bin/tsc', { paths: [REPO_ROOT] });
        const result = await execFileAsync(
          process.execPath,
          [tscBin, '--noEmit', '--pretty', 'false', '-p', TYPE_CONTRACT_PROJECT],
          { cwd: REPO_ROOT, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
        );
        stdout = result.stdout;
      } catch (err) {
        // tsc exits non-zero when it reports diagnostics; the diagnostics
        // themselves come back on stdout.
        stdout = (err as { stdout?: string }).stdout ?? String(err);
      }

      const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
      // Only diagnostics raised *in the contract file* are drift. Diagnostics in
      // SDK or domain sources are those packages' own business (and would fail
      // their own builds); surfacing them here would make this test flaky
      // against unrelated changes. They are still reported on failure.
      const drift = lines.filter((l) => l.includes(TYPE_CONTRACT_FILE));
      const foreign = lines.filter((l) => !l.includes(TYPE_CONTRACT_FILE));

      if (drift.length > 0) {
        throw new Error(
          `SDK types have drifted from the core-domain contract they must mirror.\n\n` +
            drift.map((l) => `  ${l}`).join('\n') +
            `\n\nEach 'does not satisfy the constraint' error names the offending ` +
            `fields. See sdk-type-contract.types.ts for what each assertion means.` +
            (foreign.length > 0
              ? `\n\nOther diagnostics (not drift, shown for context):\n${foreign
                  .slice(0, 20)
                  .map((l) => `  ${l}`)
                  .join('\n')}`
              : ''),
        );
      }
    }, 200_000);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Layer 2 — real responses from a booted core-api.
  // ───────────────────────────────────────────────────────────────────────────
  describe('runtime: real core-api responses satisfy the SDK types', () => {
    let app: INestApplication;
    let fixtureRoot: string;
    const workspaceRef = 'workspace';

    beforeAll(async () => {
      fixtureRoot = path.join(os.tmpdir(), `evolith-sdk-contract-${process.pid}`);
      const projectPath = path.join(fixtureRoot, workspaceRef);
      // GT-566: CORE_PATH is the repo root, plain. This used to need a
      // symlinked fixture core (reference/ + src/rulesets/ grafted together as
      // `rulesets/`) because ruleset resolution qualified candidates by
      // directory EXISTENCE and so latched onto <repo>/rulesets — the
      // satellite-side agents directory — instead of the corpus at
      // <repo>/src/rulesets, making validate-satellite 422. Resolution is now
      // content-qualified, so both endpoints read the real corpus from the
      // repo root and the workaround is gone.
      const corePath = REPO_ROOT;
      await fs.ensureDir(projectPath);

      // The REST surface resolves projectPath/corePath server-side from these
      // env vars (WorkspaceReferenceResolverService). They must be set BEFORE
      // AppModule is imported so ConfigModule reads them at init.
      process.env.WORKSPACE_ROOT = fixtureRoot;
      process.env.CORE_PATH = corePath;
      // H6: Contract tests hit core-api without auth — explicitly opt out of fail-closed
      process.env.CORE_API_AUTH_REQUIRED = 'false';

      const { AppModule } = await import('../../apps/core-api/src/app.module');
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      // Mirror main.ts: without these the app exposes neither the /api/v1
      // routes nor the ADR-0073 envelope the SDK types are written against.
      app.enableVersioning({ type: VersioningType.URI, prefix: 'api/v', defaultVersion: '1' });
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      app.useGlobalFilters(new HttpExceptionFilter());
      app.useGlobalInterceptors(new EnvelopeInterceptor());
      await app.init();
    }, 120_000);

    afterAll(async () => {
      await app?.close();
      await fs.remove(fixtureRoot);
    });

    // ── Gate evaluation ──────────────────────────────────────────────────────
    // gates.controller.ts → evaluate-gate.use-case.ts:83-91 (GateEvidence)
    describe('POST /api/v1/gates/:gateId/evaluate', () => {
      // All five gates: each maps to a different phase and ruleset slice, so a
      // field emitted only on some phases still gets covered.
      const gateIds = ['PG1', 'PG2', 'PG3', 'PG4', 'PG5'];

      for (const gateId of gateIds) {
        it(`${gateId}: response data is exactly the SDK's GateEvidence`, async () => {
          const res = await request(app.getHttpServer())
            .post(`/api/v1/gates/${gateId}/evaluate`)
            .send({ workspaceRef, evaluatedBy: 'ci' })
            .expect(200);

          const body = res.body as { success: boolean; data: Record<string, unknown> };
          expect(body.success).toBe(true);
          expect(body.data).toBeDefined();

          expectDescribedBySdk(body.data, WIRE_GATE_EVIDENCE as AnyWireCheck, 'GateEvidence');
        }, 60_000);
      }

      it('every emitted violation is exactly the SDK\'s GateViolation', async () => {
        // An empty temp project fails its gates, which is what makes this
        // assertion meaningful: the violations array is populated, so the
        // element shape is genuinely exercised rather than vacuously passing.
        const res = await request(app.getHttpServer())
          .post('/api/v1/gates/PG1/evaluate')
          .send({ workspaceRef, evaluatedBy: 'ci' })
          .expect(200);

        const violations = (res.body as { data: { violations: Record<string, unknown>[] } }).data
          .violations;

        // Guard against a vacuous pass: if this endpoint ever stops producing
        // violations for an empty project, the element contract is no longer
        // covered and this test must be revisited rather than silently weakened.
        expect(Array.isArray(violations)).toBe(true);
        expect(violations.length).toBeGreaterThan(0);

        violations.forEach((violation, i) => {
          expectDescribedBySdk(
            violation,
            WIRE_GATE_VIOLATION as AnyWireCheck,
            `GateEvidence.violations[${i}]`,
          );
        });
      }, 60_000);
    });

    // ── Architecture validation ──────────────────────────────────────────────
    // architecture.controller.ts:62 → ValidateSatelliteUseCase (ValidationResult)
    describe('POST /api/v1/architecture/validate-satellite', () => {
      let data: Record<string, unknown>;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/architecture/validate-satellite')
          .send({ workspaceRef })
          .expect(200);
        data = (res.body as { data: Record<string, unknown> }).data;
      }, 60_000);

      it("response data is exactly the SDK's ValidationResult", () => {
        expect(data).toBeDefined();
        expectDescribedBySdk(data, WIRE_VALIDATION_RESULT as AnyWireCheck, 'ValidationResult');
      });

      it("every emitted issue is exactly the SDK's ValidationIssue", () => {
        const issues = data.issues as Record<string, unknown>[];
        expect(Array.isArray(issues)).toBe(true);
        // A bare temp directory has no evolith.yaml, so the validator reports
        // issues — again keeping the element assertion non-vacuous.
        expect(issues.length).toBeGreaterThan(0);

        issues.forEach((issue, i) => {
          expectDescribedBySdk(
            issue,
            WIRE_VALIDATION_ISSUE as AnyWireCheck,
            `ValidationResult.issues[${i}]`,
          );
        });
      });
    });
  });
});
