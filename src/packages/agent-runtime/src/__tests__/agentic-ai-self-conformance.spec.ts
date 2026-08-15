/**
 * GT-575 (criterion 3) — Evolith evaluated against its OWN agentic-ai rules.
 *
 * The product ships nine BLOCKING `AAI-*` rules about governing an agent, and
 * until now never ran them against the one package in the repository that IS an
 * agent. This suite loads the shipped ruleset from
 * `src/rulesets/topologies/agentic-ai/agentic-ai.rules.json` — the same file a
 * customer's evaluation reads — and runs the REAL Core evaluator
 * (`ArchitectureRuleHandler` from `@beyondnet/evolith-core-domain`) over this
 * package as the satellite.
 *
 * Deliberately unforgiving, because a green here is the claim:
 *   - the ruleset is read from disk; a missing or emptied file FAILS the suite
 *     rather than vacuously passing over zero rules;
 *   - the count of blocking `AAI-*` rules is asserted to be exactly 9, so a rule
 *     added upstream cannot be silently skipped;
 *   - `canHandle` is asserted per rule, so a rule the engine cannot route is a
 *     failure and not a `skipped` that reads as green;
 *   - a negative fixture removes `agent.config.json` from the satellite view and
 *     asserts all nine go red — a guard nobody has seen fail is not a guard.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ArchitectureRuleHandler } from '@beyondnet/evolith-core-domain/application/validators/evaluators/handlers/architecture-rule.handler';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import type { NormalizedRule } from '@beyondnet/evolith-core-domain/domain/models/normalized-rule';

/** This package — the satellite under evaluation. */
const SATELLITE = resolve(__dirname, '..', '..');
/** The shipped ruleset, read from the monorepo exactly as a customer would. */
const RULESET = resolve(
  __dirname,
  '../../../../rulesets/topologies/agentic-ai/agentic-ai.rules.json',
);

interface ShippedRule {
  id: string;
  severity: NormalizedRule['severity'];
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  validationQuery?: string;
}

function loadBlockingAaiRules(): NormalizedRule[] {
  const raw = JSON.parse(readFileSync(RULESET, 'utf8')) as { rules?: ShippedRule[] };
  const rules = (raw.rules ?? []).filter((r) => r.blocking && /^AAI-/.test(r.id));
  return rules.map((r) => ({
    id: r.id,
    severity: r.severity,
    category: r.category,
    title: r.title,
    description: r.description,
    blocking: r.blocking,
    validationQuery: r.validationQuery,
    sourceFile: RULESET,
  }));
}

/**
 * Minimal real filesystem for the evaluator. `hidePaths` powers the negative
 * fixture WITHOUT deleting anything from the working tree.
 */
function nodeFs(hidePaths: readonly string[] = []): IFileSystem {
  const hidden = (p: string): boolean => hidePaths.some((h) => resolve(p) === resolve(h));
  const unsupported = (name: string) => async (): Promise<never> => {
    throw new Error(`IFileSystem.${name} is not used by the agent rules`);
  };
  return {
    readFile: async (p: string) => {
      if (hidden(p)) throw new Error(`ENOENT: ${p}`);
      return readFile(p, 'utf8');
    },
    readFileBuffer: async (p: string) => Buffer.from(await readFile(p)),
    writeFile: unsupported('writeFile'),
    exists: async (p: string) => !hidden(p) && existsSync(p),
    existsSync: (p: string) => !hidden(p) && existsSync(p),
    readJson: async (p: string) => {
      if (hidden(p)) throw new Error(`ENOENT: ${p}`);
      return JSON.parse(await readFile(p, 'utf8'));
    },
    writeJson: unsupported('writeJson'),
    mkdir: unsupported('mkdir'),
    readdir: async (p: string) =>
      readdirSync(p, { withFileTypes: true }).map((d) => ({
        name: d.name,
        isDirectory: () => d.isDirectory(),
        isFile: () => d.isFile(),
      })) as never,
    readdirNames: async (p: string) => readdirSync(p),
    copy: unsupported('copy'),
    ensureDir: unsupported('ensureDir'),
    ensureFile: unsupported('ensureFile'),
    stat: async (p: string) => {
      const s = statSync(p);
      return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile() };
    },
    remove: unsupported('remove'),
  } as unknown as IFileSystem;
}

const context = { satellitePath: SATELLITE, corePath: resolve(SATELLITE, '../../..') };

describe('GT-575 — the agent runtime passes the 9 blocking AAI-* rules it ships', () => {
  const rules = loadBlockingAaiRules();

  it('loads exactly the nine blocking AAI-* rules from the shipped ruleset', () => {
    expect(rules.map((r) => r.id).sort()).toEqual([
      'AAI-R01', 'AAI-R02', 'AAI-R03', 'AAI-R04', 'AAI-R05',
      'AAI-R06', 'AAI-R07', 'AAI-R08', 'AAI-R09',
    ]);
  });

  it('declares a satellite descriptor next to the runtime it describes', () => {
    expect(existsSync(join(SATELLITE, 'agent.config.json'))).toBe(true);
  });

  /**
   * GT-683 — this test used to assert on disk what AAI-R03 and AAI-R08 could not
   * see, because both only compared fields: a descriptor could satisfy them while
   * pointing at nothing. The handler now checks existence, population and runbook
   * CONTENT itself, so the rule-driven cases above cover that and those
   * assertions were deleted rather than kept as a duplicate that would rot.
   *
   * What survives is the part the handler deliberately does NOT enforce: it
   * requires the runbook to be non-empty, which is the floor a customer must
   * clear. 500 characters is OUR standard for our own package — a stricter local
   * bar, not the shipped rule, and it belongs here rather than in the corpus.
   */
  it("this package's runbook is a document an operator can act on, not a placeholder", () => {
    const config = JSON.parse(readFileSync(join(SATELLITE, 'agent.config.json'), 'utf8')) as {
      operationalBudgets: { runbooksPath: string };
    };
    const runbook = readFileSync(join(SATELLITE, config.operationalBudgets.runbooksPath), 'utf8');
    expect(runbook.length).toBeGreaterThan(500);
  });

  it.each(loadBlockingAaiRules().map((rule) => [rule.id, rule] as const))(
    '%s passes against this package',
    async (_id, rule) => {
      const handler = new ArchitectureRuleHandler(nodeFs());
      // A rule the engine cannot route would come back `skipped`, which reads as
      // green in an aggregate. Assert routing explicitly.
      expect(handler.canHandle(rule)).toBe(true);
      const result = await handler.evaluate(rule, context);
      expect(`${rule.id}: ${result.result}${result.message ? ` — ${result.message}` : ''}`).toBe(
        `${rule.id}: passed`,
      );
    },
  );

  it('NEGATIVE FIXTURE: without agent.config.json every one of the nine fails', async () => {
    const handler = new ArchitectureRuleHandler(nodeFs([join(SATELLITE, 'agent.config.json')]));
    const outcomes = await Promise.all(
      rules.map(async (rule) => (await handler.evaluate(rule, context)).result),
    );
    expect(outcomes).toEqual(new Array(rules.length).fill('failed'));
  });
});
