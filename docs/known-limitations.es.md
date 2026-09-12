# Estado real del proyecto

> **Navegación Bilingüe:** [English](./known-limitations.md)

Todo lo que la [portada](../README.es.md) no cuenta, en una sola página. Cada afirmación lleva la fecha en que se midió: si una cifra cambió y esta página no, lo que está mal es la página. Existe porque un README que solo cuenta lo bueno es exactamente el defecto que Evolith detecta: *cobertura* y *cumplimiento* pintados del mismo verde.

Auditoría completa de nuestras propias afirmaciones, con qué bloquea cada pendiente y quién puede desbloquearlo: [pendientes 2026-08-16](../reference/core/control-center/adoption/pending-2026-08-16.md).

---

## Los dos motores no cubren lo mismo

`evolith validate` corre por defecto el evaluador nativo; `--engine opa` evalúa con el bundle Rego compilado. Sobre este mismo repositorio, medido el 2026-08-21 con `@beyondnet/evolith-cli@1.3.2`:

| Motor | Evalúa | Salta |
|---|---|---|
| `--engine opa` | 133 de 159 | 26 |
| nativo (por defecto) | 41 de 159 | 118 |

CI exige que coincidan sobre **hechos**, no sobre cobertura; eso es por diseño. Que el comando por defecto no lo diga, no lo es ([#628](https://github.com/beyondnetcode/evolith_arch32/issues/628)). Por eso la portada usa `--engine opa` en todas partes.

## Dos reglas de infraestructura no están en ningún denominador

El cargador rechaza tres ficheros del propio corpus, y desde 1.3.2 ya ni lo avisa por stderr ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)). Las reglas que contienen no aparecen ni como evaluadas ni como saltadas.

## El conteo de ficheros y el de reglas responden a preguntas distintas

Medido el 2026-08-21: el árbol llevaba 182 ficheros `*.rules.json`, de los cuales cuatro declaran un esquema que no es de ruleset y no aportan reglas por diseño — se nombran en cada informe, no se descartan en silencio. Quedaban 178 packs con 413 reglas. El CLI publicado en ese momento (1.3.2) llevaba su propia foto: 177 packs, 412 reglas.

Ninguna de esas cifras es la viva. La del árbol la mide CI en cada PR y la publica el [inventario del corpus](../reference/core/control-center/maturity-reports/inventory-summary.es.md), con su fecha; la de tu instalación la imprime `evolith rulesets`, pack por pack.

## La primera ejecución falla sobre un repositorio nuevo

Un repositorio recién configurado con `init` es una línea base, no un aprobado: muchas reglas asumen un layout más completo. La captura íntegra de esa primera ejecución —72 filas, 37 bloqueantes, 9 de ellas reglas que el motor no pudo decidir— está en [first-run-capture](./evidence/first-run-capture.es.md). Llevar el default a cero se sigue como GT-571 en el [Tablero de Gaps](../reference/core/control-center/gaps/gap-tracking.es.md).

## Lo que no está construido

La mitad de «el LLM propone, un verificador determinista dispone» es una dirección documentada, no comportamiento publicado. Ningún comando de la CLI instalada alcanza un LLM.

## Egreso de red

Local-first: la CLI, las reglas, las políticas OPA y el Core de evaluación corren en tu máquina, y tu código nunca se sube. Existe exactamente **una** integración de salida (`GeminiProvider`, Google Gemini API), está **desactivada por defecto**, y hoy ningún comando de la CLI publicada la alcanza. Los tarballs que hay en el registro son anteriores a ese endurecimiento: **trata el `GeminiProvider` publicado como no gobernado y no lo armes.**

Divulgación completa —sub-encargados, credencial, límites, redacción, qué sale y qué no, y las limitaciones conocidas de estos controles—: [Salida de Red y Tratamiento de Datos](../SECURITY.es.md#salida-de-red-y-tratamiento-de-datos). Reporta un defecto de egreso por ahí, nunca en un issue público.

## Plataformas verificadas

La instalación se verifica en CI sobre Linux. macOS y Windows no están cubiertos por esa puerta.

## Adopción

1.109 descargas en npm en el mes medido (2026-07-21 → 2026-08-19), ninguna adopción externa confirmada. El repositorio se gobierna a sí mismo y esa es toda la evidencia que hay.
