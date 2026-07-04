import { ContributionValidator, Contribution } from './contribution-validator';

describe('ContributionValidator', () => {
  let validator: ContributionValidator;

  beforeEach(() => { validator = new ContributionValidator(); });

  it('should pass a valid ruleset contribution', () => {
    const contrib: Contribution = {
      type: 'ruleset',
      path: 'rulesets/my-rules.rules.json',
      author: 'dev@example.com',
      description: 'New ruleset for X',
    };
    const result = validator.validate(contrib);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when ruleset path does not end with .rules.json', () => {
    const contrib: Contribution = {
      type: 'ruleset',
      path: 'rulesets/my-rules.json',
      author: 'dev@example.com',
      description: 'Bad path',
    };
    const result = validator.validate(contrib);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ruleset contributions must end with .rules.json');
  });

  it('should fail when author is missing', () => {
    const contrib: Contribution = {
      type: 'topology',
      path: 'rulesets/topologies/my-topology.rules.json',
      author: '',
      description: 'Topology',
    };
    const result = validator.validate(contrib);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Contribution author is required');
  });

  it('should fail when ADR is not placed under /adrs/ directory', () => {
    const contrib: Contribution = {
      type: 'adr',
      path: 'reference/decisions/0001-my-adr.md',
      author: 'arch@example.com',
      description: 'ADR',
    };
    const result = validator.validate(contrib);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ADR contributions must be placed under a /adrs/ directory');
  });

  it('should warn when description is empty', () => {
    const contrib: Contribution = {
      type: 'template',
      path: 'templates/my-template.md',
      author: 'dev@example.com',
      description: '',
    };
    const result = validator.validate(contrib);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it('should validate a batch and return results keyed by path', () => {
    const contributions: Contribution[] = [
      { type: 'ruleset', path: 'rulesets/a.rules.json', author: 'a@x.com', description: 'A' },
      { type: 'ruleset', path: 'rulesets/b.json', author: 'b@x.com', description: 'B' },
    ];
    const results = validator.validateBatch(contributions);
    expect(results.get('rulesets/a.rules.json')?.valid).toBe(true);
    expect(results.get('rulesets/b.json')?.valid).toBe(false);
  });
});
