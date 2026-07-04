# Agente de Análisis de Impacto y Sincronización de Evolith Core

> **Bilingual navigation:** [English version](./impact-analysis-agent.md)

El mecanismo obligatorio de sincronización de gobernanza machine-readable para Evolith Core.

---

## Visión General

El Agente de Análisis de Impacto y Sincronización se ejecuta automáticamente después de cualquier cambio relevante en Evolith Core. Detecta, clasifica y analiza el alcance de los cambios en todos los componentes Evolith, luego ejecuta sincronización dirigida para mantener la coherencia.

**Disparado por:** Hook `.husky/pre-commit` (automático en cada commit)

**Invocación manual:**
```bash
node .harness/scripts/ci/06-impact-analysis-synchronizer.mjs [options]
```

---

## Categorías de Cambio

| Categoría | Patrón | Zonas de Impacto |
|---|---|---|
| **ADR** | `/adrs/*/ADR-*.md` | adrs, rulesets, documentation, navigation |
| **DOCS** | `/reference/**/*.md` | documentation, navigation, bilingual |
| **RULES** | `/reference/governance/standards/*.md`, `/rulesets/*.rules.json` | rulesets, harness, documentation |
| **ARCH** | `/reference/core/architecture/blueprints/*.md` | adrs, rulesets, documentation |
| **HARNESS** | `/.harness/**/*.{mjs,md,json}`, `/.husky/*` | harness, rulesets, validators |
| **SCHEMA** | `/rulesets/schema/*.json`, `/.harness/schemas/*.json` | rulesets, validators, harness |
| **TEMPLATE** | `/sdlc/04-artifact-templates/*.md` | templates, documentation, navigation |
| **NAVIGATION** | `/navigation/*.md`, `/README.md` | navigation, documentation |

---

## Zonas de Impacto

Cada categoría de cambio cascada a múltiples zonas de impacto:

- **adrs** — Registro ADR e índices
- **rulesets** — Reglas y schemas machine-readable
- **documentation** — Documentación técnica
- **navigation** — Índices de navegación y MASTER_INDEX
- **harness** — Scripts, agentes y configuración CI/CD
- **templates** — Plantillas de artefactos
- **validators** — Scripts de validación y schemas
- **bilingual** — Pares de documentación EN/ES

---

## Acciones de Sincronización

| Acción | Descripción |
|---|---|
| **index_update** | Actualiza índice ADR o ruleset cuando se crea nuevo artefacto |
| **bilingual_sync** | Valida que counterpart bilingüe existe y es consistente |
| **schema_update** | Valida sintaxis JSON y estructura de schemas |
| **navigation_sync** | Valida enlaces en archivos de navegación; refresca MASTER_INDEX |
| **cross_ref_sync** | Actualiza referencias cruzadas (ej., matriz ADR) |
| **rule_propagation** | Propaga cambios de reglas a componentes dependientes |
| **template_validation** | Valida estructura de plantilla de artefacto |

---

## Quality Gates

El agente enforce estas reglas:

| Regla | Comportamiento |
|---|---|
| **Sin archivos bilingües huérfanos** | EN sin ES → bloquea commit |
| **Paridad bilingüe requerida** | Creación ES sin counterpart EN → warning |
| **Sintaxis de schema validada** | JSON inválido en `.rules.json` o `.schema.json` → error |
| **Enlaces de navegación validados** | Enlaces relativos rotos → error |
| **Cambios HARNESS marcados** | Cambios a `.harness/` o `.husky/` → warning de riesgo |
| **Eliminación ADR requiere aprobación board** | ADR eliminado → acción manual requerida |

---

## Códigos de Salida

| Código | Significado |
|---|---|
| `0` | Análisis pasaron, sin riesgos críticos |
| `1` | Fallos de sincronización o riesgos críticos |

---

## Opciones

| Opción | Descripción |
|---|---|
| `--staged` | Analizar solo cambios staged (default para pre-commit) |
| `--working-tree` | Analizar cambios en working tree (unstaged) |
| `--all` | Analizar todos los cambios desde último commit |
| `--dry-run` | Reportar nomas, sin cambios aplicados |
| `--verbose` | Salida detallada con análisis por cambio |
| `--report` | Guardar report JSON + TXT en `.harness/reports/` |
| `--fail-on-risk` | Salir con error si se identifican riesgos |
| `--help` | Mostrar mensaje de ayuda |

---

## Salida del Reporte

Los reportes se guardan en `.harness/reports/` con formato:
- `impact-analysis-{timestamp}.json` — Registro machine-readable
- `impact-analysis-{timestamp}.txt` — Resumen human-readable

Schema del reporte: `.harness/schemas/impact-analysis.schema.json`

---

## Idempotencia

El agente es idempotente: ejecutar con las mismas entradas produce sin cambios duplicados. Repetir el análisis sobre el mismo conjunto de cambios:
- Retornará resultados de sincronización idénticos
- Marcará la ejecución como `idempotent: true` en el reporte
- No hará modificaciones de archivos

---

## Acciones Manuales

Algunas situaciones requieren intervención manual:

| Escenario | Acción Requerida |
|---|---|
| Eliminación ADR | Revisión y aprobación del Architecture Board |
| Desbalance de counterpart bilingüe | Sync manual de contenido EN/ES |
| Error estructural de schema | Fix manual de estructura JSON |
| Enlaces de navegación rotos | Update manual de targets de enlaces |

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Reglas y convenciones de agentes |
| [Global Rules](../../.harness/rules/global-rules.es.md) | Reglas de validación del harness |
| [Impact Analysis Schema](../../.harness/schemas/impact-analysis.schema.json) | JSON Schema para registros de análisis |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Impact Analysis Agent</sub>
</div>