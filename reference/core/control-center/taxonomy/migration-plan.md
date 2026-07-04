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
├── suite/           (from reference/product-suite/)
├── products/        (from reference/products/)
├── designs/
├── strategy/
├── roadmap/
├── infra/           (from reference/infrastructure/)
├── operations/      (from reference/operations/)
├── releases/
├── research/        (from reference/knowledge/)
└── evidence/
```

## Migration Matrix

### Commit 2: reference/core/foundations/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/governance/standards/engineering/* | reference/core/foundations/common-rules/ | move | Engineering standards are foundational rules |
| reference/governance/standards/communication/* | reference/core/foundations/common-rules/ | move | Communication strategy is a common rule |
| reference/governance/standards/ai-augmented/* | reference/core/foundations/common-rules/ | move | AI-augmented standards are common rules |
| reference/governance/standards/onboarding/* | reference/core/foundations/inheritance-model/ | move | Onboarding guides define inheritance |
| reference/governance/glossary* | reference/core/sdlc/glossary/ | move | Glossary belongs to SDLC |
| reference/governance/glossary-ecosystem* | reference/core/sdlc/glossary/ | move | Ecosystem glossary belongs to SDLC |
| reference/governance/DECISIONS* | reference/core/sdlc/governance/ | move | Decisions belong to SDLC governance |
| reference/architecture/principles/* | reference/core/foundations/principles/ | move | Principles are foundational |
| reference/architecture/contexts/* | reference/core/foundations/satellite-definitions/ | move | Bounded contexts define satellite boundaries |
| reference/architecture/traceability/* | reference/core/control-center/taxonomy/ | move | Traceability is taxonomy |
| .bmad-core/agents/* | reference/core/foundations/agent-skills/ | move | Agent definitions are foundational |
| .bmad-core/skills/* | reference/core/foundations/agent-skills/ | move | Skills are foundational |

### Commit 3: reference/core/sdlc/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/governance/sdlc/* | reference/core/sdlc/ (root) | move | SDLC phases, gates, playbooks |
| reference/governance/standards/vision/gap-tracking* | reference/core/control-center/gaps/ | move | Gap tracking is control-center |
| reference/governance/standards/vision/gap-reference-catalog* | reference/core/control-center/gaps/ | move | Gap catalog is control-center |
| reference/governance/standards/vision/gap-closure-evidence* | reference/core/control-center/evidence/ | move | Closure evidence is control-center |
| reference/governance/standards/vision/maturity-* | reference/core/control-center/maturity-reports/ | move | Maturity reports are control-center |
| reference/governance/standards/governance-docs/* | reference/core/sdlc/governance/ | move | Governance docs belong to SDLC |
| reference/governance/adr/* | reference/core/sdlc/governance/ | move | ADR governance rules |
| reference/governance/upstream-proposals/* | reference/core/control-center/opportunities/ | move | Proposals are opportunities |

### Commit 4: reference/core/architecture/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/architecture/adrs/* | reference/core/architecture/adrs/ | move | ADRs are architectural |
| reference/architecture/blueprints/* | reference/core/architecture/blueprints/ | move | Blueprints are architectural |
| reference/architecture/topologies/* | reference/core/architecture/topologies/ | move | Topologies are architectural |
| reference/architecture/canonical-patterns/* | reference/core/architecture/patterns/ | move | Canonical patterns are architectural |
| reference/architecture/agent-runtime/* | reference/core/architecture/foundations/ | move | Agent runtime architecture is foundational |
| reference/architecture/evolith-sdk/* | reference/core/architecture/foundations/ | move | SDK architecture is foundational |
| reference/architecture/views/* | reference/core/architecture/demos/ | move | Views are reference demos |
| reference/architecture/c4-levels/* | reference/core/architecture/demos/ | move | C4 diagrams are reference demos |
| reference/architecture/visual-map/* | reference/core/architecture/demos/ | move | Visual map is a reference demo |

### Commit 5: product/ migration

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/product-suite/* | product/suite/ | move | Product suite is product-specific |
| reference/products/* | product/products/ | move | Products are product-specific |
| reference/infrastructure/* | product/infra/ | move | Infrastructure is product-specific |
| reference/operations/* | product/operations/ | move | Operations are product-specific |
| reference/knowledge/* | product/research/ | move | Knowledge/research is product-specific |
| reference/platforms/* | product/infra/ | move | Platform configs are product-specific |
| reference/getting-started/* | product/ (or keep at reference/) | review | Getting started may be Core or Product |
| reference/quick-access/* | reference/ (keep) | keep | Quick access is navigation |
| reference/wiki/* | reference/ (keep) | keep | Wiki is reference |

### Commit 6: Cleanup old directories

After all moves, remove empty old directories:
- `reference/governance/` (if empty)
- `reference/architecture/` (if empty)
- `reference/product-suite/` (if empty)
- `reference/products/` (if empty)
- `reference/infrastructure/` (if empty)
- `reference/operations/` (if empty)
- `reference/knowledge/` (if empty)
- `reference/platforms/` (if empty)

## Validation Checklist

- [ ] All internal Markdown links resolve
- [ ] Bilingual parity maintained (EN+ES pairs)
- [ ] No orphaned files
- [ ] CI scripts find their targets
- [ ] TypeScript build passes
- [ ] Contract tests pass
- [ ] Documentation validation passes
- [ ] `git grep` finds no broken old-path references
