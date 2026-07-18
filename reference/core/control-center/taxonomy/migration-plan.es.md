# Plan de Migración de Taxonomía

> Navegación bilingüe: [English](./migration-plan.md)

> Migración desde el `reference/` plano hacia la estructura `reference/core/` + `product/`.

## Estructura Objetivo

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

## Matriz de Migración

### Commit 2: reference/core/foundations/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/foundations/common-rules/* | reference/core/foundations/common-rules/ | move | Los estándares de ingeniería son reglas fundacionales |
| reference/core/foundations/common-rules/communication/* | reference/core/foundations/common-rules/ | move | La estrategia de comunicación es una regla común |
| reference/core/foundations/common-rules/ai-augmented/* | reference/core/foundations/common-rules/ | move | Los estándares de IA aumentada son reglas comunes |
| reference/core/foundations/inheritance-model/* | reference/core/foundations/inheritance-model/ | move | Las guías de onboarding definen la herencia |
| reference/core/sdlc/glossary/glossary* | reference/core/sdlc/glossary/ | move | El glosario pertenece al SDLC |
| reference/core/sdlc/glossary/glossary-ecosystem* | reference/core/sdlc/glossary/ | move | El glosario del ecosistema pertenece al SDLC |
| reference/core/sdlc/DECISIONS* | reference/core/sdlc/governance/ | move | Las decisiones pertenecen a la gobernanza del SDLC |
| reference/core/foundations/principles/* | reference/core/foundations/principles/ | move | Los principios son fundacionales |
| reference/core/foundations/satellite-definitions/* | reference/core/foundations/satellite-definitions/ | move | Los bounded contexts definen las fronteras de los satélites |
| reference/core/control-center/taxonomy/* | reference/core/control-center/taxonomy/ | move | La trazabilidad es taxonomía |
| .bmad-core/agents/* | reference/core/foundations/agent-skills/ | move | Las definiciones de agentes son fundacionales |
| .bmad-core/skills/* | reference/core/foundations/agent-skills/ | move | Las skills son fundacionales |

### Commit 3: reference/core/sdlc/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/sdlc/* | reference/core/sdlc/ (root) | move | Fases, gates y playbooks del SDLC |
| reference/core/control-center/gaps/gap-tracking* | reference/core/control-center/gaps/ | move | El seguimiento de gaps es del control-center |
| reference/core/control-center/gaps/gap-reference-catalog* | reference/core/control-center/gaps/ | move | El catálogo de gaps es del control-center |
| reference/core/control-center/evidence/gap-closure-evidence* | reference/core/control-center/evidence/ | move | La evidencia de cierre es del control-center |
| reference/core/control-center/maturity-* | reference/core/control-center/maturity-reports/ | move | Los reportes de madurez son del control-center |
| reference/core/sdlc/governance/* | reference/core/sdlc/governance/ | move | Los documentos de gobernanza pertenecen al SDLC |
| reference/core/sdlc/governance/* | reference/core/sdlc/governance/ | move | Reglas de gobernanza de ADRs |
| reference/core/control-center/opportunities/* | reference/core/control-center/opportunities/ | move | Las propuestas son oportunidades |

### Commit 4: reference/core/architecture/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| reference/core/architecture/adrs/* | reference/core/architecture/adrs/ | move | Los ADRs son arquitectónicos |
| reference/core/architecture/blueprints/* | reference/core/architecture/blueprints/ | move | Los blueprints son arquitectónicos |
| reference/core/architecture/topologies/* | reference/core/architecture/topologies/ | move | Las topologías son arquitectónicas |
| reference/core/architecture/patterns/* | reference/core/architecture/patterns/ | move | Los patrones canónicos son arquitectónicos |
| reference/core/architecture/foundations/* | reference/core/architecture/foundations/ | move | La arquitectura del agent runtime es fundacional |
| reference/core/architecture/foundations/* | reference/core/architecture/foundations/ | move | La arquitectura del SDK es fundacional |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | Las vistas son demos de referencia |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | Los diagramas C4 son demos de referencia |
| reference/core/architecture/demos/* | reference/core/architecture/demos/ | move | El mapa visual es un demo de referencia |

### Commit 5: migración de product/

| old_path | new_path | action | reason |
|----------|----------|--------|--------|
| product/suite/* | product/suite/ | move | La suite de producto es específica del producto |
| product/products/* | product/products/ | move | Los productos son específicos del producto |
| product/infra/* | product/infra/ | move | La infraestructura es específica del producto |
| product/operations/* | product/operations/ | move | Las operaciones son específicas del producto |
| product/research/* | product/research/ | move | El conocimiento/investigación es específico del producto |
| product/infra/* | product/infra/ | move | Las configuraciones de plataforma son específicas del producto |
| reference/getting-started/* | product/ (or keep at reference/) | review | Getting started puede ser del Core o del Producto |
| reference/quick-access/* | reference/ (keep) | keep | Quick access es navegación |
| reference/wiki/* | reference/ (keep) | keep | El wiki es referencia |

### Commit 6: Limpieza de directorios antiguos

Después de todos los movimientos, eliminar los directorios antiguos vacíos:
- `reference/core/sdlc/` (si está vacío)
- `reference/core/architecture/` (si está vacío)
- `product/suite/` (si está vacío)
- `product/products/` (si está vacío)
- `product/infra/` (si está vacío)
- `product/operations/` (si está vacío)
- `product/research/` (si está vacío)
- `product/infra/` (si está vacío)

## Checklist de Validación

- [ ] Todos los enlaces Markdown internos resuelven
- [ ] Paridad bilingüe mantenida (pares EN+ES)
- [ ] Sin archivos huérfanos
- [ ] Los scripts de CI encuentran sus objetivos
- [ ] El build de TypeScript pasa
- [ ] Los tests de contrato pasan
- [ ] La validación de documentación pasa
- [ ] `git grep` no encuentra referencias rotas a rutas antiguas
