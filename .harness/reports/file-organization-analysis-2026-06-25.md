# Análisis de Organización de Archivos — Evolith Core

**Fecha:** 2026-06-25
**Alcance:** Estructura de directorios raíz y posibilidades de agrupación

---

## 1. Estado Actual

### 1.1 Carpetas en Raíz (17 total)

| Carpeta | Propósito | ¿Requiere raíz? | ¿Moverse? |
|---------|-----------|------------------|-----------|
| `.bmad-core/` | Agentes BMAD | Sí (convención) | No |
| `.claude/` | Claude Code config | Sí (runtime) | No |
| `.git/` | Git interno | Sí (obligatorio) | No |
| `.github/` | GitHub Actions | Sí (runtime) | No |
| `.harness/` | Harness Evolith | Sí (convención) | No |
| `.husky/` | Git hooks | Sí (runtime) | No |
| `.mimocode/` | MiMoCode config | Sí (runtime) | No |
| `.vscode/` | VS Code config | Sí (runtime) | No |
| `apps/` | Aplicaciones (workspace) | Sí (npm workspaces) | No |
| `examples/` | Ejemplos de referencia | **No** | **Sí** |
| `node_modules/` | Dependencias npm | Sí (obligatorio) | No |
| `packages/` | Paquetes (workspace) | Sí (npm workspaces) | No |
| `reference/` | Corpus documental | Sí (taxonomía) | No |
| `rulesets/` | Reglas ejecutables | Sí (taxonomía) | No |
| `sdk/` | CLI/MCP tooling | Sí (taxonomía) | No |
| `tests/` | Tests de contrato | **No** | **Sí** |

### 1.2 Archivos en Raíz (21 total)

| Archivo | ¿Requiere raíz? | ¿Moverse? |
|---------|------------------|-----------|
| `package.json` | Sí (npm) | No |
| `package-lock.json` | Sí (npm) | No |
| `.gitignore` | Sí (git) | No |
| `.editorconfig` | Sí (editores) | No |
| `.markdownlint.json` | Sí (markdownlint) | No |
| `.release-please-manifest.json` | Sí (release-please) | No |
| `release-please-config.json` | Sí (release-please) | No |
| `.env` | Sí (dotenv) | No |
| `README.md` / `.es.md` | Sí (convención) | No |
| `MASTER_INDEX.md` / `.es.md` | Sí (navegación) | No |
| `AGENTS.md` / `.es.md` | Sí (agentes) | No |
| `CONTRIBUTING.md` / `.es.md` | Sí ( GitHub) | No |
| `DOCUMENTATION_VERSIONS.md` / `.es.md` | Sí (referencia) | No |
| `CHANGELOG.md` | Sí (convención) | No |
| `LICENSE` | Sí (legal) | No |
| `COVERAGE_REPORT.md` | **No** | **Sí** |

---

## 2. Agrupaciones Propuestas

### 2.1 `examples/` → `product/research/demo/examples/`

**Razón:** Los ejemplos son material de referencia, no código ejecutable. Pertenecen al corpus documental.

**Impacto:** Ninguno. No hay imports ni referencias desde código.

**Acción:**
```bash
mv examples/ product/research/demo/examples/
```

### 2.2 `tests/` → `packages/contract-tests/` o `sdk/cli/test/contract/`

**Razón:** Los tests de contrato están referenciados en `package.json`:
```json
"test:contract": "node node_modules/jest/bin/jest.js --config tests/contract/jest.config.js"
```

**Opción A:** Mover a `packages/contract-tests/` y actualizar workspace
**Opción B:** Mover a `sdk/cli/test/contract/` (ya tiene tests e2e)
**Opción C:** Dejar en raíz (menor riesgo)

**Recomendación:** Opción C — dejar en raíz. El riesgo de romper CI no justifica la reorganización.

### 2.3 `COVERAGE_REPORT.md` → `.harness/reports/`

**Razón:** Es un reporte generado, no documentación viva.

**Impacto:** Ninguno. Es un archivo estático.

**Acción:**
```bash
mv COVERAGE_REPORT.md .harness/reports/
```

### 2.4 `apps/core-api/` → Análisis

**Contenido:** API REST NestJS (BFF para Evolith Tracker)

**Pregunta:** ¿Pertenece a Evolith Core o es证据 de producto?

**Análisis:**
- `core-api` es el BFF de Evolith Tracker
- Está en `apps/` que es workspace de npm
- Podría moverse a `product/research/demo/core-api/` si solo es evidencia

**Recomendación:** Dejar en `apps/` por ahora. Si se confirma que es solo evidencia (no ejecutable en Core), mover a `product/research/demo/`.

---

## 3. Resumen de Cambios Seguros

| Cambio | Riesgo | Espacio | Beneficio |
|--------|--------|---------|-----------|
| `examples/` → `product/research/demo/examples/` | Bajo | - | Mejor taxonomía |
| `COVERAGE_REPORT.md` → `.harness/reports/` | Bajo | - | Limpieza raíz |
| `tests/` → dejar en raíz | Ninguno | - | Evitar romper CI |
| `apps/` → dejar en raíz | Ninguno | - | Mantener workspaces |

---

## 4. Convenciones Actualizadas

### 4.1 Carpetas de Herramientas (Raíz Obligatoria)

Cada herramienta de IA/IDE obtiene su propia carpeta con punto en la raiz:
- `.claude/` — Claude Code
- `.mimocode/` — MiMoCode
- `.vscode/` — VS Code
- `.github/` — GitHub Actions
- `.husky/` — Git hooks

**NO** crear carpetas de agrupacion como `.setup/` o `models/`. Los contratos de las herramientas requieren ubicacion en la raiz.

### 4.2 Documentación de Referencia

Todo material de referencia vive en `reference/`:
- `reference/core/architecture/` — ADRs, patrones, topologías
- `reference/core/sdlc/` — Politicas, estandares, SDLC
- `product/research/` — Evidencia, investigación, demos
- `product/operations/` — Guías operativas
- `product/infra/` — Configuración de plataforma

### 4.3 Código Ejecutable

El código ejecutable vive en workspaces de npm:
- `sdk/` — CLI y MCP
- `apps/` — Aplicaciones (core-api, agent-sandbox)
- `packages/` — Paquetes compartidos

---

## 5. Próximos Pasos

1. Ejecutar movimientos seguros (examples, COVERAGE_REPORT)
2. Actualizar taxonomía con convenciones de tool folders
3. Documentar decisión sobre `apps/core-api/` en ADR o gap tracking
