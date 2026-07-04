import { NormalizedRule } from '../../domain/models/normalized-rule';

export interface IRulesetRepository {
  loadAllRulesets(corePath: string): Promise<NormalizedRule[]>;
}
