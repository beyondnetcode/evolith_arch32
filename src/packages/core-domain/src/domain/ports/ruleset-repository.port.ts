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

export interface IRulesetRepository {
  /** @throws {RulesetsNotFoundError} when no rulesets resolve at `corePath`. */
  loadAllRulesets(corePath: string): Promise<NormalizedRule[]>;
}
