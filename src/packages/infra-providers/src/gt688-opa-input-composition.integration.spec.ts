/**
 * GT-688 · AC1, second half — the composition must reach the INPUT DOCUMENT the
 * policies actually decide on, not merely the manifest.
 *
 * ## Why this suite exists as an integration test
 *
 * `evaluation-context.builder.spec.ts` proves that
 * `evaluationFactsFromContext` PROJECTS `context.topologyConfirmedRefs`, and
 * `opa-wasm-composition.spec.ts` proves the compiled bundle DISCRIMINATES on it.
 * Both were green while the wire between them was cut:
 * `RuleEvaluationEngine.discoverAndEvaluate` built its `WorkspaceEvaluationContext`
 * from `{satellitePath, corePath}` alone, so `OpaInputBuilder` had no `ctx.facts`
 * to merge and `input.context` was ABSENT from every corpus policy's input. A
 * policy handed an absent `input.context` matches nothing, reports no violation,
 * and reads exactly like a repository that complies.
 *
 * The gate stage (`satellite-evaluation-pipeline.evaluateGate`) has passed the
 * same facts since GT-380 — one half of the engine received the declaration and
 * the other did not, which is why two unit suites could both be honest and the
 * feature still decide nothing.
 *
 * ## Why it reads the built document instead of a verdict
 *
 * Asserting on a verdict cannot separate "the policy saw the composition and
 * found nothing wrong" from "the policy never saw it". So the suite captures the
 * input document at the LAST point before it leaves the process: `OpaEvaluator`
 * POSTs `{input}` to an OPA sidecar when `OPA_URL` is set, and `fetch` is stubbed
 * to record that body. Nothing about the assembly is mocked — real disk adapters,
 * the real corpus, the real `OpaInputBuilder`.
 */

import * as nodeFs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators';

import { DiskRulesetRepository } from './disk-ruleset.repository';
import { NodeFileSystemProvider } from './node-filesystem.provider';
import { YamlConfigParserImpl } from './config-parser.provider';

const CORE = path.resolve(__dirname, '../../../..');

const silentLogger = {
  info: () => undefined, warn: () => undefined, error: () => undefined,
  debug: () => undefined, success: () => undefined,
} as any;

function opaValidator(): RulesetValidatorService {
  const fs = new NodeFileSystemProvider() as any;
  return new RulesetValidatorService({
    engineType: 'opa',
    fileSystem: fs,
    logger: silentLogger,
    configParser: new YamlConfigParserImpl() as any,
    rulesetRepo: new DiskRulesetRepository(fs, silentLogger) as any,
  });
}

type Captured = Record<string, unknown>;

describe('GT-688 · the confirmed composition reaches the OPA input document', () => {
  const realFetch = globalThis.fetch;
  const realOpaUrl = process.env.OPA_URL;
  let satellite: string;
  let captured: Captured[];

  beforeEach(() => {
    satellite = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'gt688-opa-'));
    captured = [];
    process.env.OPA_URL = 'http://opa.invalid';
    globalThis.fetch = (async (_url: unknown, init: any) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { input?: Captured };
      if (body.input) captured.push(body.input);
      // A sidecar that finds nothing: the suite asserts on the QUESTION asked,
      // never on the answer, so the answer is deliberately empty.
      return { ok: true, json: async () => ({ result: [] }) } as any;
    }) as any;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realOpaUrl === undefined) delete process.env.OPA_URL;
    else process.env.OPA_URL = realOpaUrl;
  });

  /** The one document the corpus stage asked OPA to decide on. */
  const inputDocument = (): Captured => {
    expect(captured.length).toBeGreaterThan(0);
    return captured[0];
  };

  it(
    'carries context.topologyConfirmedRefs when the caller declared a composition',
    async () => {
      await opaValidator().validate(satellite, CORE, undefined, {
        topologies: ['modular-monolith', 'event-driven'],
        facts: {
          context: { topologyConfirmedRefs: ['modular-monolith', 'event-driven'] },
        } as any,
      });

      const context = inputDocument().context as Record<string, unknown> | undefined;
      // Read off the BUILT document, not off the manifest that produced it.
      expect(context).toBeDefined();
      expect(context!.topologyConfirmedRefs).toEqual(['modular-monolith', 'event-driven']);
    },
    120_000,
  );

  it(
    'leaves the document byte-identical for a caller that declares nothing',
    async () => {
      await opaValidator().validate(satellite, CORE);

      // The pre-GT-688 shape: no `context` key at all. Asserted so the forwarding
      // cannot start inventing an empty `context` for legacy callers, which would
      // flip `not input.context` policies without anyone declaring anything.
      expect(inputDocument()).not.toHaveProperty('context');
    },
    120_000,
  );

  it(
    'does NOT overwrite the disk-derived halves of the document',
    async () => {
      await opaValidator().validate(satellite, CORE, undefined, {
        topologies: ['event-driven'],
        facts: { context: { topologyConfirmedRefs: ['event-driven'] } } as any,
      });

      const doc = inputDocument();
      // `satellite` and `core` are what OpaInputBuilder read off disk; the facts
      // merge is additive and must not shadow them.
      expect(doc).toHaveProperty('satellite');
      expect(doc).toHaveProperty('core');
      expect((doc.satellite as Record<string, unknown>).eventDriven).toBeDefined();
    },
    120_000,
  );
});
