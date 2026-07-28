# Centro de Control

> **Navegación Bilingüe:** [English Version](./README.md)
>
> **Ubicación:** [Conceptos Core](../README.es.md) › Centro de Control

> Observabilidad de seguimiento, evaluación y mejora.

| Área | Punto de entrada | Contenido |
|------|------|---------|
| **Gaps** | [`gaps/`](./gaps/gap-tracking.es.md) | Board de seguimiento de gaps · [Catálogo de referencia](./gaps/gap-reference-catalog.es.md) |
| **Reportes de Madurez** | [`maturity-reports/`](./maturity-reports/maturity-assessment.es.md) | Evaluación de madurez · [Resumen ejecutivo](./maturity-reports/executive-summary.es.md) · [Inventario](./maturity-reports/inventory-summary.es.md) |
| **Auditorías** | [`audits/`](./audits/architectural-directives.es.md) | Directivas arquitectónicas · [Análisis profundo de coherencia](./audits/deep-coherence-analysis-2026-06-16.es.md) |
| **Oportunidades** | [`opportunities/`](./opportunities/README.es.md) | Propuestas de mejora, propuestas upstream |
| **Evidencia** | [`evidence/`](./evidence/gap-closure-evidence-standard.es.md) | Estándar de evidencia de cierre de gaps, registros normativos |
| **Taxonomía** | [`taxonomy/`](./taxonomy/MASTER_INDEX.es.md) | Índice maestro · [Taxonomía del repositorio](./taxonomy/repository-taxonomy.es.md) · [Trazabilidad E2E](./taxonomy/e2e-traceability-matrix.es.md) |

## Economía de la deuda: principal e interés

Cada fila del board lleva una criticidad (`P0`–`P3`) y una complejidad (`XS`–`XL`). Ninguna de las dos es un costo, así que el orden del backlog es una opinión. El modelo de ítem de deuda técnica del SEI (Kruchten, Nord, Ozkaya, *Managing Technical Debt*) nombra los dos campos que lo convierten en una decisión económica:

- **Principal** — lo que cuesta pagar el ítem, una vez.
- **Interés** — lo que cuesta seguir *sin* pagarlo, por período.

El principal por sí solo no prioriza nada: es una estimación de trabajo, que `Complexity` ya aproxima. El interés es el discriminador — un pago de 40 horas que cuesta 1 hora al mes de acarreo pierde frente a un pago de 4 horas que cuesta 8.

### Unidades

Un número sin etiqueta no es una medición, así que la unidad forma parte del formato:

| Campo | Unidad | Forma canónica | Forma explícita |
|---|---|---|---|
| `Principal` | horas-ingeniero (horas de trabajo de una persona, no tiempo de calendario) | banda `XS`…`XL` | `12h`, `3d` (1 d = 8 h) |
| `Interés` | horas-ingeniero por **período de 30 días** | banda `NONE`…`SEVERE` | `4h/30d` |
| `Base` | — (un método, no una magnitud) | `atdm`, `sqale` o `estimate` | — |

El período del interés está fijado en 30 días y nunca es "por sprint": la duración del sprint es una convención local, y dos filas medidas contra sprints distintos no son comparables. Un `4h` a secas se rechaza como interés — una tasa sin período es simplemente un segundo principal.

`Base` registra cómo se obtuvo la cifra, porque "derivada" y "adivinada" no se distinguen después: `atdm` es la OMG Automated Technical Debt Measure V2 v1.0 (2024-08), cuyo esfuerzo de reparación se deriva de las ocurrencias de debilidades ISO/IEC 5055; `sqale` es el modelo de costo de remediación SQALE detrás del ratio de deuda técnica; `estimate` es una estimación humana, registrada como tal.

### Bandas

| Banda | Principal (horas-ingeniero) | Banda | Interés (h / 30 d) |
|---|---|---|---|
| `XS` | 1–2 | `NONE` | 0 |
| `S` | 2–8 | `LOW` | 0.5–2 |
| `M` | 8–24 | `MED` | 2–8 |
| `L` | 24–80 | `HIGH` | 8–24 |
| `XL` | 80–240 | `SEVERE` | 24–80 |

Una estimación puntual sobre un ítem no empezado es falsa precisión, así que la banda es la forma normal. La forma explícita es para cifras calculadas en lugar de juzgadas: un principal derivado de ATDM es un número real y no debe aplanarse a una banda.

### Dónde van los campos

Una línea de campo dentro de la sección `#### GT-NNN` de la fila en el [catálogo de referencia de gaps](./gaps/gap-reference-catalog.es.md), junto a `- **Component:**`:

```markdown
- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`
```

El catálogo en inglés es el canónico. El catálogo en español puede replicar la línea (`- **Principal:** … · **Interés:** … · **Base:** …`); una réplica que contradiga a la inglesa es un defecto, mientras que una réplica ausente no lo es — un número no necesita traducción. La tabla del board puede además llevar columnas `Principal` / `Interest`, y si las lleva deben coincidir con el catálogo: dos cifras para un mismo ítem de deuda son peores que ninguna. Solo las filas ABIERTAS necesitan economía — el costo de una fila cerrada es historia, no una decisión.

### Medir la brecha

`node .harness/scripts/board/report-debt-economics.mjs` reporta cuántas filas abiertas llevan ambos campos **sobre cuántas filas abiertas existen**, de modo que la brecha sea medible antes de llenarse. `--strict` convierte la brecha restante en un exit distinto de cero y es la forma que invoca el guard de tracking una vez completado el relleno; `--json` emite el mismo reporte legible por máquina; `--emit-schema` imprime el JSON Schema guardado en `.harness/scripts/board/debt-economics.schema.json` (generado desde el módulo — no editar a mano).

Medición del 2026-07-28: **0 de 56 filas abiertas** llevan un principal y un interés. Las cifras las llena una persona, deliberadamente: rellenar 56 filas con estimaciones inventadas fabricaría exactamente el tipo de número sin fuente que esta convención existe para eliminar.
