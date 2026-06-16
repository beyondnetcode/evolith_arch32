# Backlog de Tareas Post-GT93

**Creado:** 2026-06-16  
**Fuente:** Deep Analysis Report (`docs/analysis/deep-analysis-2026-06-16.md`)  
**Total:** 24 items (11 GAPs + 13 Opportunities)

---

## GAPs (Must-Do) - 11 items, ~40 horas

### P0 - Crítico (Blocking) - 2 items, 6 horas

| ID | Título | Componente | Impacto | Esfuerzo | Estado | GitHub Project |
|----|--------|------------|---------|----------|--------|----------------|
| **GAP-001** | Fix 21 failing tests | CLI | CI reliability blocked | 4h | Backlog | [`#1`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-001%5D) |
| **GAP-002** | Fix ConfirmationService TTY tests | CLI | GT-114 validation at risk | 2h | Backlog | [`#2`](https://github.com/users/beyondnetcode/projects/1/views/1?filterQuery=%5BGAP-002%5D) |

### P1 - Alto (Quality Gate) - 4 items, 18 horas

| ID | Título | Componente | Impacto | Esfuerzo | Estado | GitHub Project |
|----|--------|------------|---------|----------|--------|----------------|
| **GAP-003** | Raise statement coverage to 80% | CLI | Quality gate failure | 8h | Backlog | ✅ Creado |
| **GAP-004** | Raise branch coverage to 67% | CLI | Quality gate failure | 6h | Backlog | ✅ Creado |
| **GAP-005** | Add tests for zero-coverage files | CLI | Unvalidated code | 2h | Backlog | ✅ Creado |
| **GAP-006** | Document auto-fix in architecture | Docs | Missing documentation | 2h | Backlog | ✅ Creado |

### P2 - Medio (Technical Debt) - 5 items, 16 horas

| ID | Título | Componente | Impacto | Esfuerzo | Estado | GitHub Project |
|----|--------|------------|---------|----------|--------|----------------|
| **GAP-007** | Remove emoji from documentation | Docs | Quality gate violation | 1h | Backlog | ✅ Creado |
| **GAP-008** | Complete tool design principles | Docs | Incomplete standard | 4h | Backlog | ✅ Creado |
| **GAP-009** | Complete MCP security guidelines | Docs | Security gap | 4h | Backlog | ✅ Creado |
| **GAP-010** | Audit BFF documentation coherence | BFF | Potential drift | 4h | Backlog | ✅ Creado |
| **GAP-011** | Fix WizardService implementation drift | CLI | Architecture drift | 3h | Backlog | ✅ Creado |

---

## Opportunities (Should/Could-Do) - 13 items, ~50 horas

### Should-Do (High Value) - 5 items, 26 horas

| ID | Título | Componente | Valor | Esfuerzo | Estado | GitHub Project |
|----|--------|------------|-------|----------|--------|----------------|
| **OPP-001** | Implement auto-fix domain strategies | CLI | Complete GT-115 vision | 8h | Backlog | ✅ Creado |
| **OPP-002** | Add MCP distributed tracing | CLI | Observability | 6h | Backlog | ✅ Creado |
| **OPP-003** | Eliminate test console noise | CLI | Developer experience | 2h | Backlog | ✅ Creado |
| **OPP-004** | Optimize pre-commit validation | Platform | Developer experience | 4h | Backlog | ✅ Creado |
| **OPP-005** | Add MCP metrics dashboard | CLI | Observability | 6h | Backlog | ✅ Creado |

### Could-Do (Medium Value) - 5 items, 24 horas

| ID | Título | Componente | Valor | Esfuerzo | Estado | GitHub Project |
|----|--------|------------|-------|----------|--------|----------------|
| **OPP-006** | Expand auto-fix strategies (6+) | CLI | More automation | 12h | Backlog | ✅ Creado |
| **OPP-007** | Add wizard validation steps | CLI | Better UX | 4h | Backlog | ✅ Creado |
| **OPP-008** | Parallelize test execution | CLI | Faster CI | 4h | Backlog | ✅ Creado |
| **OPP-009** | Generate HTML coverage reports | CLI | Better visibility | 2h | Backlog | ✅ Creado |
| **OPP-010** | Add confirmation timeout config | CLI | Better UX | 2h | Backlog | ✅ Creado |

### Won't-Do (Low Priority / Archive) - 3 items

| ID | Título | Componente | Razón | Estado |
|----|--------|------------|-------|--------|
| **OPP-011** | Complete senior architectural assessment | Docs | Template not used | Archive |
| **OPP-012** | Archive stale planning documents | Docs | Low value | Archive |
| **OPP-013** | Complete harness platform evaluation | Platform | Not applicable | Archive |

---

## Roadmap Sugerido

### Semana 1 (Crítico)
- [ ] GAP-001: Fix 21 failing tests
- [ ] GAP-002: Fix ConfirmationService TTY tests
- [ ] GAP-006: Document auto-fix in architecture

### Semana 2-3 (Quality Gate)
- [ ] GAP-003: Raise statement coverage to 80%
- [ ] GAP-004: Raise branch coverage to 67%
- [ ] GAP-005: Add tests for zero-coverage files
- [ ] GAP-007: Remove emoji from documentation

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

| Fecha | Cambio | Items Added | Items Completed |
|-------|--------|-------------|-----------------|
| 2026-06-16 | Creación inicial del backlog | 24 (11 GAPs + 13 OPPs) | 0 |
| 2026-06-16 | Sincronizado con GitHub Project | ✅ 21 items creados | 0 |

**GitHub Project Items:**
- GAP-001: `PVTI_lADOD5Ic284BaueGzgv7wQM` ✅
- GAP-002: `PVTI_lADOD5Ic284BaueGzgv7wU8` ✅
- GAP-003: `PVTI_lADOD5Ic284BaueGzgv7wVo` ✅
- GAP-004: `PVTI_lADOD5Ic284BaueGzgv7wWs` ✅
- GAP-005: `PVTI_lADOD5Ic284BaueGzgv7wXU` ✅
- GAP-006: `PVTI_lADOD5Ic284BaueGzgv7wYE` ✅
- GAP-007: `PVTI_lADOD5Ic284BaueGzgv7wY4` ✅
- GAP-008: `PVTI_lADOD5Ic284BaueGzgv7wZ0` ✅
- GAP-009: `PVTI_lADOD5Ic284BaueGzgv7wa0` ✅
- GAP-010: `PVTI_lADOD5Ic284BaueGzgv7wbo` ✅
- GAP-011: `PVTI_lADOD5Ic284BaueGzgv7wc0` ✅
- OPP-001: `PVTI_lADOD5Ic284BaueGzgv7wjA` ✅
- OPP-002: `PVTI_lADOD5Ic284BaueGzgv7wkA` ✅
- OPP-003: `PVTI_lADOD5Ic284BaueGzgv7wks` ✅
- OPP-004: `PVTI_lADOD5Ic284BaueGzgv7wlM` ✅
- OPP-005: `PVTI_lADOD5Ic284BaueGzgv7wmU` ✅
- OPP-006: `PVTI_lADOD5Ic284BaueGzgv7wnA` ✅
- OPP-007: `PVTI_lADOD5Ic284BaueGzgv7wnc` ✅
- OPP-008: `PVTI_lADOD5Ic284BaueGzgv7woQ` ✅
- OPP-009: `PVTI_lADOD5Ic284BaueGzgv7wpg` ✅
- OPP-010: `PVTI_lADOD5Ic284BaueGzgv7wqI` ✅

**Status:** Todos los items creados con estado "Backlog"
