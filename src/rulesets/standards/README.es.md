# Mapeo de estándares — ISO/IEC 5055:2021

Este directorio responde una sola pregunta sobre el corpus de reglas de Evolith: **¿cuáles de nuestras
reglas ya las estandarizó alguien, y cuáles tenemos que escribir realmente nosotros?**

El corpus era 100% propietario. Eso no es una virtud: significa que toda cifra de cobertura era
auto-declarada y que cada regla no evaluada se costeaba como ingeniería a medida. ISO/IEC 5055:2021
publica 138 debilidades estructurales, cada una un identificador CWE, repartidas en cuatro medidas. Una
regla cuyo predicado *es* una de esas debilidades no necesita un handler escrito; necesita un adaptador
a un analizador que ya la decide — y su cobertura pasa a ser contable por un auditor que no tiene que
confiar en nosotros.

## Artefactos

| Archivo | Qué es |
|---|---|
| `iso-5055-weaknesses.json` | Los 138 identificadores CWE de ISO/IEC 5055, por medida, con procedencia. |
| `iso-5055-mapping.json` | Una fila por regla del corpus: mapeo a CWE (o un "sin equivalente" explícito con motivo), adoptabilidad por analizador y clase de evaluabilidad nativa. |
| `iso-5055-mapping.csv` | La misma tabla, plana, para hojas de cálculo y auditores. |
| `native-evaluability-snapshot.json` | Captura por regla de la clase de evaluabilidad del triage del Core, para acotar la aritmética de backlog de abajo al backlog real. Generado — no editar a mano. |
| `capture-native-evaluability-snapshot.mjs` | La captura. Ejecuta el triage real del Core vía `ts-node`; `--check` falla cuando la captura comiteada ya no es lo que el Core calcula. |
| `build-iso-5055-mapping.mjs` | El generador. `--check` falla cuando la tabla se quedó atrás del corpus. |
| `iso-5055-mapping.test.mjs` | La guarda. `node --test src/rulesets/standards/iso-5055-mapping.test.mjs`. |

### Regenerar, en orden

```
node src/rulesets/standards/capture-native-evaluability-snapshot.mjs   # 1. captura
node src/rulesets/standards/build-iso-5055-mapping.mjs                 # 2. mapeo
```

El orden no es una preferencia. El generador estampa `nativeEvaluability` en cada fila del mapeo a
partir de la captura, así que reconstruir primero blanquea una clasificación obsoleta dentro de un
artefacto de 391 filas y sobreestima el backlog de handlers en tantas reglas como el Core haya cerrado
desde la última captura.

Aquí no se reproduce texto de ISO/IEC 5055 ni de ISO/IEC 25010. Solo se registran identificadores CWE,
nombres CWE de MITRE y pertenencia a cada medida.

## Procedencia de las 138

La lista se extrajo programáticamente de las Tablas 1–4 de **OMG Automated Technical Debt Measure,
Version 2** (documento OMG `ptc/23-09-04`), que enumera las mismas debilidades. La unión de las cuatro
tablas es exactamente 138, coincidiendo con la cifra que publica CISQ: Seguridad 74, Fiabilidad 74,
Eficiencia de Desempeño 18, Mantenibilidad 31 — el solapamiento entre Seguridad y Fiabilidad es lo que
hace que la unión sea menor que la suma. La fecha y el método de extracción constan en el JSON.

## Resultado

Sobre **391 reglas** en 175 archivos de ruleset:

| Medida | Cantidad | Proporción |
|---|---|---|
| Reglas mapeadas a una debilidad ISO/IEC 5055 | 37 | 9,5% |
| — de ellas con mapeo directo | 8 | |
| — de ellas con mapeo parcial / proxy | 29 | |
| Reglas sin equivalente internacional (cada una con motivo declarado) | 354 | 90,5% |
| Reglas que un analizador existente podría decidir por completo | 42 | 10,7% |
| Reglas que un analizador podría decidir parcialmente | 23 | 5,9% |

**La fracción adoptada es el 9,5% del corpus.** Es un resultado real y es menor de lo que sugería la
premisa del gap, por una razón estructural: ISO/IEC 5055 mide la estructura interna del código fuente,
y 313 de nuestras 391 reglas no tratan de estructura de código. Son conformidad con ADR (162),
contratos de topología (66), invariantes de gobierno (51) y proceso de desarrollo (34). Ningún estándar
internacional modela "¿honraste el ADR-0092?", y ninguno lo hará.

Donde el estándar sí aplica, aplica bien: de las 26 reglas clasificadas como `code-structure`, 18
mapean y 13 son decidibles por analizador.

## Re-dimensionar el backlog de handlers

El enunciado del gap dimensionaba el beneficio contra "~240 handlers por escribir". **Esa cifra ya está
retirada.** GT-595 hizo el triage del corpus y el backlog real, decidible desde el repositorio, son **48
reglas** — la clase `unimplemented-native`. De las 389 reglas que carga el triage del Core, 154 ya se
ejecutan y las otras 187 son 136 placeholders de generador solo documentales, 14 reglas sin check
redactado, 20 que requieren un sistema externo y 17 que requieren uno en ejecución.

(389, no 391: los dos archivos de regla única llevan sus metadatos en la raíz del documento, y el
cargador de corpus del Core no los lee. Aparecen en el mapeo como `not-in-snapshot`.)

60 → 48 el 2026-07-29: ocho reglas con forma de configuración recibieron handler (GT-595) y cuatro
reglas de límites de módulo ya traían una cláusula `enforce` completa que la normalización descartaba
(GT-632).

Proyectar este mapeo sobre esa clase es la cifra que importa:

| Del backlog de 48 handlers | Cantidad |
|---|---|
| Decidibles hoy por un analizador estándar | 5 |
| Decidibles parcialmente (señal necesaria pero no suficiente) | 5 |
| Que hay que escribir de verdad | 38 |

Las 5 son `HXA-03` (estructura de capas — dependency-cruiser o ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (consultas de inyección y path traversal de CodeQL/Semgrep) y `SEC-TIMING-01` (comparación
en tiempo constante). Las 5 parciales están listadas en `handlerBacklog.byEvaluabilityClass` del JSON de
mapeo.

Es decir, adoptar vale **10,4% del backlog por completo, 20,8% incluyendo parciales** — 10 de 48 reglas
que no necesitan handlers a medida. Ambas proporciones bajaron al encogerse el backlog, y esa es la
dirección correcta: entre las doce reglas cerradas el 2026-07-29 están `HXA-01`, `HXA-02`, `HXA-04` y
`GIT-08`, que eran cuatro de las nueve que esta tabla ofrecía a un analizador. Evolith escribió el
handler primero. Lo que queda se inclina más hacia escribir, y las reglas de seguridad siguen apuntando
a analizadores mejores que cualquier cosa que escribiéramos.

## Taxonomía compañera: ISO/IEC 25010:2023

ISO/IEC 25010:2023 (2ª edición, que sustituye a la de 2011) define **nueve** características de calidad
de producto de primer nivel: Adecuación funcional, Eficiencia de desempeño, Compatibilidad,
**Interaction capability** (antes Usabilidad), Fiabilidad, Seguridad, Mantenibilidad, **Flexibility**
(antes Portabilidad) y **Safety** (nueva). ISO/IEC 5055 automatiza cuatro de ellas — Fiabilidad,
Seguridad, Eficiencia de desempeño y Mantenibilidad. Cualquier mapeo al modelo de ocho características
de 2011 está obsoleto, y `iso-5055-mapping.test.mjs` rompe el build si algo en este directorio lo
reintroduce.

## Cómo leer una fila

`analyser.adoptable` es una afirmación sobre la *forma* de la regla, no una integración verificada:

- `yes` — un analizador estándar ya decide este predicado; el trabajo es un adaptador.
- `partial` — el analizador da una señal necesaria pero no suficiente; el resto es nuestro.
- `no` — el predicado es específico del repositorio o del producto y hay que escribirlo.

`nativeEvaluability` se copia del snapshot de triage del Core. La autoridad es
`src/packages/core-domain/src/application/validators/rule-evaluability.ts` y su spec fijado; si esas
cifras se mueven, el snapshot de aquí está obsoleto y hay que recapturarlo.

## Cómo se detecta la deriva

El snapshot se mantenía a mano hasta GT-598, y derivó: declaraba `documentation-only: 129` mucho después
de que el Core pasara a 136, y la guarda que debía notarlo comparaba el snapshot contra seis números
escritos en el propio test — los mismos seis que el snapshot ya contenía. Comparaba el snapshot consigo
mismo y solo podía pasar. La reemplazan tres controles, en los dos jobs que pueden costearlos:

| Dónde | Qué prueba |
|---|---|
| `rule-corpus-triage.spec.ts` (jest de core-domain) | El snapshot comiteado es igual a un triage **recalculado** — las cuentas y la clase de cada regla. Esta es la guarda real: tiene las dependencias para recalcular la verdad. |
| `iso-5055-mapping.test.mjs` (job de documentación, sin `node_modules`) | Las cuentas del snapshot son iguales a las **leídas desde** ese spec, su cabecera concuerda con su propio cuerpo, y toda clase estampada en el mapeo coincide con el snapshot. |
| `capture-native-evaluability-snapshot.mjs --check` | La re-derivación extremo a extremo, ejecutable donde el workspace esté instalado. |
