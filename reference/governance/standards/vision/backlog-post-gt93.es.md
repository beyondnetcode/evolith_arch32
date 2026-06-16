# Backlog de Tareas Post-GT93

**Creado:** 2026-06-16  
**Fuente:** Deep Analysis Report (`docs/analysis/deep-analysis-2026-06-16.md`)  
**Total:** 24 items (11 GAPs + 13 Opportunities)

---

## GAPs (Must-Do) - 11 items, ~40 horas

### P0 - Crítico (Blocking) - 2 items, 6 horas

| ID | Título | Componente | Impacto | Esfuerzo | Size | GitHub Project |
|----|--------|------------|---------|----------|------|----------------|
| ~~**GAP-001**~~ | ~~Corregir 21 tests fallidos~~ | CLI | CI reliability blocked | 4h | M | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-001%5D)(https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-001%5D) |
| **GAP-002** | Fix ConfirmationService TTY tests | CLI | GT-114 validation at risk | 2h | S | [`#2`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-002%5D) |

**Orden:** P0 primero, luego por esfuerzo ascendente (S → M)

### P1 - Alto (Quality Gate) - 4 items, 18 horas

| ID | Título | Componente | Impacto | Esfuerzo | Size | GitHub Project |
|----|--------|------------|---------|----------|------|----------------|
| **GAP-003** | Raise statement coverage to 80% | CLI | Quality gate failure | 8h | L | DONE Creado |
| **GAP-004** | Raise branch coverage to 67% | CLI | Quality gate failure | 6h | M | DONE Creado |
| **GAP-005** | Add tests for zero-coverage files | CLI | Unvalidated code | 2h | S | DONE Creado |
| **GAP-006** | Document auto-fix in architecture | Docs | Missing documentation | 2h | S | DONE Creado |

**Orden:** P1 primero, luego por esfuerzo ascendente (S → M → L)

### P2 - Medio (Technical Debt) - 5 items, 16 horas

| ID | Título | Componente | Impacto | Esfuerzo | Size | Estado | GitHub Project |
|----|--------|------------|---------|----------|------|--------|----------------|
| ~~**GAP-007**~~ | ~~Eliminar emoji de la documentación~~ | Docs | Quality gate violation | 1h | XS | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-007%5D) |
| ~~**GAP-008**~~ | ~~Completar principios de diseño de herramientas~~ | ~~Docs~~ | ~~Estándar incompleto~~ | ~~4h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-008%5D) |
| ~~**GAP-009**~~ | ~~Completar directrices de seguridad MCP~~ | ~~Docs~~ | ~~Brecha de seguridad~~ | ~~4h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-009%5D) |
| ~~**GAP-010**~~ | ~~Auditar coherencia de documentación BFF~~ | ~~BFF~~ | ~~Deriva potencial~~ | ~~4h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1?filterQuery=%5BGAP-010%5D) |
| ~~**GAP-011**~~ | ~~Fix WizardService implementation drift~~ | ~~CLI~~ | ~~Architecture drift~~ | ~~3h~~ | ~~S~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-011%5D) |

**Orden:** P2 primero, luego por esfuerzo ascendente (XS → S → M)

---

## Opportunities (Should/Could-Do) - 13 items, ~50 horas

### Should-Do (High Value) - 5 items, 26 horas

| ID | Título | Componente | Valor | Esfuerzo | Size | GitHub Project |
|----|--------|------------|-------|----------|------|----------------|
| ~~**OPP-003**~~ | ~~Eliminar ruido de consola en tests~~ | ~~CLI~~ | ~~Developer experience~~ | ~~2h~~ | ~~S~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-003%5D) |
| ~~**OPP-009**~~ | ~~Generar reportes HTML de cobertura~~ | ~~CLI~~ | ~~Better visibility~~ | ~~2h~~ | ~~S~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-009%5D) |
| ~~**OPP-010**~~ | ~~Agregar timeout de confirmación~~ | ~~CLI~~ | ~~Better UX~~ | ~~2h~~ | ~~S~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-010%5D) |
| ~~**OPP-004**~~ | ~~Optimizar validación pre-commit~~ | ~~Platform~~ | ~~Developer experience~~ | ~~4h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-004%5D) |
| ~~**OPP-002**~~ | ~~Agregar trazas distribuidas MCP~~ | ~~CLI~~ | ~~Observability~~ | ~~6h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-002%5D) |
| ~~**OPP-005**~~ | ~~Agregar dashboard de métricas MCP~~ | ~~CLI~~ | ~~Observability~~ | ~~6h~~ | ~~M~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-005%5D) |
| ~~**OPP-001**~~ | ~~Implementar estrategias domain auto-fix~~ | ~~CLI~~ | ~~Complete GT-115 vision~~ | ~~8h~~ | ~~L~~ | **DONE** | [`[DONE]`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BOPP-001%5D) |

**Orden:** Por esfuerzo ascendente (S → M → L) para facilitar quick wins

### Could-Do (Medium Value) - 5 items, 24 horas

| ID | Título | Componente | Valor | Esfuerzo | Size | GitHub Project |
|----|--------|------------|-------|----------|------|----------------|
| **OPP-008** | Parallelize test execution | CLI | Faster CI | 4h | M | DONE Creado |
| **OPP-007** | Add wizard validation steps | CLI | Better UX | 4h | M | DONE Creado |
| **OPP-006** | Expand auto-fix strategies (6+) | CLI | More automation | 12h | XL | DONE Creado |

**Orden:** Por esfuerzo ascendente (M → XL)

---

## Criterios de Ordenamiento

Los items están ordenados por:

1. **Prioridad** (P0 → P1 → P2 → Should-Do → Could-Do)
2. **Complejidad/Esfuerzo** ascendente dentro de cada prioridad (XS → S → M → L → XL)

**Size Mapping:**
- XS: ≤1h
- S: 2-3h
- M: 4-6h
- L: 7-10h
- XL: ≥11h

**GitHub Project Fields:**
- DONE Status: Backlog (todos los items)
- DONE Size: Configurado según esfuerzo estimado
- WARN Priority: Campo existe pero requiere configuración de opciones (P0/P1/P2)

---

### Won't-Do (Low Priority / Archive) - 3 items

| ID | Título | Componente | Razón | Estado |
|----|--------|------------|-------|--------|
| **OPP-011** | Complete senior architectural assessment | Docs | Template not used | Archive |
| **OPP-012** | Archive stale planning documents | Docs | Low value | Archive |
| **OPP-013** | Complete harness platform evaluation | Platform | Not applicable | Archive |

---

## Roadmap Sugerido

### Semana 1 (Crítico)
- [x] **GAP-001: Corregir 21 tests fallidos** [DONE] DONE
- [ ] GAP-002: Fix ConfirmationService TTY tests
- [ ] GAP-006: Document auto-fix in architecture

### Semana 2-3 (Quality Gate)
- [ ] GAP-003: Raise statement coverage to 80%
- [ ] GAP-004: Raise branch coverage to 67%
- [ ] GAP-005: Add tests for zero-coverage files
- [x] **GAP-007: Eliminar emoji de la documentación** [DONE] DONE

### Mes 1 (Technical Debt)
- [ ] GAP-008: Complete tool design principles
- [ ] GAP-009: Complete MCP security guidelines
- [ ] GAP-010: Audit BFF documentation coherence
- [ ] GAP-011: Fix WizardService implementation drift

### Quarter 1 (Opportunities)
- [ ] OPP-001: Implement auto-fix domain strategies
- [ ] OPP-002: Add MCP distributed tracing
- [ ] OPP-003: Eliminate test console noise
- [ ] OPP-005: Add MCP metrics dashboard

---

## Referencias

- **Análisis Completo:** `docs/analysis/deep-analysis-2026-06-16.md`
- **GitHub Project:** https://github.com/users/beyondnetcode/projects/1
- **Gap Tracking Original:** `reference/governance/standards/vision/gap-tracking.md`

---

## Actualización de Estado

| Fecha | Cambio | Items Added | Items Completed | Backlog |
|-------|--------|-------------|-----------------|---------|
| 2026-06-16 | Creación inicial del backlog | 24 (11 GAPs + 13 OPPs) | 0 | 24 |
| 2026-06-16 | Sincronizado con GitHub Project | [DONE] 21 items creados | 0 | 21 |
| 2026-06-16 | **GAP-007 completado** | - | [DONE] GAP-007 | **20** |

**Progreso:** 2/11 GAPs completados (18%) · 10 pendientes

**GitHub Project Items:**
- GAP-001: `PVTI_lADOD5Ic284BaueGzgv7wQM` [DONE] Backlog
- GAP-002: `PVTI_lADOD5Ic284BaueGzgv7wU8` [DONE] Backlog
- GAP-003: `PVTI_lADOD5Ic284BaueGzgv7wVo` [DONE] Backlog
- GAP-004: `PVTI_lADOD5Ic284BaueGzgv7wWs` [DONE] Backlog
- GAP-005: `PVTI_lADOD5Ic284BaueGzgv7wXU` [DONE] Backlog
- GAP-006: `PVTI_lADOD5Ic284BaueGzgv7wYE` [DONE] Backlog
- GAP-007: `PVTI_lADOD5Ic284BaueGzgv7wY4` [DONE] **DONE** DONE
- GAP-008: `PVTI_lADOD5Ic284BaueGzgv7wZ0` [DONE] Backlog
- GAP-009: `PVTI_lADOD5Ic284BaueGzgv7wa0` [DONE] Backlog
- GAP-010: `PVTI_lADOD5Ic284BaueGzgv7wbo` [DONE] Backlog
- GAP-011: `PVTI_lADOD5Ic284BaueGzgv7wc0` [DONE] Backlog
- OPP-001: `PVTI_lADOD5Ic284BaueGzgv7wjA` [DONE] Backlog
- OPP-002: `PVTI_lADOD5Ic284BaueGzgv7wkA` [DONE] Backlog
- OPP-003: `PVTI_lADOD5Ic284BaueGzgv7wks` DONE
- OPP-004: `PVTI_lADOD5Ic284BaueGzgv7wlM` DONE
- OPP-005: `PVTI_lADOD5Ic284BaueGzgv7wmU` DONE
- OPP-006: `PVTI_lADOD5Ic284BaueGzgv7wnA` DONE
- OPP-007: `PVTI_lADOD5Ic284BaueGzgv7wnc` DONE
- OPP-008: `PVTI_lADOD5Ic284BaueGzgv7woQ` DONE
- OPP-009: `PVTI_lADOD5Ic284BaueGzgv7wpg` DONE
- OPP-010: `PVTI_lADOD5Ic284BaueGzgv7wqI` DONE

**Status:** Todos los items creados con estado "Backlog"
