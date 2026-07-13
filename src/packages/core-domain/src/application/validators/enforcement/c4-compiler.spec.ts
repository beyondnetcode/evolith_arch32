import { compileC4ToBoundaryRules, type C4Model } from './c4-compiler';
import { evaluateEdit } from './edit-gate';

// A hexagonal C4 model: application may use domain + infrastructure; domain may use nothing.
const MODEL: C4Model = {
  elements: [
    { id: 'domain', name: 'Domain', path: 'src/domain', importPrefix: 'src/domain', adrRef: 'ADR-0002' },
    { id: 'app', name: 'Application', path: 'src/application', importPrefix: 'src/application' },
    { id: 'infra', name: 'Infrastructure', path: 'src/infrastructure', importPrefix: 'src/infrastructure' },
  ],
  relationships: [
    { source: 'app', destination: 'domain' },
    { source: 'app', destination: 'infra' },
    { source: 'infra', destination: 'domain' },
  ],
};

describe('compileC4ToBoundaryRules (GT-528 — model → executable boundary rules)', () => {
  it('forbids, for each element, the imports it did not declare a relationship to', () => {
    const rules = compileC4ToBoundaryRules(MODEL);
    const byApplies = Object.fromEntries(rules.map((r) => [r.appliesTo, r]));
    // domain declared no relationships → may not import application or infrastructure.
    expect(byApplies['src/domain'].forbiddenImports).toEqual(['src/application', 'src/infrastructure']);
    // application declared domain + infra → only its own... nothing else exists → no rule OR empty.
    expect(byApplies['src/application']).toBeUndefined();
    // infrastructure declared domain → may not import application.
    expect(byApplies['src/infrastructure'].forbiddenImports).toEqual(['src/application']);
  });

  it('carries the element ADR and a C4-prefixed rule id, and honours the severity option', () => {
    const [rule] = compileC4ToBoundaryRules(MODEL).filter((r) => r.appliesTo === 'src/domain');
    expect(rule.ruleId).toBe('C4-domain');
    expect(rule.adrRef).toBe('ADR-0002');
    expect(compileC4ToBoundaryRules(MODEL, { severity: 'warning' })[0].severity).toBe('warning');
  });

  it('skips abstract elements with no code path', () => {
    const rules = compileC4ToBoundaryRules({
      elements: [{ id: 'ext', name: 'External System' }, ...MODEL.elements],
      relationships: MODEL.relationships,
    });
    expect(rules.some((r) => r.ruleId === 'C4-ext')).toBe(false);
  });

  it('end-to-end: compiled rules BLOCK a domain edit that imports infrastructure (GT-528 → GT-526)', () => {
    const rules = compileC4ToBoundaryRules(MODEL);
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: "import { Db } from 'src/infrastructure/db';" },
      rules,
    );
    expect(decision.allow).toBe(false);
    expect(decision.violations[0].ruleId).toBe('C4-domain');
  });

  it('end-to-end: an application edit importing domain is allowed (declared relationship)', () => {
    const rules = compileC4ToBoundaryRules(MODEL);
    const decision = evaluateEdit(
      { filePath: 'src/application/use-case.ts', content: "import { Order } from 'src/domain/order';" },
      rules,
    );
    expect(decision.allow).toBe(true);
  });
});
