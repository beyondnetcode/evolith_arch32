# Taxonomia de Scripts Evolith

> **Navegación bilingüe:** [English version](./scripts-taxonomy.md)

**Estado:** Documento de referencia activo  
**Responsable:** Evolith Architecture Board  
**Última actualización:** 2026-07-03

---

## 1. Propósito

Este documento cataloga todos los scripts ejecutables del árbol `.harness/`, clasifica su tipo de salida y documenta la relación entre puntos de entrada, playbooks y hooks de CI. Es la referencia canónica para "¿qué script ejecuto y para qué?".

---

## 2. Clasificación

Cada script se clasifica por:

| Atributo | Valores |
|---|---|
| **Tipo** | `executable` — produce salida directamente (reporte estructurado, HTML, SVG); `prompt` — imprime un prompt de LLM para una persona (Winston, etc.) |
| **Alcance** | `entry` — punto de entrada de cara al usuario; `playbook` — motor reutilizable invocado por los puntos de entrada; `ci` — se ejecuta en hooks de pre-commit/pre-push; `utility` — auxiliar/de un solo uso |
| **Salida** | JSON, Markdown, HTML, SVG, texto plano o bloque de prompt |

---

## 3. Puntos de entrada

Puntos de entrada de cara al usuario bajo `.harness/scripts/`. Son los scripts que se ejecutan desde la línea de comandos.

| Script | Tipo | Delega en | Propósito |
|---|---|---|---|
| `run-evolith-audit.mjs` | `prompt` | `.harness/playbooks/winston-audit-playbook.md` | Imprime el prompt de auditoría arquitectónica de Winston para copiarlo y pegarlo en el contexto de un LLM |
| `run-evolith-audit.mjs --bmad` | `prompt` | mismo playbook (sección BMAD) | Imprime el prompt de BMAD Agent Evolution |
| `run-evolith-audit.mjs --all` | `prompt` | mismo playbook (ambas secciones) | Imprime ambos prompts de forma secuencial |
| `run-evolith-audit.mjs --es` | `prompt` | `.harness/playbooks/winston-audit-playbook.es.md` | Versión en español del prompt de auditoría arquitectónica |
| `run-evolith-topology.mjs` | `executable` | `.harness/playbooks/topology-compliance-audit.mjs` | Evalúa la paridad estructural de todos los directorios de topología contra el ejemplar |
| `run-evolith-topology.mjs --markdown` | `executable` | mismo playbook | La misma auditoría, formateada como Markdown legible por humanos |
| `run-evolith-deep.mjs` | `executable` | `.harness/playbooks/sdlc-deep-audit.mjs` | Evalúa Evolith Core contra la visión de SDLC ejecutable de 8 dimensiones (JSON) |
| `run-evolith-deep.mjs --markdown` | `executable` | mismo playbook | La misma auditoría de 8 dimensiones, formateada como reporte Markdown |
| `skills/self-improving-loop.mjs` | `executable` | `.harness/playbooks/self-improving-loop.es.md` | Emite un snapshot de progress-audit para ejecuciones de mejora continua del harness |
| `run-winston-audit.mjs` | `alias` | delega en los tres anteriores | OBSOLETO — alias de compatibilidad que detecta `--topology`, `--deep`, o cae por defecto en `run-evolith-audit.mjs` |

### Ejemplos de uso

```bash
node .harness/scripts/run-evolith-topology.mjs
node .harness/scripts/run-evolith-topology.mjs --markdown
node .harness/scripts/run-evolith-deep.mjs
node .harness/scripts/run-evolith-deep.mjs --markdown
node .harness/scripts/run-evolith-audit.mjs
node .harness/scripts/run-evolith-audit.mjs --es
node .harness/scripts/run-evolith-audit.mjs --bmad
node .harness/scripts/run-evolith-audit.mjs --all
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --dry-run
```

---

## 4. Playbooks

Lógica de auditoría reutilizable bajo `.harness/playbooks/`. Los invocan los puntos de entrada, nunca los usuarios de forma directa.

| Playbook | Salida | Usado por | Propósito |
|---|---|---|---|
| `topology-compliance-audit.mjs` | JSON / Markdown | `run-evolith-topology.mjs` | Revisa cada directorio de topología en busca de paridad estructural con el ejemplar agentic-ai |
| `sdlc-deep-audit.mjs` | JSON / Markdown | `run-evolith-deep.mjs` | Evaluación de 8 dimensiones de Evolith Core contra la visión de SDLC ejecutable |
| `winston-audit-playbook.md` | Bloque de prompt para LLM | `run-evolith-audit.mjs` | El prompt de la persona Winston para análisis arquitectónico |
| `winston-audit-playbook.es.md` | Bloque de prompt para LLM | `run-evolith-audit.mjs --es` | Versión en español del prompt de análisis arquitectónico de Winston |
| `self-improving-loop.es.md` | Markdown / referencia de schema JSONL | `skills/self-improving-loop.mjs` | Bucle operativo de retroalimentación detectar-contexto-ejecutar-validar-registrar-aprender |

---

## 5. Hooks de CI

Scripts disparados automáticamente por los hooks de git. No son de cara al usuario.

| Hook | Script | Qué hace |
|---|---|---|
| `.husky/pre-commit` | `generate-executive-summary.mjs` | Refresca el resumen ejecutivo de gobernanza EN/ES a partir de la evidencia canónica de gaps y madurez |
| `.husky/pre-commit` | `ci-runner.mjs` | Ejecuta los scripts numerados de validación de CI (validación de documentación, paridad bilingüe, control de resumen obsoleto) |
| `.husky/pre-push` | `02-optimize-repo.mjs` | Optimización del repositorio |
| `.husky/pre-push` | `sync-project-board.mjs` | Sincronización bidireccional del seguimiento de gaps |
| `.husky/pre-push` | `generate-executive-summary.mjs` | Bloquea el push si el resumen ejecutivo cambió fuera del commit actual |

---

## 6. Scripts de validación de CI

Scripts numerados bajo `.harness/scripts/ci/` disparados por `ci-runner.mjs`.

| Script | Qué verifica |
|---|---|
| `01-validate-docs.mjs` | Enlaces, anclas, codificación, sintaxis de Mermaid |
| `01-validate-docs.mjs --render-mermaid` | Renderiza los diagramas Mermaid a SVG para validación visual |
| `04-check-bilingual-parity.mjs` | Que los pares EN/ES tengan el mismo número de encabezados `##` y `###` |

---

## 7. Scripts utilitarios / de un solo uso

| Script | Propósito |
|---|---|
| `bilingual-coverage.mjs` | Reporta qué archivos carecen de contraparte bilingüe |
| `coverage-dashboard.mjs` | Genera un reporte visual de cobertura en HTML/MD por área |
| `generate-executive-summary.mjs` | Genera el resumen ejecutivo bilingüe de gobernanza |
| `generate-es-skeleton.mjs <file.md>` | Crea el esqueleto ES a partir del archivo EN (con opción `--dry-run`) |
| `cleanup-markdown-encoding.py` | Sanea problemas de codificación UTF-8 en archivos Markdown |
| `skills/self-improving-loop.mjs` | Emite un registro JSON de progress-audit y puede anexar eventos JSONL aprobados |

---

## 8. Reglas de diseño

### Reglas de los puntos de entrada

1. **Patrón de nombre**: `run-evolith-<purpose>.mjs`, donde `<purpose>` es un sustantivo simple o un compuesto corto (`topology`, `deep`, `audit`).
2. **Responsabilidad única**: Cada punto de entrada hace una sola cosa. Si un script admite varios modos mediante `--flags`, hay que extraer cada modo a su propio punto de entrada cuando la lógica diverja de forma significativa.
3. **Ciclo de vida de los alias**: Los alias obsoletos (`run-winston-audit.mjs`) emiten una advertencia por stderr y delegan. Se eliminan tras una versión menor.

### Reglas de los playbooks

1. **Patrón de nombre**: `<domain>-<action>.mjs` (por ejemplo, `topology-compliance-audit.mjs`).
2. **Idempotencia**: La misma entrada siempre produce la misma salida.
3. **Bandera de Markdown**: Si el playbook admite salida en JSON y en Markdown, se usa `--markdown` para alternar.

### Reglas de los hooks de CI

1. **Salida rápida**: Los scripts de CI deben completarse en menos de 5 segundos o delegar en trabajos en segundo plano.
2. **Advertencias no bloqueantes**: Los hallazgos no críticos deben advertir, no fallar.
