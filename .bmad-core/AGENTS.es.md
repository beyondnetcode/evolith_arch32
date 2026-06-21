# Agentes BMAD — Coordinación de Evolith Core

> **Navegación Bilingüe:** [English Version](./AGENTS.md)

**Propósito:** Documento maestro de coordinación para los agentes del método BMAD que operan en el repositorio de referencia Evolith Core. Cada agente **debe** leer este archivo primero para comprender el contexto del repositorio, la gobernanza de gaps, el pipeline de madurez de topologías y los protocolos de traspaso entre agentes.

---

## 1. Contexto del Repositorio

Evolith Core es una **referencia corporativa de arquitectura progresiva**, no un código base de un solo producto. Áreas clave:

| Área | Ruta | Descripción |
|------|------|-------------|
| Referencia Arquitectónica | `reference/architecture/` | Topologías, ADRs, patrones |
| Estándares de Gobernanza | `reference/governance/standards/` | Seguimiento de gaps, madurez de topologías, reglas |
| Harness de Validación | `.harness/scripts/` | Scripts CI, validadores, herramientas de cobertura |
| Núcleo de Agentes | `.bmad-core/` | Definiciones de agentes BMAD, flujos, herramientas |

**Restricción crítica:** Este es un repositorio de **gobernanza y documentación**, no un código base de aplicación. Los entregables principales son documentos de estándares, ADRs, manifiestos de topología, contratos ejecutables (`.rules.json`, `.rego`) y scripts de validación.

---

## 2. Ciclo de Vida de Gaps de Gobernanza (`GT-*`)

Los gaps se rastrean en tres archivos canónicos:

| Archivo | Propósito |
|---------|-----------|
| `reference/governance/standards/vision/gap-tracking.md` | Tabla única — estado, criticidad, complejidad |
| `reference/governance/standards/vision/gap-reference-catalog.md` | Definiciones detalladas — propósito, evidencia, criterios de cierre |
| `reference/governance/standards/vision/gap-closure-evidence.json` | Registros de cierre legibles por máquina con SHA de commit, evidencia fechada |

### Ciclo de Vida de Gap de Gobernanza

Cada gap `GT-*` sigue un ciclo de vida de cuatro etapas:

```
candidate → evaluated → accepted → executable
```

| Etapa | Gate | Agente Propietario |
|-------|------|-------------------|
| **candidate** | Declaración del problema y evidencia documentadas en el catálogo | Analyst |
| **evaluated** | Criterios de cierre definidos, complejidad asignada, alcance Native/OPA evaluado | Architect |
| **accepted** | Priorizado, programado, asignado a un sprint | PM + SM |
| **executable** | Todos los criterios de cierre satisfechos, evidencia de cierre registrada | Dev + QA + DevOps |

### Paridad de Motor Dual (R-25)

Cada regla arquitectónica añadida o modificada **debe** tener:
1. Regla nativa del evaluador TypeScript (`.rules.json` o equivalente)
2. Política OPA `.rego` con el mismo ID de regla

El escáner de cobertura (`generate-rule-coverage.mjs`) reporta la desviación entre motores.

### Registro de Cierre de Gap (R-26)

Un gap está `COMPLETADO` solo cuando:
- Todos los criterios de cierre están satisfechos
- El registro de cierre en `gap-closure-evidence.json` tiene un SHA de commit real
- Artefactos de evidencia fechados
- Comandos de validación reproducibles
- Disposición explícita de dependencias

---

## 3. Pipeline de Madurez de Topologías

```
draft → candidate → accepted
```

Las topologías aceptadas deben proporcionar (R-27):
- Guía bilingüe de adopción/operaciones/evolución
- ADRs aceptados
- Conjunto de reglas nativas + artefactos de políticas OPA
- Exposición de plano de control compartido
- Pruebas reproducibles con madurez de línea base de Monolito Modular

---

## 4. Protocolo de Traspaso de Agentes

### Orden de Invocación

Para trabajo de gaps de gobernanza:

```
Analyst → PM → Architect → SM → Dev → QA → DevOps
                      ↓
                   Docs (paralelo, todas las etapas)
```

### Agentes Transversales

| Agente | Participa En | Rol |
|--------|-------------|-----|
| **Docs** | Todas las etapas | Gate de paridad bilingüe, orquestación de releases |
| **QA** | Etapa executable | Gate diferencial OPA, validación |
| **DevOps** | Etapa executable | Pipeline CI, paneles de cobertura |

### Artefactos Requeridos por Etapa

| Etapa | Artefacto de Entrada | Artefacto de Salida |
|-------|---------------------|---------------------|
| candidate | Solicitud de usuario | Entrada en `gap-reference-catalog.md` |
| evaluated | Entrada del catálogo | Evaluación de complejidad, límite de alcance |
| accepted | Entrada evaluada | Elemento del backlog, asignación de prioridad |
| executable | Elemento del backlog | Evidencia de cierre, SHA de commit, validación exitosa |

---

## 5. Gaps Activos (Pendientes)

| ID | Título | Complejidad | Agente Líder |
|----|--------|-------------|--------------|
| GT-152 | Contrato de Conocimiento Externo y Esquema de Registro Fuente | S | Architect |
| GT-153 | Gobierno del Ciclo de Vida del Conocimiento por Winston | M | Architect |
| GT-154 | Proyección RAG y Paridad Native/OPA para Conocimiento Externo | M | QA + DevOps |

Los tres son P0. Orden de implementación: GT-152 → GT-153 → GT-154.

---

## 6. Inventario Completo de Scripts

Todos los scripts viven en `.harness/scripts/`. Cada agente debe conocer el inventario completo para auto-mejorarse.

### 6.1 Pipeline CI (numerados, subdirectorio `ci/`)

| Script | Propósito | Valida/Aplica |
|--------|-----------|--------------|
| `ci/01-validate-docs.mjs` | Validación completa de docs (enlaces, anclajes, Mermaid, UTF-8, CRLF, emojis) | Enlaces internos resuelven, anclajes existen, Mermaid válido, UTF-8 limpio, sin CRLF, sin emojis |
| `ci/02-optimize-repo.mjs` | Limpieza — elimina archivos raíz no autorizados | Cumplimiento de lista blanca raíz |
| `ci/03-validate-root-cleanliness.mjs` | Gate de lista blanca de directorio raíz | Solo archivos permitidos en raíz; niega `topologies/` |
| `ci/04-check-bilingual-parity.mjs` | Paridad estructural pares EN/ES | Cada `.es.md` tiene mismo conteo de `##`/`###` que `.md` |
| `ci/05-check-orphan-bilingual.mjs` | Archivos EN sin contraparte ES | Cada `.md` en `reference/` debe tener `.es.md` hermano |
| `ci/06-impact-analysis-synchronizer.mjs` | Detección de cambios + sincronización cruzada | Clasifica archivos en 8 categorías; sincroniza zonas impactadas |
| `ci/07-generate-inventories.mjs` | Genera `inventory-summary.md` EN/ES | Conteos de ADR/ruleset/esquemas |
| `ci/08-validate-tracking.mjs` | Valida tablas gap-tracking, estados, evidencia de cierre | Consistencia filas EN/ES; gaps DONE deben tener registros de cierre |
| `ci/09-reconcile-maturity.mjs` | Reconciliación de evidencia de madurez vs tablero de gaps | Checks PASS/BLOCKED/RESOLVED; BLOCKED debe mapear a gap abierto |
| `ci/10-validate-contract-conformance.mjs` | Valida evolith-machine-contracts.json + conformidad consumidor | SemVer contrato, hashes SHA256, coincidencia productor |
| `ci/11-validate-product-docs.mjs` | Valida READMEs de productos enviados por deriva/placeholders | Sin TBD, placeholders, versiones beta obsoletas |
| `ci/12-validate-bmad-signatures.mjs` | Valida firmas de agente BMAD en ADRs core | Cada ADR debe tener Firma del Agente |
| `ci/13-agentic-code-review.mjs` | Revisión de código agéntica vía MCP | Redacta diff, invoca LLM, valida resultado estructurado |
| `ci/14-rag-index-sync.mjs` | Sincronización delta de índice de conocimiento RAG | Detecta archivos `.md` cambiados, fragmenta en H2, embedding + upsert |
| `ci/15-operational-drift-audit.mjs` | Escanea scripts CI y manifiestos de topología por falso éxito, llamadas no acotadas | Detección DRIFT-FALSE-SUCCESS, DRIFT-UNBOUNDED-CALL |
| `ci/15-validate-topology-rule-coverage.mjs` | Gate ligero para cobertura de reglas Native/OPA | Delega a `generate-rule-coverage.mjs` |
| `ci/16-opa-parity-gate.mjs` | Gate de paridad semántica Native/OPA completo con WASM | Evalúa WASM vs fixtures Native; falla en deriva |
| `ci/16-test-topology-opa.mjs` | Ejecuta `.test.rego` OPA para cada topología aceptada | Cada topología debe tener `.test.rego`; suite no vacía |
| `ci/17-validate-knowledge-intake.mjs` | Valida candidatos KI-*.yaml contra esquema + políticas OPA | Parseo YAML, JSON Schema, ejecución política OPA |

### 6.2 Módulos Compartidos CI (`ci/` — reutilizables por todos los scripts)

| Módulo | Exporta |
|--------|---------|
| `ci/parity-gate.mjs` | `diffDecisions`, `parityReport`, `scopeTopologies` |
| `ci/opa-eval.mjs` | `evaluateWasm`, `normalizeOpaDecisions` |
| `ci/review-input.mjs` | `redactSecrets`, `budgetAndChunk`, `prepareReviewInput` |
| `ci/review-result.mjs` | `parseProviderResponse`, `validateReviewResult` |
| `ci/review-provider.mjs` | `createReviewProvider`, `registerAdapter` |
| `ci/rag-sync.mjs` | `chunkMarkdown`, `syncIndex` |
| `ci/rag-port.mjs` | `createRagAdapter`, `hashEmbed` |
| `ci/drift-audit.mjs` | `auditSource`, `auditTopology`, `summarize` |

### 6.3 Scripts Independientes (raíz `.harness/scripts/`)

| Script | Propósito |
|--------|-----------|
| `validate-topology-manifests.mjs` | Valida manifiestos de topología contra esquema JSON + existencia de artefactos |
| `doc-health-trend.mjs` | Rastrea métricas de salud de docs (cobertura, complejidad, completitud) |
| `bilingual-reciprocity.mjs` | Valida que enlaces ES apunten a contrapartes ES y viceversa |
| `adr-lifecycle.mjs` | CLI de ciclo de vida ADR — proponer/aceptar/deprecar/superseder/retirar |
| `mcp-smoke.mjs` | Prueba de humo MCP — envía solicitudes JSON-RPC, escribe evidencia |
| `sync-project-board.mjs` | Sincronización bidireccional entre gap-tracking.md y GitHub Project |
| `bilingual-cross-ref.mjs` | Valida anclajes de enlaces internos en todos los archivos reference/ |
| `bilingual-terminology-lint.mjs` | Marca archivos ES por uso estandarizado de terminología |
| `generate-rule-coverage.mjs` | Reporte de cobertura Native/OPA dirigido por manifiestos |
| `adr-promotion-push.mjs` | Promueve ADR desde repo de producto a repo corporativo |
| `translation-memory.mjs` | Aprende pares de frases EN/ES de archivos bilingües |
| `ci-runner.mjs` | Ejecuta todos los scripts CI numerados en secuencia, falla rápido |
| `bilingual-diff.mjs` | Compara cambios estructurales EN/ES necesarios |
| `generate-es-skeleton.mjs` | Crea esqueleto `.es.md` desde archivo EN (estructura de encabezados) |
| `satellite-sync.mjs` | Sincroniza estándares corporativos entre repos satélite |
| `generate-bilingual-index.mjs` | Genera autoíndice de pares EN/ES por directorio |
| `verify-version-log.mjs` | Verifica entrada de DOCUMENTATION_VERSIONS.md para releases de docs |
| `update-version-log.mjs` | Agrega nueva entrada a DOCUMENTATION_VERSIONS.md |
| `verify-git-tag.mjs` | Verifica que tag docs-v* exista en HEAD |
| `bilingual-coverage.mjs` | Reporta estadísticas de cobertura bilingüe |
| `generate-product-inventory.mjs` | Genera inventario de superficie de producto desde fuentes CLI |
| `doc-complexity-score.mjs` | Mide métricas de complejidad de docs para todos los archivos reference/ |
| `validate-rulesets.mjs` | Valida 5 conjuntos de reglas de gobernanza (CLI, paridad, evidencia, MCP, observabilidad) |
| `md-table-formatter.mjs` | Formatea tablas markdown con pipes alineados |
| `coverage-dashboard.mjs` | Genera reporte visual HTML/MD de cobertura por área |
| `compile-opa-wasm.mjs` | Descarga binario OPA fijado + compila `.rego` a `.wasm` |
| `opa-runtime.mjs` | Asegura que el binario OPA fijado esté disponible |
| `run-wilson-audit.mjs` | Imprime el prompt de auditoría de Wilson (Arquitecto Principal) |

### 6.4 Mapa de Scripts por Agente

| Agente | Scripts Principales |
|--------|--------------------|
| Analyst | `generate-es-skeleton.mjs`, `ci/01-validate-docs.mjs` |
| PM | `ci/04-check-bilingual-parity.mjs`, `bilingual-coverage.mjs`, `generate-es-skeleton.mjs` |
| Architect | `adr-lifecycle.mjs`, `generate-rule-coverage.mjs`, `ci/15-validate-topology-rule-coverage.mjs`, `validate-topology-manifests.mjs` |
| SM | `doc-health-trend.mjs`, `update-version-log.mjs`, `bilingual-coverage.mjs`, `ci/08-validate-tracking.mjs` |
| Dev | `ci/01-validate-docs.mjs`, `generate-es-skeleton.mjs`, `ci/04-check-bilingual-parity.mjs`, `compile-opa-wasm.mjs`, `generate-rule-coverage.mjs` |
| QA | `ci/04-check-bilingual-parity.mjs`, `ci/01-validate-docs.mjs --render-mermaid`, `bilingual-cross-ref.mjs`, `ci/16-opa-parity-gate.mjs`, `ci/16-test-topology-opa.mjs`, `bilingual-terminology-lint.mjs`, `bilingual-reciprocity.mjs` |
| DevOps | `satellite-sync.mjs`, `coverage-dashboard.mjs`, `verify-version-log.mjs`, `verify-git-tag.mjs`, `adr-promotion-push.mjs`, `ci-runner.mjs`, `ci/02-optimize-repo.mjs`, `ci/03-validate-root-cleanliness.mjs`, `sync-project-board.mjs`, `compile-opa-wasm.mjs` |
| Docs | `adr-lifecycle.mjs`, `update-version-log.mjs`, `doc-health-trend.mjs`, `bilingual-cross-ref.mjs`, `ci/07-generate-inventories.mjs`, `md-table-formatter.mjs`, `generate-bilingual-index.mjs`, `doc-complexity-score.mjs`, `validate-rulesets.mjs` |

---

## 7. Gates de Validación

Cada cambio en Evolith Core debe pasar estos gates antes de fusionar:

```bash
# 1. Validación completa de documentación
node .harness/scripts/ci/01-validate-docs.mjs

# 2. Paridad estructural bilingüe
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# 3. Reporte de cobertura bilingüe
node .harness/scripts/bilingual-coverage.mjs

# 4. Cobertura de reglas de topología (cuando cambian artefactos de topología)
node .harness/scripts/ci/15-validate-topology-rule-coverage.mjs

# 5. Limpieza de codificación UTF-8 (cuando se encuentran problemas de codificación)
python .bmad-core/scripts/cleanup_markdown_encoding.py

# 6. Gate de paridad OPA (cuando cambian artefactos Native/OPA)
node .harness/scripts/ci/16-opa-parity-gate.mjs

# 7. Validación de seguimiento de gaps (cuando cambia estado de gap)
node .harness/scripts/ci/08-validate-tracking.mjs
```

---

## 8. Mandato de Auto-Mejora y Optimización Proactiva

Cada agente BMAD tiene el **deber de mejorar el sistema**. Esto no es opcional.

### 8.1 Detección — Cuándo Proponer Mejoras

Vigilar proactivamente estas señales:

| Señal | Acción |
|-------|--------|
| Un script produce una advertencia que puedes silenciar | Agregar flag `--quiet` o `--suppress`, abrir PR |
| Dos scripts hacen trabajo superpuesto | Proponer fusionarlos en un módulo compartido |
| A un script le falta `--help` o no tiene archivo de prueba | Agregar `--help` y/o crear `*.test.mjs` |
| Un script CI numerado no está conectado a ningún workflow | Escribir la entrada `.github/workflows/` o agregar exención documentada |
| Una regla global no tiene script de validación correspondiente | Crear el script y conectarlo a la regla |
| Un gap podría cerrarse más rápido con un nuevo script | Proponer el script como parte de la implementación del gap |
| Un patrón se repite en 3+ definiciones de agente | Extraer a una sección compartida o include de `.bmad-core/` |
| Un script sale con códigos inconsistentes | Estandarizar: `0`=éxito, `1`=fallo, `2`=argumentos inválidos |

### 8.2 Creación — Cómo Construir Mejoras

1. **Crear script** en la ubicación apropiada:
   - Gate CI numerado: `.harness/scripts/ci/<NN>-<propósito>.mjs`
   - Utilidad independiente: `.harness/scripts/<propósito>.mjs`
   - Archivo de prueba: `.harness/scripts/<nombre>.test.mjs`
   - Workflow: `.github/workflows/<nombre>.yml`

2. **Seguir el patrón** de los scripts existentes:
   - Agregar constante `SCRIPT_VERSION` al inicio
   - Aceptar `--help` / `-h`
   - Salir con `0` en éxito, `1` en fallo
   - Registrar claramente qué pasó/falló

3. **Registrar la mejora**:
   - Actualizar `AGENTS.md` sección 6 (Inventario de Scripts) con nueva entrada
   - Actualizar el mapa de scripts de tu agente
   - Si es nueva regla: actualizar `global-rules.md`, implementar Native + OPA (R-25)

4. **Bilingüe por defecto**: Los nuevos scripts deben tener salida EN; si son docs para usuario, crear contraparte ES.

### 8.3 Formato de Propuesta

Al proponer un nuevo script, regla u optimización, documentar:

```markdown
## Propuesta: <Título>
**Agente:** <Tu Nombre>
**Disparador:** <Qué señal lo activó>
**Alcance:** <Script / Regla / Workflow / Definición de agente>
**Justificación:** <Por qué es importante>
**Implementación:** <Enfoque técnico breve>
**Validación:** <Cómo verificar que funciona>
```

Archivar la propuesta en `.bmad-core/proposals/` (crear directorio si es necesario).

---

*Véase [Reglas Globales](../.harness/rules/global-rules.md) para directivas vinculantes.*
*Véase [Tablero de Seguimiento de Gaps](../reference/governance/standards/vision/gap-tracking.es.md) para estado actual.*
*Véase [Catálogo de Referencia de Gaps](../reference/governance/standards/vision/gap-reference-catalog.es.md) para definiciones de gaps.*
*Véase [.harness/scripts/](../.harness/scripts/) para todos los scripts disponibles.*
