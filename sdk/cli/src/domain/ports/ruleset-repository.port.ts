import { NormalizedRule } from '../../core/validators/rule-evaluation-engine';

export interface IRulesetRepository {
  loadAllRulesets(corePath: string): Promise<NormalizedRule[]>;
}
