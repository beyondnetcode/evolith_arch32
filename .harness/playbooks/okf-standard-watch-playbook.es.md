# Playbook: Vigía del Estándar OKF

> **Navegación bilingüe:** [View English version](./okf-standard-watch-playbook.md)

## Persona: Winston (Arquitecto Principal; ID de agente `@winston`)

**Alcance**: Mantener sana y alineada la proyección OKF del Knowledge OS ([ADR-0105](../../reference/core/architecture/adrs/core/0105-okf-knowledge-projection.es.md)) frente al estándar Open Knowledge Format upstream, imponiendo las precauciones que define el ADR.
**Entradas**: `reference/knowledge/` (corpus canónico + `knowledge.index.yaml`), el spec OKF pineado y el lockfile `reference/knowledge/canonical/okf-spec.lock.json`.
**Salidas**: Un bundle OKF conforme y al día publicado en `reference/knowledge/okf/` (commiteado, con gate `--verify`) y un lockfile del estándar al día.
**Restricciones**: Regla de oro del Knowledge OS — **el drift de oráculo/conformidad bloquea; el vencimiento por tiempo/estándar solo avisa**. El bundle es derivado: nunca autoridad, nunca editado a mano, nunca commiteado.

---

## Por qué existe

El Core es **YAML-first**; OKF es una **proyección** portable y derivada para consumo externo (ADR-0105). Adoptar un estándar externo y joven trae dos riesgos:

1. **Drift de la proyección** — el corpus cambia y el bundle deja de conformar.
2. **Drift del estándar** — OKF v0.1 evoluciona upstream y el proyector se queda atrás.

Este playbook cablea ambos en la rutina de Winston, separados por costo para que la red nunca esté en el camino del commit.

## Los tres mecanismos

| Mecanismo | Disparador | Severidad | Dónde |
|---|---|---|---|
| **Guarda up-to-date** (`--verify` al cambiar el corpus) | cada commit que stagea `canonical/` o el índice, cualquier modo CI (incluso `skip`) | **bloquea** | `.husky/pre-commit` → `knowledge-okf-precommit-guard.mjs` |
| **Gate up-to-date** (`--verify`) | `ci-runner` governance/auto/full | **bloquea** | `.harness/scripts/ci/38-validate-okf-projection.mjs` |
| **Vigía del estándar** (diff de hash upstream) | a demanda (manual) + nudge STALE en pre-commit | **avisa** | `.harness/scripts/knowledge-okf-standard-watch.mjs` |

## Comandos

```bash
# Regenerar / validar la proyección publicada (offline, determinista)
node .harness/scripts/knowledge-okf-project.mjs            # regenera bundle → reference/knowledge/okf/
git add reference/knowledge/okf                            # re-stagea tras cualquier cambio en canonical/
node .harness/scripts/knowledge-okf-project.mjs --verify   # conformidad + up-to-date (gate CI)
node .harness/scripts/knowledge-okf-project.mjs --check    # solo conformidad, sin escribir

# Vigilar el estándar OKF upstream (red, manual)
node .harness/scripts/knowledge-okf-standard-watch.mjs            # chequea + refresca checkedAt
node .harness/scripts/knowledge-okf-standard-watch.mjs --init     # primera vez: crea el lockfile
node .harness/scripts/knowledge-okf-standard-watch.mjs --accept   # reconoce un cambio upstream ya revisado
node .harness/scripts/knowledge-okf-standard-watch.mjs --json     # salida machine-readable

# Tests
node --test .harness/scripts/knowledge-okf-project.test.mjs \
            .harness/scripts/knowledge-okf-standard-watch.test.mjs \
            .harness/scripts/knowledge-okf-precommit-guard.test.mjs
```

## Rutina de Winston cuando el estándar cambia

El nudge del pre-commit (o una corrida manual) reporta `status: changed` / exit `10`. Entonces:

1. **Lee el diff de intención.** Abre el [SPEC.md de OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) upstream y compáralo con lo que asume el ADR-0105 (`type` obligatorio, reservados `index.md`/`log.md`, cross-links absolutos, claves desconocidas toleradas).
2. **Evalúa el impacto en el proyector.** Si el cambio toca campos obligatorios, nombres reservados o reglas de conformidad, actualiza `knowledge-okf-project.mjs` y sus tests hasta que `--check` vuelva a pasar.
3. **Reconcilia el ADR.** Si la semántica cambia de forma material, añade una nota de corrección al ADR-0105 (no reescribas la historia — espeja la disciplina de altitud del ADR-0101).
4. **Reconoce.** Corre `--accept` para pinear el nuevo hash upstream (`sha256` + `reviewedAt`), lo que limpia el aviso.

## Contrato de exit codes

| Script | 0 | ≠ 0 |
|---|---|---|
| `knowledge-okf-precommit-guard.mjs` | limpio (puede imprimir nudge STALE) | `1` = corpus en stage pero bundle publicado desactualizado (**bloquea el commit**) |
| `ci/38-validate-okf-projection.mjs` | conforma y al día | `1` = drift de conformidad o sincronía (**bloquea CI**) |
| `knowledge-okf-standard-watch.mjs` | al día / init / aceptado | `10` = cambió upstream (advisory); `2` = error de red/parse (lock intacto) |

---

[Volver a Playbooks](./) · [ADR-0105](../../reference/core/architecture/adrs/core/0105-okf-knowledge-projection.es.md) · [Knowledge OS](../../reference/knowledge/README.md)
