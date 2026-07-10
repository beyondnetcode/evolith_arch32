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

export interface IRulesetRepository {
  /** @throws {RulesetsNotFoundError} when no rulesets resolve at `corePath`. */
  loadAllRulesets(corePath: string): Promise<NormalizedRule[]>;
}
