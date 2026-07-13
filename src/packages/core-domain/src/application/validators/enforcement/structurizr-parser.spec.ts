import { compileC4ToBoundaryRules } from './c4-compiler';
import { evaluateEdit } from './edit-gate';
import { parseStructurizrDsl } from './structurizr-parser';

// A minimal hexagonal workspace: application may use domain + infrastructure; domain uses nothing.
const DSL = `
workspace "Hex" {
  model {
    domain = container "Domain" { tags "path=src/domain,import=src/domain,adr=ADR-0002" }
    app = container "Application" { tags "path=src/application,import=src/application" }
    infra = container "Infrastructure" { tags "path=src/infrastructure,import=src/infrastructure" }

    app -> domain "uses"
    app -> infra "uses"
    infra -> domain "reads"
  }
  views {
    systemContext domain { include * }
  }
}
`;

describe('parseStructurizrDsl (GT-528 — Structurizr .dsl → C4Model)', () => {
  it('parses element definitions with tags into mapped C4 elements', () => {
    const model = parseStructurizrDsl(DSL);
    const byId = Object.fromEntries(model.elements.map((e) => [e.id, e]));
    expect(Object.keys(byId).sort()).toEqual(['app', 'domain', 'infra']);
    expect(byId.domain).toEqual({
      id: 'domain',
      name: 'Domain',
      path: 'src/domain',
      importPrefix: 'src/domain',
      adrRef: 'ADR-0002',
    });
    expect(byId.app).toEqual({
      id: 'app',
      name: 'Application',
      path: 'src/application',
      importPrefix: 'src/application',
    });
  });

  it('parses `a -> b` relationships and ignores the description + scaffolding', () => {
    const model = parseStructurizrDsl(DSL);
    expect(model.relationships).toEqual([
      { source: 'app', destination: 'domain' },
      { source: 'app', destination: 'infra' },
      { source: 'infra', destination: 'domain' },
    ]);
  });

  it('supports the simpler `ident = keyword "Name"` form without a tags block', () => {
    const model = parseStructurizrDsl('ext = softwareSystem "External"');
    expect(model.elements).toEqual([{ id: 'ext', name: 'External' }]);
    expect(model.relationships).toEqual([]);
  });

  it('parses a MULTI-LINE element block (the common real-.dsl form) — tags not dropped', () => {
    const model = parseStructurizrDsl(
      [
        'domain = container "Domain" {',
        '  tags "path=src/domain,import=src/domain,adr=ADR-0002"',
        '}',
        'infra = container "Infrastructure" {',
        '  tags "path=src/infrastructure,import=src/infrastructure"',
        '}',
        'infra -> domain "reads"',
      ].join('\n'),
    );
    expect(model.elements).toEqual([
      { id: 'domain', name: 'Domain', path: 'src/domain', importPrefix: 'src/domain', adrRef: 'ADR-0002' },
      { id: 'infra', name: 'Infrastructure', path: 'src/infrastructure', importPrefix: 'src/infrastructure' },
    ]);
    // The multi-line elements are NOT lost, so the compiler emits a real rule (domain ↛ infra).
    const rules = compileC4ToBoundaryRules(model);
    expect(rules.find((r) => r.appliesTo === 'src/domain')?.forbiddenImports).toEqual(['src/infrastructure']);
  });

  it('feeds compileC4ToBoundaryRules end-to-end: a parsed model yields boundary rules', () => {
    const model = parseStructurizrDsl(DSL);
    const rules = compileC4ToBoundaryRules(model);
    const byApplies = Object.fromEntries(rules.map((r) => [r.appliesTo, r]));
    // domain declared no relationships → may not import application or infrastructure.
    expect(byApplies['src/domain'].forbiddenImports).toEqual(['src/application', 'src/infrastructure']);
    expect(byApplies['src/domain'].ruleId).toBe('C4-domain');
    expect(byApplies['src/domain'].adrRef).toBe('ADR-0002');
    // infrastructure declared domain → may not import application.
    expect(byApplies['src/infrastructure'].forbiddenImports).toEqual(['src/application']);
  });

  it('end-to-end: parsed → compiled rules BLOCK a domain edit that imports infrastructure', () => {
    const rules = compileC4ToBoundaryRules(parseStructurizrDsl(DSL));
    const decision = evaluateEdit(
      { filePath: 'src/domain/order.ts', content: "import { Db } from 'src/infrastructure/db';" },
      rules,
    );
    expect(decision.allow).toBe(false);
    expect(decision.violations[0].ruleId).toBe('C4-domain');
  });
});
