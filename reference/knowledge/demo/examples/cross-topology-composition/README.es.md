# Ejemplo — Composición Multi-Topología: Monolito Modular + Event-Driven

> **Navegación bilingüe:** [English Version](./README.md)
> **Composición:** `modular-monolith + event-driven`
> **Esquema:** [`topology-composition.schema.json`](../../../../../rulesets/schema/topology-composition.schema.json)
> **Validador:** `.harness/scripts/ci/22-validate-topology-composition.mjs`

Este directorio publica la primera referencia ejecutable de la regla de composición multi-topología (`topology-dimensions.md §3`). Demuestra cómo un monolito modular F1 expone fronteras asíncronas mediante una topología de integración event-driven — la segunda fila de la tabla de ejemplos de composición — y se ejecuta extremo a extremo en el validador en cada commit.

---

## 1. Archivos del Ejemplo

| Archivo | Propósito |
|---|---|
| [`topology.composition.json`](./topology.composition.json) | Manifiesto declarativo de composición. Lista cada perfil y apunta a su configuración. |
| [`modular-monolith.config.json`](./modular-monolith.config.json) | Fixture de configuración del perfil monolito modular. Validado contra el `configurationContract` de la topología. |
| [`event-driven.config.json`](./event-driven.config.json) | Fixture de configuración del perfil event-driven. Mismo contrato de validación. |

El manifiesto de composición es deliberadamente mínimo: no embebe código de runtime, solo las entradas declarativas que consumen los validadores. Un proyecto satélite puede copiar el directorio a su propio repositorio, editar las configuraciones y pasar la misma prueba de composición que corre el corpus en CI.

---

## 2. Por Qué Esta Composición Es Válida

La regla de composición (`topology-dimensions.md §3`) acepta un conjunto de perfiles solo si:

1. Cada perfil está gobernado por un manifiesto aceptado.
2. Los perfiles pertenecen a **dimensiones diferentes** (`progressive-axis`, `integration`, `execution`, `data`, `ai`).
3. Cada perfil lista a los otros en su campo `spec.compatibility.composableWith`.

Para este ejemplo:

| Verificación | Resultado |
|---|---|
| `modular-monolith` está aceptado | Sí — manifiesto en `reference/architecture/topologies/progressive-axis/modular-monolith/topology.manifest.json` |
| `event-driven` está aceptado | Sí — manifiesto en `reference/architecture/topologies/integration/event-driven/topology.manifest.json` |
| Dimensiones distintas | Sí — `progressive-axis` vs `integration` |
| `modular-monolith.composableWith` incluye `event-driven` | Sí |
| `event-driven.composableWith` incluye `modular-monolith` | Sí |

---

## 3. Ejecutar el Validador Localmente

```bash
node .harness/scripts/ci/22-validate-topology-composition.mjs
```

El script escanea cada `topology.composition.json` bajo `examples/`, valida cada uno contra el esquema JSON de composición, afirma la composabilidad pairwise vía `composableWith`, y valida cada fixture de configuración contra su `configurationContract`. Un fallo en cualquier paso retorna distinto de cero.

El mismo script corre en cada commit por el pipeline pre-commit (`.husky/pre-commit`), por lo que el ejemplo actúa como fixture vivo de conformidad y no como documentación que pueda envejecer.

---

## 4. Adaptar a una Nueva Composición

1. Elige los perfiles que quieras componer (p. ej., `microservices + edge-computing + event-driven`).
2. Copia este directorio a una nueva carpeta bajo `examples/`.
3. Edita `topology.composition.json` — lista cada perfil y apunta a su configuración.
4. Autor o copia un fixture de configuración para cada perfil desde el `corpus.fixtures.valid` de su manifiesto.
5. Ejecuta el validador. Los fallos identificarán qué declaración `composableWith` falta.

Si dos perfiles no pueden componer, el validador debe rechazar el ejemplo. Agrega un ejemplo deliberadamente inválido junto al válido solo si documentas por qué el corpus espera el rechazo.

---

## 5. Referencias Relacionadas

| Documento | Propósito |
|---|---|
| [Topology Dimensions §3 — Regla de Composición](../../../../../reference/architecture/topologies/topology-dimensions.es.md#3-regla-de-composicion) | Regla de composición autoritativa. |
| [Esquema de Manifiesto de Topología](../../../../../rulesets/schema/topology-manifest.schema.json) | Define `spec.compatibility.composableWith`. |
| [Esquema de Composición de Topologías](../../../../../rulesets/schema/topology-composition.schema.json) | Define la forma del manifiesto usado por este ejemplo. |
