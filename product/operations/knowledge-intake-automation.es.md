# Automatizacion de Ingesta de Conocimiento

> **Navegacion bilingue:** [English Version](./knowledge-intake-automation.md)

**Clasificacion:** Operaciones e Infraestructura
**Estado:** Activo
**Responsable:** Plataforma y Arquitectura
**Alcance:** Pipeline automatizado para ingerir, validar, promocionar y revisar candidatos de conocimiento externo en Evolith Core.

## Proposito

Automatizar el ciclo de vida de ingesta de conocimiento desde la ingestion de candidatos hasta la promocion a estado ejecutable. El pipeline aplica validacion de esquema, cumplimiento de politicas OPA, paridad de doble motor y revisiones Winston estructuradas — todo controlado por verificaciones CI de fallo cerrado.

## Descripcion del Pipeline

El pipeline de ingesta de conocimiento opera a traves de cuatro etapas:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Ingestar KI │───▶│  Validar     │───▶│  Promocionar│───▶│  Revision    │
│ (merge PR)  │    │  (puerta CI) │    │  (manual)   │    │  Winston      │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       │                  │                   │                   │
       ▼                  ▼                   ▼                   ▼
   KI-*.yaml         Esquema + OPA      Maquina de estado   Prompt de
   SRC-*.yaml        Puerta de paridad  Transicion           revision
```

## Reglas de Transicion de Estado

Los candidatos de conocimiento siguen una maquina de estado estricta:

| Estado Actual | Transiciones Permitidas |
|--------------|------------------------|
| `candidate` | → `evaluated`, → `retired` |
| `evaluated` | → `accepted`, → `retired` |
| `accepted` | → `executable`, → `retired` |
| `executable` | → `retired` |
| `retired` | (terminal — sin transiciones) |

Cada transicion requiere campos especificos:
- **No candidato:** `promoted_at`, `promoted_by`
- **Accepted/Executable:** referencia `adr` no nula
- **Executable:** `native_rule`, `opa_policy`, `fixtures[]`
- **Retired:** `disposition` no nulo

## Workflow CI

El workflow `.github/workflows/knowledge-intake.yml` se activa en PRs que modifican archivos KI o SRC bajo `product/research/intake/`.

### Jobs

| Job | Proposito | Comportamiento de Fallo |
|-----|-----------|------------------------|
| `validate` | Ejecuta validacion de esquema + transiciones (script 17) y paridad de doble motor (script 18) | Falla en cualquier error de validacion |
| `opa-check` | Evalua pruebas de politica OPA contra reglas de ingesta | Falla en cualquier violacion OPA |
| `report` | Publica resultados de validacion como comentario en PR | Siempre se ejecuta, actualiza comentario existente |

### Condiciones de Activacion

El workflow se activa en PRs hacia ramas `main` o `develop` que modifican:
- `product/research/intake/KI-*.yaml`
- `product/research/intake/KI-*.yml`
- `product/research/intake/SRC-*.yaml`
- `product/research/intake/SRC-*.yml`

## Script de Promocion

Promover un candidato KI al siguiente nivel en la maquina de estados:

```bash
node .harness/scripts/knowledge-promote.mjs <ki-file> <target-status>
```

### Ejemplo

```bash
# Promover a evaluated
node .harness/scripts/knowledge-promote.mjs product/research/intake/KI-EVANS-AGGREGATE-001.yaml evaluated

# Promover a accepted (requiere referencia ADR en el archivo)
node .harness/scripts/knowledge-promote.mjs product/research/intake/KI-EVANS-AGGREGATE-001.yaml accepted
```

El script:
1. Valida que la transicion sea legal
2. Valida campos requeridos para el estado objetivo
3. Actualiza `promotion.status`, `promotion.promoted_at` y `promotion.promoted_by`
4. Valida el archivo actualizado contra esquema JSON y politica OPA
5. Escribe el YAML actualizado de vuelta al archivo

## Disparador de Revision Winston

Preparar un prompt de revision estructurado para que Winston (\`@winston\`) evaluede un candidato de conocimiento:

```bash
node .harness/scripts/knowledge-winston-review.mjs <ki-file>
```

### Ejemplo

```bash
node .harness/scripts/knowledge-winston-review.mjs product/research/intake/KI-EVANS-AGGREGATE-001.yaml
```

El script:
1. Lee el archivo KI y su entrada de registro de fuente vinculada
2. Construye un prompt de revision estructurado con todos los metadatos del candidato
3. Escribe el prompt en `.harness/tmp/winston-review-<KI-ID>.md`
4. Muestra una vista previa del prompt

### Disparador CI

La revision Winston tambien se puede activar via comando de comentario en PR:
```
/winston-review product/research/intake/KI-EVANS-AGGREGATE-001.yaml
```

## Modo Auto-Correccion

El script de validacion soporta un flag `--fix` que autocorrige problemas menores:

```bash
node .harness/scripts/ci/17-validate-knowledge-intake.mjs --fix
```

### Problemas Auto-Correjibles

| Problema | Correccion Aplicada |
|----------|---------------------|
| `review.review_freshness` faltante | Establecido a fecha actual |
| `promotion.promoted_at` faltante (no candidato) | Establecido a fecha actual |
| `promotion.promoted_by` faltante (no candidato) | Establecido a `17-validate-knowledge-intake.mjs` |

Despues de corregir, el script re-valida para confirmar que todos los problemas estan resueltos.

## Agregar Nuevas Fuentes de Conocimiento

1. **Crear una entrada de registro de fuente** (`SRC-*.yaml`):
   ```yaml
   source_registry_id: SRC-MY-SOURCE-001
   source_license: MIT
   edition_or_url: "https://ejemplo.com/recurso"
   retention_mode: citation
   content_fingerprint: sha256:<hash>
   review_cadence: 12-months
   ki_links:
     - KI-MY-KNOWLEDGE-001
   ```

2. **Crear un candidato de ingesta de conocimiento** (`KI-*.yaml`):
   ```yaml
   knowledge_id: KI-MY-KNOWLEDGE-001
   source_registry_id: SRC-MY-SOURCE-001
   source:
     class: book
     author: "Nombre del Autor"
     work: "Titulo de la Obra"
     locator: "Capitulo/Pagina"
     retrieved_at: "2026-06-23"
     rights_status: citation-and-synthesis-only
   assessment:
     trust_level: primary
     portability: high
     topologies:
       - modular-monolith
     maturity: proven
     preconditions: []
     anti_patterns: []
     alternatives: []
     concerns: []
   promotion:
     status: candidate
     promoted_at: null
     promoted_by: null
     adr: null
     native_rule: null
     opa_policy: null
     fixtures: []
     disposition: null
   review:
     owner: '@winston'
     next_review_at: "2026-12-23"
     review_freshness: "2026-06-23"
   synthesis: >-
     Una sintesis detallada del conocimiento que captura los ideas clave,
     aplicabilidad a arquitecturas Evolith Core y advertencias.
   ```

3. **Enviar un PR** — el workflow CI valida automaticamente.

4. **Promocionar** una vez que la revision Winston apruebe:
   ```bash
   node .harness/scripts/knowledge-promote.mjs product/research/intake/KI-MY-KNOWLEDGE-001.yaml evaluated
   ```

## Puertas de Validacion

| Puerta | Script | Proposito |
|--------|--------|-----------|
| Validacion de Esquema | `17-validate-knowledge-intake.mjs` | Cumplimiento de esquema JSON, reglas de transicion, IDs de topologia |
| Politica OPA | `knowledge-intake.rego` | 7 reglas (KI-R01 a KI-R07) |
| Paridad de Doble Motor | `18-validate-knowledge-parity.mjs` | Consistencia de veredictos Nativo/OPA |
| Proyeccion Aprobada | `approved-projection.json` | IDs de conocimiento aprobados para recuperacion RAG |

## Autoridad Relacionada

- [Soporte para CI Agentico y RAG](./agentic-ci-rag-support.es.md)
- [Playbook de Auditoria Winston](../../.harness/playbooks/winston-audit-playbook.es.md)
- [Esquema de Ingesta de Conocimiento](../../src/rulesets/schema/knowledge-intake.schema.json)
- [Politica OPA de Ingesta de Conocimiento](../../src/rulesets/opa/knowledge-intake.rego)

## Invalidación de Caché para Ingesta de Conocimiento

Cuando los archivos de ingesta de conocimiento se promueven o actualizan, la capa de caché Redis puede servir datos obsoletos. Siga este procedimiento para asegurar la consistencia de la caché.

### Cuándo Invalidar

| Evento | Clave de Caché | Acción |
|-------|-----------|--------|
| KI promovido a `executable` | `topology:list` | Llamar al endpoint de invalidación |
| Política OPA actualizada | `opa:result:*` | Esperar expiración del TTL (60s) o llamar invalidación |
| Nuevo ruleset agregado | `topology:list` | Llamar al endpoint de invalidación |

### Pasos de Invalidación

1. **Promover el archivo KI** usando el pipeline estándar:
   ```bash
   node .harness/scripts/knowledge-promote.mjs product/research/intake/KI-*.yaml executable
   ```

2. **Invalidar la caché de topología** (si los manifiestos de topología cambiaron):
   ```bash
   curl -X POST http://localhost:3000/api/v1/architecture/cache/invalidate
   ```

3. **Verificar** que la caché fue invalidada revisando métricas:
   ```bash
   curl -s http://localhost:3000/metrics | grep evolith_cache
   ```

### Notas

- Las cachés de resultados OPA usan un TTL de 60 segundos y se auto-invalidan sin intervención manual.
- La caché de descubrimiento de herramientas/recursos del servidor MCP usa un TTL de 10 minutos y es segura de dejar obsoleta durante operaciones de ingesta de conocimiento.
- Si Redis no está disponible, toda la caché degradan gracefulmente a en memoria — no se requiere intervención manual.

---
[Volver a Operaciones](./README.es.md)
