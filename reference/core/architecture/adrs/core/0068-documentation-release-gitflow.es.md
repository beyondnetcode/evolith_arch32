# ADR-0068: GitFlow de Lanzamiento de Documentación

## Estado
Propuesto

## Fecha
2026-05-29

## Contexto
Evolith Arch32 y UMS ambas producen documentación técnica bilingüe (EN/ES). Ambos repositorios siguen ADR-0050 (Estrategia de Branching Gitflow) para código, pero los flujos de trabajo de lanzamiento de documentación no están definidos. Sin un enfoque estructurado, la documentación se desincroniza de los lanzamientos de código, la paridad bilingüe se rompe y las correcciones críticas no pueden ser aceleradas independientemente del trabajo de características.

## Decisión

Adoptaremos **GitFlow de Lanzamiento de Documentación** como el flujo de trabajo de lanzamiento obligatorio para ambos repositorios, Evolith Arch32 y UMS. Esto extiende ADR-0050 con convenciones específicas de documentación para nombres de ramas, quality gates y etiquetas de versión.

---

## 1. Modelo de Ramas para Documentación

### Tipos de Rama

| Rama | Propósito | Duración | Rama Base | Objetivo de Merge |
|------|-----------|----------|-----------|-------------------|
| `main` | Snapshot de documentación listo para producción | Permanente | — | — |
| `develop` | Rama de integración para el próximo candidato a release | Permanente | — | `main` (vía release) |
| `feature/docs-*` | Nuevo contenido de documentación o reescrituras mayores | Hasta que PR se fusione | `develop` | `develop` |
| `release/docs-vX.Y.Z` | Estabilización de release (solo correcciones) | 2-4 semanas | `develop` | `main` + `develop` |
| `hotfix/docs-*` | Correcciones críticas de documentación en producción | Hasta que PR se fusione | `main` | `main` + `develop` |

### Cuándo Usar Cada Tipo de Rama

#### `main`
- Contiene la documentación autoritativa y visible en producción en todo momento
- Solo se actualiza vía ramas de release o hotfix
- No se permiten commits directos
- Cada commit a `main` debe ser etiquetado

#### `develop`
- Rama por defecto para todo el trabajo de documentación
- Contiene trabajo en progreso para el próximo release
- Todas las ramas `feature/docs-*` se fusionan aquí primero
- Activa CI `docs-validate-all` en cada push

#### `feature/docs-*`
Usar para:
- Agregar nuevos archivos de documentación (ej. `feature/docs-add-api-v2-reference`)
- Reescrituras mayores de secciones existentes de documentación
- Actualizaciones de traducción bilingüe (EN + ES deben estar en el mismo PR)
- Propuestas de nuevos ADR

NO usar para:
- Corregir typos en documentación de producción (usar `hotfix/docs-*` desde `main`)
- Agregar correcciones de archivo único (PR directamente a `develop` permitido para correcciones menores)

Nombramiento: `feature/docs-<short-description>` (ej. `feature/docs-add-observability-playbook`)

#### `release/docs-vX.Y.Z`
Usar cuando:
- `develop` ha alcanzado feature freeze para un release
- La documentación está lista para validación en producción
- Solo se permiten correcciones de bugs, corrección de links y diagramas
- No nuevo contenido o cambios estructurales

Nombramiento: `release/docs-v<major>.<minor>.<patch>` (ej. `release/docs-v1.2.0`)

#### `hotfix/docs-*`
Usar para:
- Corregir links rotos en documentación de producción
- Corregir errores técnicos críticos que confunden a los lectores
- Corregir diagramas Mermaid rotos
- Correcciones de paridad bilingüe (ES debe coincidir con estructura EN)
- Resolución de conflictos de numeración ADR

Nombramiento: `hotfix/docs-<issue-description>` (ej. `hotfix/docs-fix-broken-api-links`)

---

## 2. Requisitos de Pull Request

### Flujo de Trabajo PR Obligatorio
Cada cambio de documentación DEBE pasar por un Pull Request:

1. **Crear PR** desde `feature/docs-*` o `hotfix/docs-*` a la rama objetivo
2. **Descripción del PR** debe incluir:
   - Resumen de cambios
   - Lista de archivos afectados
   - Evaluación de impacto bilingüe (¿ambos EN/ES actualizados?)
   - Números de ADR relacionados si aplica
3. **Checks de CI** deben pasar (ver Sección 4)
4. **Aprobaciones** requeridas (ver Sección 3)
5. **Merge** vía squash merge para mantener historial limpio

### Límites de Tamaño de PR
- Máximo 20 archivos por PR para cambios de documentación
- Cambios más grandes deben dividirse en múltiples PRs
- Rationale: PRs más pequeños son más rápidos de revisar y reducen riesgo de ruptura de paridad bilingüe

### Requisitos de PR Bilingüe
- Si el PR modifica un archivo EN que tiene contraparte ES, ES debe ser actualizado en el mismo PR
- Descripción del PR debe indicar: "Paridad bilingüe: mantenida / rota / no aplica"
- Si la paridad bilingüe está rota, el PR está bloqueado hasta que se agregue la contraparte ES

---

## 3. Aprobaciones Requeridas Antes del Merge

| Rama Objetivo | Mínimo de Aprobaciones | Requisitos Especiales |
|---------------|------------------------|----------------------|
| `develop` | 1 | Revisor debe verificar consistencia bilingüe si archivos tienen pares ES |
| `release/docs-v*` | 2 | Uno debe ser writer técnico senior o arquitecto |
| `main` | 2 | Ambos deben ser contribuidores senior; uno debe verificar actualización del log de versiones |
| `hotfix/docs-*` | 1 | Debe incluir justificación para omitir flujo normal |

### Rotación de Aprobaciones
- La misma persona no puede ser el único aprobador en PRs consecutivos a `main`
- Al menos un aprobador debe tener acceso de escritura a la rama objetivo

---

## 4. Verificaciones Requeridas de GitHub Actions Antes del Merge

### Todos los PRs de Documentación
```
 lint-staged (markdownlint, prettier)
 validate-docs.mjs (links, anchors, encoding, Mermaid syntax)
 check-bilingual-parity.mjs (## and ### header count match)
```

### PRs a `develop`
```
 bilingual-coverage.mjs (no debe disminuir cobertura global por debajo del umbral)
 doc-complexity-score.mjs (no debe disminuir complejidad promedio por debajo del baseline)
```

### PRs a `release/docs-*`
```
 validate-docs.mjs --render-mermaid (renderiza diagramas para verificar corrección)
 bilingual-cross-ref.mjs (verifica que todos los links internos resuelven EN/ES)
 broken-link-scan (verificación de links externos)
 adr-number-check (asegura que no haya conflictos de numeración ADR)
```

### PRs a `main`
```
 Todas las verificaciones de release branch
 version-log-update.mjs (debe actualizar DOCUMENTATION_VERSIONS.md)
 git-tag-create check (verifica formato de tag docs-vX.Y.Z)
 coverage-impact.yml bot comment (debe mostrar cambio de cobertura < 1%)
```

### Hotfix PRs
```
 validate-docs.mjs (links, anchors)
 check-bilingual-parity.mjs (fast track)
 hotfix-justification (inline comment explicando por qué se omitió flujo normal)
```

---

## 5. Flujo de Release Candidate: `develop` → `main`

### Flujo Normal de Release

```
develop (feature freeze declarado)
  │
  ├─► Crear release/docs-v1.2.0 desde develop
  │
  ├─► Ejecutar estabilización: solo corregir lo necesario
  │
  ├─► CI valida en release branch
  │
  ├─► Aprobaciones obtenidas (2 requeridas)
  │
  ├─► Squash merge release/docs-v1.2.0 → main
  │
  ├─► Tag: docs-v1.2.0
  │
  ├─► GitHub Release creado automáticamente
  │
  └─► Merge de vuelta a develop (automático via GitFlow)
```

### Decisiones de Release Branch

| Escenario | Acción |
|-----------|--------|
| `develop` tiene todo el contenido deseado | Crear release branch |
| Bug encontrado en release branch | Corregir en release branch, fusionar a ambos |
| Problema mayor encontrado en release branch | Abortar release, corregir en `develop`, reiniciar |
| Hotfix necesario durante release | Hotfix desde `main`, cherry-pick a release |

### Ventanas de Feature Freeze
- No nuevo contenido permitido en release branch después de feature freeze
- Release branch puede recibir fixes por máximo 2 semanas
- Después de 2 semanas sin release, branch se abandona y se inicia nuevo release

---

## 6. Convención de Etiquetado de Versión

### Formato de Tag
```
docs-v<major>.<minor>.<patch>
```

### Reglas de Número de Versión

| Incremento | Cuándo Usar | Ejemplo |
|-----------|-------------|---------|
| **Major** (`X.0.0`) | Cambios estructurales en documentación, secciones renombradas que rompen links, renumeración ADR | `docs-v2.0.0` |
| **Minor** (`X.Y.0`) | Nuevas secciones de documentación, nuevos ADR, nuevas áreas de arquitectura | `docs-v1.3.0` |
| **Patch** (`X.Y.Z`) | Correcciones de bugs, corrección de links, corrección de diagramas, corrección de typos | `docs-v1.2.1` |

### Proceso de Creación de Tags
1. Release branch fusionada a `main`
2. GitHub Actions automáticamente:
   - Crea tag `docs-vX.Y.Z` en el commit de merge
   - Crea GitHub Release con changelog auto-generado
   - Actualiza `DOCUMENTATION_VERSIONS.md`

### Tags Existentes
```
docs-v1.0.0  Documentación inicial de producción
docs-v1.1.0  Agregados estándares API y ADR-0030 hasta ADR-0040
docs-v1.1.1  Hotfix: Corrección de links rotos en architecture-communication-strategy
```

---

## 7. Log de Versiones de Documentación

### Archivo: `DOCUMENTATION_VERSIONS.md`

Mantenido en la raíz del repositorio. Actualizado automáticamente vía CI en cada release a `main`.

```markdown
# Documentation Version Log

## Production Releases

| Version | Date | Branch | Key Changes | Hotfixes |
|---------|------|--------|-------------|----------|
| docs-v1.2.0 | 2026-05-29 | release/docs-v1.2.0 | Added observability playbook, updated API standards | — |
| docs-v1.1.1 | 2026-05-15 | hotfix/docs-fix-api-links | Fixed broken API reference links | 3 |
| docs-v1.1.0 | 2026-05-01 | release/docs-v1.1.0 | Added contract testing guidelines | — |
| docs-v1.0.0 | 2026-04-15 | release/docs-v1.0.0 | Initial production release | 2 |

## Upcoming (from develop)

| Target Version | Planned Date | In Progress |
|----------------|--------------|-------------|
| docs-v1.3.0 | 2026-06-15 | feature/docs-add-security-section |

## Version Policy

- **Major**: Breaking structural changes, renamed sections, ADR renumbering
- **Minor**: New documentation sections, new ADRs, new architecture areas
- **Patch**: Bug fixes, link corrections, diagram fixes, typos

See [ADR-0068](./0068-documentation-release-gitflow.md) for full policy.
```

### Integración CI para Log de Versiones
GitHub Actions workflow `.github/workflows/docs-release.yml` automáticamente:
1. Detecta merge a `main` desde release o hotfix branch
2. Extrae versión del nombre de la rama
3. Agrega entrada a `DOCUMENTATION_VERSIONS.md`
4. Crea Git tag si no existe
5. Crea GitHub Release

---

## 8. Política de Hotfix para Errores Críticos de Documentación

### Cuándo Usar Rama Hotfix

| Tipo de Problema | ¿Usar Hotfix? | Alternativa |
|------------------|---------------|-------------|
| Links rotos en docs de producción | Sí | — |
| Información técnica incorrecta que desorienta | Sí | — |
| Diagrama Mermaid roto | Sí | — |
| Conflicto de numeración ADR | Sí | — |
| Paridad bilingüe rota | Sí | — |
| Corrección de typo único | No | PR directamente a `main` si es crítico |
| Nueva sección de documentación | No | `feature/docs-*` a `develop` |

### Flujo de Trabajo Hotfix

```
Issue reportado: "Links rotos en ADR-0050"
  │
  ├─► Rama desde main: hotfix/docs-fix-adr-0050-links
  │
  ├─► Corregir: Actualizar links, corregir problemas de paridad ES
  │
  ├─► PR: hotfix/docs-fix-adr-0050-links → main
  │
  ├─► CI: validate-docs.mjs, check-bilingual-parity.mjs
  │
  ├─► Aprobación: 1 requerida (con justificación)
  │
  ├─► Merge: Squash into main
  │
  ├─► Tag: docs-v1.2.1 (incremento patch)
  │
  └─► Merge: hotfix branch → develop (automático via GitFlow)
```

### Justificación de Hotfix Requerida
Descripción del PR debe incluir:
```markdown
## Hotfix Justification

**Issue**: [Brief description of the problem]
**Impact**: [Who is affected and how]
**Why bypass normal workflow**: [Emergency rationale]
**Prevention**: [How to prevent this in the future]
```

### SLA de Hotfix
- Hotfix PRs deben ser revisados dentro de 4 horas de envío
- Hotfixes no deben quedarse abiertos más de 24 horas

---

## 9. Alineación de Documentación entre Evolith y UMS

### Elementos Alineados

| Elemento | Evolith Arch32 | UMS |
|---------|----------------|-----|
| Modelo GitFlow | [CHECKMARK] Mismo | [CHECKMARK] Mismo |
| Formato de Tag de Versión | `docs-vX.Y.Z` | `docs-vX.Y.Z` |
| Archivo de Log de Versión | `DOCUMENTATION_VERSIONS.md` | `DOCUMENTATION_VERSIONS.md` |
| Scripts de Validación CI | `.harness/scripts/ci/01-validate-docs.mjs` | Heredado vía child-repository |
| Verificación de Paridad Bilingüe | `.harness/scripts/ci/04-check-bilingual-parity.mjs` | Heredado |
| Template de PR | `.github/PULL_REQUEST_TEMPLATE/docs-template.md` | Heredado |
| Verificaciones Requeridas | Mismo | Mismo |
| Requisitos de Aprobación | Mismo | Mismo |

### Alineación vía Herencia
UMS (como repositorio hijo per ADR-0025 y child-repository-inheritance-guide) hereda:
1. `.github/workflows/docs.yml` — Pipeline CI
2. `.github/PULL_REQUEST_TEMPLATE/` — Templates de PR
3. `.harness/scripts/` — Herramientas de validación
4. Este ADR (como copia local en `reference/core/architecture/adrs/`)

### Sincronización de Versiones
- Cuando Evolith lanza `docs-v1.3.0`, UMS debe sincronizar dentro de 2 semanas
- El lead de documentación de UMS es responsable de sincronizar cambios de Evolith
- UMS puede tener sufijo `docs-v1.3.0-UMS-extensions` para docs específicos de UMS más allá del alcance de Evolith

### Resolución de Conflictos
- Si UMS necesita cambios de documentación no en Evolith, proponer como ADR en Evolith primero
- Si Evolith rechaza la propuesta, UMS puede mantener delta en subdirectorio `ums-specific/`
- La documentación específica de UMS debe seguir siendo GitFlow y reglas de paridad bilingüe

---

## 10. Obligatorio vs. Adaptado por Repositorio

### Decisión: **Obligatorio con Adaptación por Madurez**

| Repositorio | Modelo GitFlow | Adaptación Permitida |
|-------------|---------------|---------------------|
| **Evolith Arch32** (referencia corporativa) | GitFlow Completo | Ninguna — esta es la fuente de verdad |
| **UMS** (producto aplicado) | GitFlow Completo | Menor: el cadencia de release puede diferir |
| **Futuros repositorios satélite** | GitFlow Completo | Debe seguir exactamente hasta nivel de madurez 3 |

### Reglas de Adaptación por Madurez

**Repositorios Nivel 1 (Inicial)**:
- Puede omitir rama `develop` si solo una persona contribuye
- Debe seguir usando `main` para producción
- Debe seguir usando `feature/docs-*` para nuevo contenido
- Hotfix sigue siendo requerido

**Repositorios Nivel 2 (En Crecimiento)**:
- Debe usar rama `develop`
- Debe tener al menos 1 aprobación
- Verificaciones de CI siguen siendo obligatorias

**Repositorios Nivel 3 (Maduro)**:
- GitFlow completo requerido
- Todos los quality gates activos
- Sincronización con Evolith requerida

---

## 11. Reglas de Protección de Rama

### Protección de `main`
```
 Require pull request reviews before merging
  - Required reviewers: 2
  - Dismiss stale reviews: yes
  - Require review from code owners: yes

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required
  - docs-release.yml: required

 Require branches to be up to date before merging: yes

 Restrict who can push to main: maintainers only

 Allow force pushes: NO
```

### Protección de `develop`
```
 Require pull request reviews before merging
  - Required reviewers: 1
  - Dismiss stale reviews: yes

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required

 Require branches to be up to date before merging: yes

 Allow force pushes: NO (except for rebasing feature branches)
```

### Protección de `release/docs-*`
```
 Require pull request reviews before merging
  - Required reviewers: 2
  - One must be senior technical writer or architect

 Require status checks to pass before merging
  - All release checks required

 Require branches to be up to date before merging: yes

 Restrict who can create release branches: maintainers

 Allow force pushes: NO
```

### Protección de `hotfix/docs-*`
```
 Require pull request reviews before merging
  - Required reviewers: 1
  - Must include hotfix justification

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required

 Allow force pushes: NO
```

---

## 12. Integración con Pipeline QA de Documentación

### GitHub Actions Workflow: `.github/workflows/docs.yml`

```yaml
name: Documentation CI

on:
  push:
    branches: [main, develop, 'release/docs-*']
  pull_request:
    branches: [main, develop, 'release/docs-*', 'hotfix/docs-*']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Validate Documentation
        run: node .harness/scripts/ci/01-validate-docs.mjs
        
      - name: Check Bilingual Parity
        run: node .harness/scripts/ci/04-check-bilingual-parity.mjs
        
      - name: Bilingual Coverage
        if: github.ref == 'refs/heads/develop'
        run: node .harness/scripts/bilingual-coverage.mjs

  release-check:
    if: github.ref == 'refs/heads/main'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Verify Version Log Update
        run: node .harness/scripts/verify-version-log.mjs
        
      - name: Verify Git Tag
        run: node .harness/scripts/verify-git-tag.mjs
```

### Scripts Requeridos en Pipeline QA

| Script | Propósito | Falla Build Si |
|--------|-----------|----------------|
| `validate-docs.mjs` | Links, anchors, encoding, Mermaid | Cualquier elemento roto |
| `check-bilingual-parity.mjs` | Estructura de headers EN/ES coincide | Cuenta de headers no coincide |
| `bilingual-coverage.mjs` | Reporte de cobertura | Cobertura cae > 5% |
| `doc-complexity-score.mjs` | Tendencia de complejidad | Complejidad cae > 10% |
| `bilingual-cross-ref.mjs` | Reciprocidad de links | Links EN↔ES rotos |
| `verify-version-log.mjs` | Log de versiones actualizado | Entrada faltante para release |
| `verify-git-tag.mjs` | Formato de tag correcto | Formato de tag inválido |

---

## Consecuencias

### Positivas
- Los lanzamientos de documentación se vuelven predecibles y rastreables
- Las correcciones críticas pueden ser aceleradas sin bloquear trabajo de features
- La paridad bilingüe es estructuralmente reforzada a través de CI
- El historial de versiones siempre está alineado con Git tags
- Evolith y UMS se mantienen sincronizados

### Negativas
- Sobrecarga adicional de gestión de ramas
- Requiere disciplina para seguir el flujo de trabajo de hotfix
- El pipeline de CI toma más tiempo en ejecutar todas las verificaciones

### Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Hotfix omite verificación bilingüe | CI aún corre en hotfix PR, no puede ser omitido |
| Log de versiones olvidado | Automatizado en CI, no puede hacer merge sin él |
| Conflictos de numeración ADR | `adr-number-check` en CI bloquea merge |
| Release branch vive demasiado | Máximo 2 semanas, abandonado si se excede |

---

## Referencias

- [ADR-0050: Estrategia de Branching Gitflow](./0050-gitflow-branching-strategy.es.md)
- [Mejores Prácticas de Documentación SDLC](../../../sdlc/03-documentation/sdlc-documentation-best-practices.es.md)
- [Guía de Herencia de Repositorios Hijos](../../../foundations/inheritance-model/child-repository-inheritance-guide.es.md)
- [Glosario de Terminología Bilingüe](../../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

---

## Glosario

| Término | Definición |
|---------|------------|
| **Feature Freeze** | Punto después del cual no nuevo contenido puede ser agregado a una release branch |
| **Patch Release** | Release solo de corrección de bugs (incremento X.Y.Z) |
| **Minor Release** | Release de adición de nuevo contenido (incremento X.Y.0) |
| **Major Release** | Release de cambio estructural rompe compatibilidad (incremento X.0.0) |
| **Paridad Bilingüe** | Archivos EN y ES tienen cuentas de headers ## y ### idénticas |





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde evolith Arch32 y UMS ambas producen documentación técnica bilingüe (EN/ES), estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** GitFlow de Lanzamiento de Documentación
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0050: Estrategia de Branching Gitflow](./0050-gitflow-branching-strategy.es.md)
- [Mejores Prácticas de Documentación SDLC](../../../sdlc/03-documentation/sdlc-documentation-best-practices.es.md)
- [Guía de Herencia de Repositorios Hijos](../../../foundations/inheritance-model/child-repository-inheritance-guide.es.md)
- [Glosario de Terminología Bilingüe](../../../../../.harness/scripts/bilingual-terminology-glossary.es.md)

---
[Volver al Índice](./README.es.md)
> **Agent Signature:** Architect Agent
