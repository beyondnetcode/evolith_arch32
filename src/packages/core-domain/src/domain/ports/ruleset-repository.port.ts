import { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * Raised when the Core rulesets cannot be resolved, or resolve to an empty
 * corpus. GT-474: this is deliberately fatal and must NOT be swallowed into a
 * warning — a governance run that checks zero rules has to abort loudly, never
 * report `passed`/`warning`. Lives in the domain so both the repository
 * implementations and the validators can agree on the contract.
 */
export class RulesetsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RulesetsNotFoundError';
  }
}

/**
 * Raised when the ruleset CORPUS ROOT itself could not be located under a given
 * `corePath` — as opposed to a corpus that resolved but yielded no usable rules.
 *
 * GT-566: these two are different faults with different owners, and collapsing
 * them is what made the symptom unreadable. A corpus that cannot be located is
 * a **deployment/configuration** fault (`CORE_PATH` points at the wrong tree),
 * not a client sending an unprocessable request — so surfaces report it as a
 * server error rather than a 422 titled "Ruleset Not Found", which invited the
 * reader to go looking for a ruleset that was never missing.
 *
 * Subclasses `RulesetsNotFoundError` deliberately: every existing
 * `instanceof RulesetsNotFoundError` catch-site (notably the rethrow in
 * `RulesetValidatorService.validate`, which stops an empty corpus being
 * downgraded to a warning) keeps working unchanged.
 */
export class RulesetCorpusNotResolvedError extends RulesetsNotFoundError {
  constructor(message: string) {
    super(message);
    this.name = 'RulesetCorpusNotResolvedError';
  }
}

/**
 * What the corpus loader did with a `*.rules.json` that produced no rules.
 *
 * #575: the loader globs `*.rules.json` and four shipped files are not rule
 * SETS. Three declare a different schema on purpose and one is a phase-gate
 * document; all four contributed nothing, and the only trace was a log line.
 * A log line is not accounting -- it does not survive `--format json`, it does
 * not reach an exit code, and it is exactly the silent drop this project exists
 * to stop, happening inside its own loader.
 */
export interface CorpusDocumentOutcome {
  /** Path relative to the corpus root, so the report is stable across machines. */
  readonly file: string;
  /**
   * `classified` -- declares a known non-ruleset schema and satisfies it, so it
   * contributes no rules BY DESIGN. `rejected` -- claims to be a ruleset, or
   * declares nothing, and failed the ruleset schema. The second is a defect;
   * the first is a fact about the corpus.
   */
  readonly outcome: 'classified' | 'rejected';
  /** Basename of the declared `$schema`, when the document declares one. */
  readonly declaredSchema?: string;
  /** The kind, for `classified`. The validation failure, for `rejected`. */
  readonly detail: string;
}

export interface IRulesetRepository {
  /** @throws {RulesetsNotFoundError} when no rulesets resolve at `corePath`. */
  loadAllRulesets(corePath: string): Promise<NormalizedRule[]>;
  /**
   * Every document the most recent {@link loadAllRulesets} read and did not turn
   * into rules. Optional so an implementation that cannot know stays valid --
   * but an implementation that DOES drop documents and does not report them
   * reintroduces #575.
   */
  describeLastLoad?(): readonly CorpusDocumentOutcome[];
}
