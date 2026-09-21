# Estado real del proyecto

> **Navegación Bilingüe:** [English](./known-limitations.md)

Todo lo que la [portada](../README.es.md) no cuenta, en una sola página. Cada afirmación lleva la fecha en que se midió: si una cifra cambió y esta página no, lo que está mal es la página. Existe porque un README que solo cuenta lo bueno es exactamente el defecto que Evolith detecta: *cobertura* y *cumplimiento* pintados del mismo verde.

Auditoría completa de nuestras propias afirmaciones, con qué bloquea cada pendiente y quién puede desbloquearlo: [pendientes 2026-08-16](../reference/core/control-center/adoption/pending-2026-08-16.md).

---

## Los dos motores no cubren lo mismo

`evolith validate` corre por defecto el evaluador nativo; `--engine opa` evalúa con el bundle Rego compilado. Deciden partes distintas del mismo corpus y ninguno es superconjunto del otro. Qué decide cada uno, y por qué salta el resto, lo mide CI en cada corrida — `73-validate-engine-coverage-parity.mjs`, sobre una exportación del árbol versionado y sobre un satélite recién salido de `init` — y la tabla de abajo la escribe ese guard, no una mano: cuando las cifras se mueven, CI falla hasta que el guard las reescribe (AC5 de GT-716).

<!-- engine-coverage:begin -->
_Medido el 2026-09-21 por `73-validate-engine-coverage-parity.mjs --write` — un `evolith validate --engine <e> --format json` por motor y escenario, sobre una exportación del árbol versionado y sobre un satélite recién salido de `evolith init`. CI regenera esta tabla y falla cuando difiere de la medición; edita el guard, no la tabla._

| Escenario | Motor | En alcance | Decididas | Saltadas | …hecho no suministrado | …falta adaptador | …documentación | …deuda del motor | No aplicables |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| este repositorio | nativo (por defecto) | 355 | 109 | 246 | 37 | 65 | 138 | 6 | 60 |
| este repositorio | `--engine opa` | 355 | 28 | 327 | 146 | 1 | 138 | 42 | 60 |
| satélite recién salido de `init` | nativo (por defecto) | 151 | 50 | 101 | 30 | 61 | 4 | 6 | 264 |
| satélite recién salido de `init` | `--engine opa` | 151 | 2 | 149 | 117 | 1 | 0 | 31 | 264 |
<!-- engine-coverage:end -->

**Cómo leerla.** *Hecho no suministrado* es una postura que solo los dueños del repositorio pueden declarar — el filtrado por tenant, la intención de runtime, los hallazgos del sistema de CI; las políticas OPA las deciden cuando el llamador las suministra por `facts.satellite` (GT-694), y el motor nativo nunca. Esa es la única razón que queda para correr `--engine opa`, y no es cobertura: en una ejecución a secas el motor por defecto decide más, en las dos filas. *Falta adaptador* es un sistema externo o en ejecución que nadie ha cableado aún por la costura del enforcer. *Documentación* es una regla sin comprobación tal como está escrita — sobre todo los marcadores ADR-conformance generados, `documentation-only` en ambos motores por decisión. *Deuda del motor* es un handler o una política que nadie escribió; cada una lleva una decisión registrada en [`engine-coverage-decisions.json`](../.harness/scripts/ci/engine-coverage-decisions.json), y el lado solo-OPA de la [línea base de cobertura](../.harness/scripts/ci/engine-coverage-parity.baseline.json) está vacío. El informe dice lo mismo con los mismos grupos: cuando un motor salta más de lo que comprueba, su fila `GOV-ENGINE-COVERAGE` enuncia el desglose de esa corrida.

**La CLI publicada es anterior a todo esto.** `@beyondnet/evolith-cli@1.3.2` — lo que instala hoy `npx -y @beyondnet/evolith-cli` — es anterior a GT-716. Medida el 2026-08-21 sobre este repositorio decidía 133 de 159 con `--engine opa` y 41 de 159 en nativo, y la mayor parte de esa diferencia eran veredictos sobre hechos que nadie suministró. Por eso la portada sigue diciendo `--engine opa`, y dice para qué CLI; la próxima publicación lo invierte.

CI exige que coincidan sobre **hechos**, no sobre cobertura; eso es por diseño — y desde el AC3 de GT-716 cada regla que solo un motor decide queda registrada por regla, en ambas direcciones, sobre este repositorio y sobre un satélite recién salido de `init` (`73-validate-engine-coverage-parity.mjs`), de modo que una diferencia de cobertura es un diff que alguien lee y no un número que nadie lee. Desde el AC4 (2026-09-21) nada en ese registro está por omisión: cada entrada de deuda lleva una decisión registrada (`engine-coverage-decisions.json`) que el guard contrasta con las ejecuciones, y el lado solo-OPA está vacío en ambos escenarios — las últimas reglas que solo `--engine opa` decidía desde el árbol (`OBS-EVD-01..03`, `MCP-05`) tienen gemelos nativos de sus políticas. Que el comando por defecto no lo diga, no lo es ([#628](https://github.com/beyondnetcode/evolith_arch32/issues/628)). Por eso la portada usa `--engine opa` en todas partes. Medido de nuevo el 2026-09-20 con la CLI construida desde este árbol: el motor por defecto decide 56 de las mismas 159, y de las 76 reglas que solo `--engine opa` decide, 73 son veredictos sobre facetas que una ejecución a secas nunca suministra — así que la mayor parte de esa cobertura extra no es cobertura. Se sigue como GT-716 en el [Tablero de Gaps](../reference/core/control-center/gaps/gap-tracking.es.md). Desde `b2840947` (en el árbol, aún no en una CLI publicada) el motor OPA reporta esas reglas como `skipped` con la faceta que le falta: sobre el mismo satélite decide 10 de 159 a partir de lo que una ejecución a secas observa, y el resto solo cuando el llamador suministra los hechos por `facts.satellite`.

## Dos reglas de infraestructura no están en ningún denominador

El cargador rechaza tres ficheros del propio corpus, y desde 1.3.2 ya ni lo avisa por stderr ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)). Las reglas que contienen no aparecen ni como evaluadas ni como saltadas.

## El conteo de ficheros y el de reglas responden a preguntas distintas

Medido el 2026-08-21: el árbol llevaba 182 ficheros `*.rules.json`, de los cuales cuatro declaran un esquema que no es de ruleset y no aportan reglas por diseño — se nombran en cada informe, no se descartan en silencio. Quedaban 178 packs con 413 reglas. El CLI publicado en ese momento (1.3.2) llevaba su propia foto: 177 packs, 412 reglas.

Ninguna de esas cifras es la viva. La del árbol la mide CI en cada PR y la publica el [inventario del corpus](../reference/core/control-center/maturity-reports/inventory-summary.es.md), con su fecha; la de tu instalación la imprime `evolith rulesets`, pack por pack.

## La primera ejecución falla sobre un repositorio nuevo

Un repositorio recién configurado con `init` es una línea base, no un aprobado: muchas reglas asumen un layout más completo. La captura íntegra de esa primera ejecución —71 filas, 37 bloqueantes, 9 de ellas reglas que el motor no pudo decidir— está en [first-run-capture](./evidence/first-run-capture.es.md). Llevar el default a cero se sigue como GT-571 en el [Tablero de Gaps](../reference/core/control-center/gaps/gap-tracking.es.md).

## `gate evaluate` y `phase advance` necesitan un checkout de este repositorio en disco

Medido el 2026-09-20 con `@beyondnet/evolith-cli@1.3.2` en un contenedor limpio: sobre un satélite recién salido de `init`, `evolith gate evaluate --phase discovery` sale con `1` y `ENOENT … reference/governance/sdlc/gates`, y `phase advance` igual. El tarball trae las reglas pero no las definiciones de gate, y sin `--core` (ni `EVOLITH_CORE_PATH`, ni un perfil) el resolutor las busca dentro del satélite. Con `--core` apuntando a un clon de este repositorio las dos órdenes funcionan y salen con `2` — la [captura de la compuerta de fase](./evidence/phase-gate-capture.es.md) tiene ambas ejecuciones. El paquete MCP arregló el mismo defecto para sí en GT-705; la CLI no: GT-714 en el [Tablero de Gaps](../reference/core/control-center/gaps/gap-tracking.es.md), abierto como [#775](https://github.com/beyondnetcode/evolith_arch32/issues/775). Hasta que aterrice, la portada muestra las órdenes con `--core ../evolith`, porque eso es lo que corre.

## El Tracker le envió un repositorio al Core, y el Core respondió 500

Medido el 2026-09-20 contra la imagen del Core construida desde `main@142b8324`, la que corre el entorno UAT: la llamada de conformidad del repositorio del Tracker (`POST /products/{id}/evaluate-architecture` → Core `POST /api/v1/evaluate` con el repositorio inline, 150 ficheros, ~1 MB) volvió como `500 INTERNAL_ERROR "An unexpected error occurred"`, sin una sola línea de log en el Core. Reproducido en local sobre la misma imagen: 14 ficheros (99,8 KB) → `200`, 15 ficheros (101,6 KB) → `500`. El techo de 100 KB por omisión de Express para JSON, nunca subido, nunca nombrado. Arreglado como GT-715 —un techo configurable (`EVOLITH_MAX_BODY_BYTES`, 2 MiB por defecto), un `413 PAYLOAD_TOO_LARGE` que dice los dos tamaños y una línea de log por cada 5xx enmascarado—, y promovido el mismo día: Promovido en #778 (`9c5deedf`) y redesplegado por el job `Deploy UAT (Coolify)` de la corrida 35490911533 el 2026-09-20; medido justo después: la misma llamada `evaluate-architecture` responde `200`, `provenance: core`, `status: COMPLETED`, `resultDecision: FAILED` — un veredicto real sobre 150 ficheros (gates f1–f5 fallidos por artefactos de fase ausentes), 174 ms en el Core. La captura del Tracker en la portada es la compuerta de fase alrededor de una iniciativa —tomada antes del redespliegue, y conservada porque enseña lo que la CLI no tiene—, no el veredicto sobre el repositorio, que es la medición de arriba.

## Lo que no está construido

La mitad de «el LLM propone, un verificador determinista dispone» es una dirección documentada, no comportamiento publicado. Ningún comando de la CLI instalada alcanza un LLM.

## Egreso de red

Local-first: la CLI, las reglas, las políticas OPA y el Core de evaluación corren en tu máquina, y tu código nunca se sube. Existen exactamente **dos** integraciones de salida — los transportes LLM del catálogo de proveedores (`ClaudeProvider`, Messages API de Anthropic; `GeminiProvider`, Google Gemini API; ADR-0128) — **sin proveedor por defecto**, ambas **desactivadas por defecto** tras un solo interruptor, y hoy ningún comando de la CLI publicada alcanza ninguna. Los tarballs que hay en el registro son anteriores a ese endurecimiento: **trata el `GeminiProvider` publicado como no gobernado y no lo armes** (`ClaudeProvider` no está aún en ningún tarball publicado).

Divulgación completa —sub-encargados, credencial, límites, redacción, qué sale y qué no, y las limitaciones conocidas de estos controles—: [Salida de Red y Tratamiento de Datos](../SECURITY.es.md#salida-de-red-y-tratamiento-de-datos). Reporta un defecto de egreso por ahí, nunca en un issue público.

## Plataformas verificadas

La instalación se verifica en CI sobre Linux. macOS y Windows no están cubiertos por esa puerta.

## Adopción

1.109 descargas en npm en el mes medido (2026-07-21 → 2026-08-19), ninguna adopción externa confirmada. El repositorio se gobierna a sí mismo y esa es toda la evidencia que hay.
