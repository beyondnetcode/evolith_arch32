# Taxonomy Migration Plan

> Migration from flat `reference/` to `reference/core/` + `product/` structure.

## Target Structure

```
reference/core/
├── foundations/     (principles, common-rules, common-contracts, satellite-definitions, inheritance-model, agent-skills)
├── sdlc/            (phases, artifacts, standards, gates, maturity, governance, rules, glossary)
├── architecture/    (foundations, topologies, adrs, blueprints, patterns, progressive-evolution, demos)
└── control-center/  (gaps, maturity-reports, audits, opportunities, evidence, taxonomy)

product/
├── suite/           (from product/suite/)
├── products/        (from product/products/)
├── designs/
├── strategy/
├── roadmap/
├── infra/           (from product/infra/)
├── operations/      (from product/operations/)
├── releases/
├── research/        (from product/research/)
└── evidence/
```

## Migration Matrix

### Commit 2: reference/core/foundations/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/foundations/common-rules/* | reference/core/foundations/common-rules/ | move | Engineering standards are foundational rules |
| reference/core/foundations/common-rules/communication/* | reference/core/foundations/common-rules/ | move | Communication strategy is a common rule |
| reference/core/foundations/common-rules/ai-augmented/* | reference/core/foundations/common-rules/ | move | AI-augmented standards are common rules |
| reference/core/foundations/inheritance-model/* | reference/core/foundations/inheritance-model/ | move | Onboarding guides define inheritance |
| reference/core/sdlc/glossary/glossary* | reference/core/sdlc/glossary/ | move | Glossary belongs to SDLC |
| reference/core/sdlc/glossary/glossary-ecosystem* | reference/core/sdlc/glossary/ | move | Ecosystem glossary belongs to SDLC |
| reference/governance/DECISIONS* | reference/core/sdlc/governance/ | move | Decisions belong to SDLC governance |
| reference/core/foundations/principles/* | reference/core/foundations/principles/ | move | Principles are foundational |
| reference/core/foundations/satellite-definitions/* | reference/core/foundations/satellite-definitions/ | move | Bounded contexts define satellite boundaries |
| reference/core/control-center/taxonomy/* | reference/core/control-center/taxonomy/ | move | Traceability is taxonomy |
| .bmad-core/agents/* | reference/core/foundations/agent-skills/ | move | Agent definitions are foundational |
| .bmad-core/skills/* | reference/core/foundations/agent-skills/ | move | Skills are foundational |

### Commit 3: reference/core/sdlc/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/sdlc/* | reference/core/sdlc/ (root) | move | SDLC phases, gates, playbooks |
| reference/core/control-center/gaps/gap-tracking* | reference/core/control-center/gaps/ | move | Gap tracking is control-center |
| reference/core/control-center/gaps/gap-reference-catalog* | reference/core/control-center/gaps/ | move | Gap catalog is control-center |
| reference/core/control-center/evidence/gap-closure-evidence* | reference/core/control-center/evidence/ | move | Closure evidence is control-center |
| reference/governance/standards/vision/maturity-* | reference/core/control-center/maturity-reports/ | move | Maturity reports are control-center |
| reference/core/sdlc/governance/* | reference/core/sdlc/governance/ | move | Governance docs belong to SDLC |
| reference/core/sdlc/governance/* | reference/core/sdlc/governance/ | move | ADR governance rules |
| reference/core/control-center/opportunities/* | reference/core/control-center/opportunities/ | move | Proposals are opportunities |

### Commit 4: reference/core/architecture/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/architecture/adrs/* | reference/core/architecture/adrs/ | move | ADRs are architectural |
| reference/core/architecture/blueprints/* | reference/core/architecture/blueprints/ | move | Blueprints are architectural |
| reference/core/architecture/topologies/* | reference/core/architecture/topologies/ | move | Topologies are architectural |
| reference/core/architecture/patterns/* | reference/core/architecture/patterns/ | move | Canonical patterns are architectural |
| reference/core/architecture/foundations/* | reference/core/architecture/foundations/ | move | Agent runtime architecture is foundational |
| reference/core/architecture/foundations/* | reference/core/architecture/foundations/ | move | SDK architecture is foundational |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | Views are reference demos |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | C4 diagrams are reference demos |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | Visual map is a reference demo |

### Commit 5: product/ migration

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| product/suite/* | product/suite/ | move | Product suite is product-specific |
| product/products/* | product/products/ | move | Products are product-specific |
| product/infra/* | product/infra/ | move | Infrastructure is product-specific |
| product/operations/* | product/operations/ | move | Operations are product-specific |
| product/research/* | product/research/ | move | Knowledge/research is product-specific |
| product/infra/* | product/infra/ | move | Platform configs are product-specific |
| reference/getting-started/* | product/ (or keep at reference/) | review | Getting started may be Core or Product |
| reference/quick-access/* | reference/ (keep) | keep | Quick access is navigation |
| reference/wiki/* | reference/ (keep) | keep | Wiki is reference |

### Commit 6: Cleanup old directories

After all moves, remove empty old directories:
- `reference/governance/` (if empty)
- `reference/architecture/` (if empty)
- `product/suite/` (if empty)
- `product/products/` (if empty)
- `product/infra/` (if empty)
- `product/operations/` (if empty)
- `product/research/` (if empty)
- `product/infra/` (if empty)

## Validation Checklist

- [ ] All internal Markdown links resolve
- [ ] Bilingual parity maintained (EN+ES pairs)
- [ ] No orphaned files
- [ ] CI scripts find their targets
- [ ] TypeScript build passes
- [ ] Contract tests pass
- [ ] Documentation validation passes
- [ ] `git grep` finds no broken old-path references
