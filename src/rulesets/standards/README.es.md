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
| `native-evaluability-snapshot.json` | Clase de evaluabilidad por regla, **generada** desde el triage vivo del Core por `rule-corpus-triage.spec.ts`, que la fija byte a byte. Nunca se edita a mano: se recaptura con `UPDATE_EVALUABILITY_SNAPSHOT=1 npx jest src/application/validators/rule-corpus-triage.spec.ts` desde `src/packages/core-domain`. |
| `build-iso-5055-mapping.mjs` | El generador. `--check` falla cuando la tabla se quedó atrás del corpus. |
| `iso-5055-mapping.test.mjs` | La guarda. `node --test src/rulesets/standards/iso-5055-mapping.test.mjs`. |

Aquí no se reproduce texto de ISO/IEC 5055 ni de ISO/IEC 25010. Solo se registran identificadores CWE,
nombres CWE de MITRE y pertenencia a cada medida.

## Procedencia de las 138

La lista se extrajo programáticamente de las Tablas 1–4 de **OMG Automated Technical Debt Measure,
Version 2** (documento OMG `ptc/23-09-04`), que enumera las mismas debilidades. La unión de las cuatro
tablas es exactamente 138, coincidiendo con la cifra que publica CISQ: Seguridad 74, Fiabilidad 74,
Eficiencia de Desempeño 18, Mantenibilidad 31 — el solapamiento entre Seguridad y Fiabilidad es lo que
hace que la unión sea menor que la suma. La fecha y el método de extracción constan en el JSON.

## Resultado

Sobre **388 reglas** en 174 archivos de ruleset:

| Medida | Cantidad | Proporción |
|---|---|---|
| Reglas mapeadas a una debilidad ISO/IEC 5055 | 37 | 9,5% |
| — de ellas con mapeo directo | 8 | |
| — de ellas con mapeo parcial / proxy | 29 | |
| Reglas sin equivalente internacional (cada una con motivo declarado) | 351 | 90,5% |
| Reglas que un analizador existente podría decidir por completo | 42 | 10,8% |
| Reglas que un analizador podría decidir parcialmente | 23 | 5,9% |

**La fracción adoptada es el 9,5% del corpus.** Es un resultado real y es menor de lo que sugería la
premisa del gap, por una razón estructural: ISO/IEC 5055 mide la estructura interna del código fuente,
y 313 de nuestras 388 reglas no tratan de estructura de código. Son conformidad con ADR (162),
contratos de topología (66), invariantes de gobierno (51) y proceso de desarrollo (34). Ningún estándar
internacional modela "¿honraste el ADR-0092?", y ninguno lo hará.

Donde el estándar sí aplica, aplica bien: de las 26 reglas clasificadas como `code-structure`, 18
mapean y 13 son decidibles por analizador.

## Re-dimensionar el backlog de handlers

El enunciado del gap dimensionaba el beneficio contra "~240 handlers por escribir". **Esa cifra ya está
retirada.** GT-595 hizo el triage del corpus y el backlog real, decidible desde el repositorio, son **48
reglas** — la clase `unimplemented-native`. Las otras 338 son 136 placeholders de generador solo
documentales, 14 reglas sin check redactado, 20 que requieren un sistema externo, 17 que requieren uno
en ejecución y 151 que un handler nativo ya evalúa.

Proyectar este mapeo sobre esa clase es la cifra que importa:

| Del backlog de 48 handlers | Cantidad |
|---|---|
| Decidibles hoy por un analizador estándar | 5 |
| Decidibles parcialmente (señal necesaria pero no suficiente) | 5 |
| Que hay que escribir de verdad | 38 |

Las 5 son `HXA-03` (estructura de capas — dependency-cruiser o ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (consultas de inyección y path traversal de CodeQL/Semgrep) y `SEC-TIMING-01`
(comparación en tiempo constante). Las 5 parciales están listadas en
`handlerBacklog.byEvaluabilityClass` del JSON de mapeo.

Es decir, adoptar vale **10% del backlog por completo, 21% incluyendo parciales** — 10 de 48 reglas que
no necesitan handlers a medida. No es el orden de magnitud que esperaba el gap, pero es una reducción
concreta y nominada, y apunta las reglas de seguridad hacia analizadores mejores que cualquier cosa que
escribiéramos.

El backlog bajó de 60 a 48 porque se *escribieron* handlers, no porque se recortara el denominador:
`HXA-01/02/04/05` (GT-632) y `GIT-08` junto con otras siete reglas de configuración (GT-595) pasaron a
`native-handler`, que es también por qué cuatro de los nueve nombres de antes ya no están en la lista.

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
