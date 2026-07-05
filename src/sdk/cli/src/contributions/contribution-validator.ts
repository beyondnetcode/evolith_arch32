export type ContributionType = 'ruleset' | 'topology' | 'adr' | 'template';

export interface Contribution {
  type: ContributionType;
  path: string;
  author: string;
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ContributionValidator {
  validate(contribution: Contribution): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!contribution.path || contribution.path.trim().length === 0) {
      errors.push('Contribution path is required');
    }

    if (!contribution.author || contribution.author.trim().length === 0) {
      errors.push('Contribution author is required');
    }

    if (!contribution.description || contribution.description.trim().length === 0) {
      warnings.push('Contribution description is empty — recommended for review clarity');
    }

    if (contribution.type === 'ruleset' && !contribution.path.endsWith('.rules.json')) {
      errors.push('Ruleset contributions must end with .rules.json');
    }

    if (contribution.type === 'adr' && !contribution.path.includes('/adrs/')) {
      errors.push('ADR contributions must be placed under a /adrs/ directory');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateBatch(contributions: Contribution[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    for (const contrib of contributions) {
      results.set(contrib.path, this.validate(contrib));
    }
    return results;
  }
}
