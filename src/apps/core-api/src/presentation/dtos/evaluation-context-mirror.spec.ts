import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { EvaluationContextDto } from './evaluation.dto';

/**
 * GT-652 — the wire DTO must be able to CARRY the canonical context.
 *
 * `main.ts` runs the global ValidationPipe with `forbidNonWhitelisted: true`, so a field absent
 * from `EvaluationContextDto` does not arrive stripped — it 400s the whole evaluation. And the
 * controller does `body as unknown as EvaluationContext`, a straight cast, so this class IS the
 * reachable surface of the contract.
 *
 * That combination makes a missing field invisible from inside the Core: every unit test builds an
 * `EvaluationContext` in TypeScript and passes, while a real caller sending the same object over
 * HTTP is rejected. A closure note in the gap catalog had already recorded the DTO as a "full
 * canonical mirror" on exactly that kind of evidence — it was not one, and five fields the engine
 * READS could not be sent.
 *
 * This guard reads the contract source rather than a hand-kept list, so a field added to
 * `EvaluationContext` tomorrow fails here until the wire can carry it.
 */

function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'src/packages/core-domain/src/evaluation/contracts/evaluation-context.ts'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('repo root not found');
}

/** The optional top-level fields `EvaluationContext` declares, read from the contract itself. */
function contractFields(): string[] {
  const source = readFileSync(
    join(repoRoot(), 'src/packages/core-domain/src/evaluation/contracts/evaluation-context.ts'),
    'utf8',
  );
  const body = /export interface EvaluationContext \{([\s\S]*?)\n\}/.exec(source)?.[1];
  if (!body) throw new Error('EvaluationContext interface not found — the guard cannot be satisfied vacuously');

  return [...body.matchAll(/^\s{2}readonly (\w+)\??:/gm)].map((m) => m[1]);
}

/**
 * Fields the wire deliberately does NOT accept, each with the reason. An entry here is a decision
 * on the record, not a way to quiet the guard: anything not listed must be sendable.
 */
const NOT_ON_THE_WIRE: Record<string, string> = {
  // Server-assigned. A caller naming its own trace id would let two callers collide on purpose.
  correlationId: 'accepted under a different name/derivation by the caller contract',
};

/**
 * Whether the WHITELIST rejected this field — not whether a type validator did.
 *
 * The distinction is the whole point and the first version of this guard got it wrong: probing
 * `evidence` with `{}` trips `@IsArray`, which says the payload was the wrong shape, NOT that the
 * wire refuses the field. Conflating the two reported five perfectly carriable fields as missing.
 * `forbidNonWhitelisted` raises its own constraint key, so the question can be asked exactly.
 */
function rejectedByWhitelist(errors: readonly { property: string; constraints?: Record<string, string> }[], field: string): boolean {
  return errors.some((e) => e.property === field && e.constraints?.whitelistValidation !== undefined);
}

describe('GT-652 — the wire DTO mirrors the canonical EvaluationContext', () => {
  const declared = contractFields();

  it('reads a non-empty field list from the contract (anti-vacuous)', () => {
    // Without this, a regex that stopped matching would make every assertion below pass on an
    // empty set — the vacuous green this repository keeps finding one layer down.
    expect(declared.length).toBeGreaterThan(15);
    expect(declared).toContain('kinds');
  });

  it.each(['requester', 'repositoryRevision', 'qualitySignals', 'repoFacts', 'baselineRepoFacts'])(
    'accepts %s — the five fields the engine reads and the wire used to reject',
    async (field) => {
      const dto = plainToInstance(EvaluationContextDto, {
        kinds: ['gate'],
        [field]: field === 'qualitySignals' ? [] : {},
      });

      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

      expect(rejectedByWhitelist(errors, field)).toBe(false);
    },
  );

  it('every field the contract declares is carriable, or listed as a deliberate exclusion', async () => {
    // Behavioural, NOT reflective. The first version of this test asked `plainToInstance` which
    // keys it produced; TypeScript does not emit class properties that have no initializer, so it
    // passed with the field deleted from the DTO — a vacuous green that the same commit's
    // per-field tests caught. This sends every declared field through the real validator instead,
    // one at a time, and asks which ones the whitelist rejects.
    const rejected: string[] = [];

    for (const field of declared) {
      if (field in NOT_ON_THE_WIRE) continue;

      // Two probe shapes, because the question is "can the wire carry this name at all" and a
      // single shape would fail the type validator for half the fields either way.
      const errores = await Promise.all(
        [{}, [], 'probe'].map((valor) =>
          validate(plainToInstance(EvaluationContextDto, { kinds: ['gate'], [field]: valor }), {
            whitelist: true,
            forbidNonWhitelisted: true,
          })),
      );

      if (errores.every((errs) => rejectedByWhitelist(errs, field))) rejected.push(field);
    }

    expect(rejected).toEqual([]);
  });

  it('rejects a field nobody declared, so the whitelist is still armed', async () => {
    // The negative direction. If this ever passes, the guard above stops meaning anything because
    // the wire would accept everything.
    const dto = plainToInstance(EvaluationContextDto, { kinds: ['gate'], noSoyUnCampoReal: 1 });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

    expect(rejectedByWhitelist(errors, 'noSoyUnCampoReal')).toBe(true);
  });
});
