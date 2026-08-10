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
artefacto de 412 filas y sobreestima el backlog de handlers en tantas reglas como el Core haya cerrado
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

Sobre **412 reglas** en 180 archivos de ruleset:

| Medida | Cantidad | Proporción |
|---|---|---|
| Reglas mapeadas a una debilidad ISO/IEC 5055 | 37 | 9,0% |
| — de ellas con mapeo directo | 8 | |
| — de ellas con mapeo parcial / proxy | 29 | |
| Reglas sin equivalente internacional (cada una con motivo declarado) | 375 | 91,0% |
| Reglas que un analizador existente podría decidir por completo | 46 | 11,2% |
| Reglas que un analizador podría decidir parcialmente | 23 | 5,6% |

**La fracción adoptada es el 9,0% del corpus.** Es un resultado real y es menor de lo que sugería la
premisa del gap, por una razón estructural: ISO/IEC 5055 mide la estructura interna del código fuente,
y 318 de nuestras 412 reglas no tratan de estructura de código. Son conformidad con ADR (163),
contratos de topología (66), invariantes de gobierno (55) y proceso de desarrollo (34). Ningún estándar
internacional modela "¿honraste el ADR-0092?", y ninguno lo hará.

Donde el estándar sí aplica, aplica bien: de las 26 reglas clasificadas como `code-structure`, 18
mapean y 13 son decidibles por analizador.

### Clases de regla, y la que faltaba

`ruleClass` dice QUÉ TIPO de cosa restringe una regla, y es **derivada, nunca enumerada**. Hasta GT-666
se derivaba de una tabla de prefijos de ruta con `governance` como valor por defecto, y los tres packs
de estándares internacionales no coincidían con ningún prefijo. Sus **16** reglas — NIST SP 800-218 (8),
ISO/IEC 5055:2021 (4), SLSA v1.0 Build track (4) — se publicaban por tanto como `governance`, llevando
el motivo de gobierno palabra por palabra:

> A governance invariant over Evolith artifacts (inheritance, open-core boundary, satellites,
> evidence). No international structural equivalent.

Cada cláusula de esa frase es falsa para una práctica del SSDF, y estaba en el único documento escrito
para que lo verifique alguien que no confía en nosotros. La clase `international-standard` las cubre
ahora, y se deriva del **bloque `standard` que el propio pack declara** y no de su directorio: una
declaración viaja con el archivo, así que un cuarto pack se clasifica bien caiga donde caiga. El
directorio es la segunda señal y se exige en la otra dirección — un `*.rules.json` bajo `standards/`
que lleve reglas sin declarar un estándar **hace fallar al generador**, en vez de caer al valor por
defecto. `65-validate-standards-rule-class.mjs` sostiene ambas direcciones en CI, con un fixture
negativo construido a partir del propio artefacto previo al arreglo.

El motivo de cada fila se deriva de esa misma declaración, de modo que nombra el estándar al que la
regla pertenece de verdad. Una frase por clase habría sido el mismo defecto un nivel más abajo: un
texto afirmado sobre todos los estándares, cierto de ninguno en particular.

### Adoptabilidad, cuando la regla declara su propio analizador

`analyser.adoptable` se derivó igual en GT-667, y por el mismo motivo: las cuatro filas `ISO5055-*` se
publicaban como `no` — *«el predicado es específico del repositorio o del producto y hay que
escribirlo»* — cuando GT-662…GT-664 ya habían entregado ese pack como **adaptador sobre el SARIF de un
analizador libre**. No había nada que escribir. El mapeo afirmaba, de las cuatro reglas cuyo diseño
entero es adoptar, justo lo contrario de lo que son.

La señal es el `enforce.config.analyser` de la propia regla, que llevan **4 de las 412 reglas** — esas
cuatro. `enforce.tool` era el campo equivocado y el corpus dice por qué: 10 reglas llevan bloque
`enforce`, y 6 de ellas nombran `dependency-cruiser` poniendo ellas mismas el predicado. `HXA-07`
declara la herramienta y luego escribe la regla — `from: ^src/(domain|core)/.+\.(spec|test)\.ts$`,
`to: node_modules/(@nestjs/testing|testcontainers)/`. Ahí dependency-cruiser es el *motor* y el
predicado es de Evolith, escrito contra la disposición de este repositorio, que es `no` según la
definición de arriba. Derivar de `enforce.tool` habría volteado `HXA-06` y `HXA-07` por el mero hecho de
que un binario de terceros aparezca en la cláusula. `enforce.config.analyser` nombra la otra relación,
la que el pack de ISO declara en su propia descripción: *Evolith aporta la traducción CWE→medida; el
analizador aporta los hallazgos.*

`yes` y no `partial`, deliberadamente. La ruta ESLint que se entrega alcanza solo 11 de las 138
debilidades, pero eso es **cobertura**, y el resto no es nuestro para escribir — lo cierra un tenant
apuntando el mismo adaptador a un analizador mejor. `adoptable` dimensiona trabajo de handler, y aquí
ese trabajo es cero. La cobertura se reporta donde corresponde: el bloque `notEvaluableHere` del pack y
el aviso de GT-569.

`analyser.examples` nombra ahora el analizador declarado (`eslint`, el valor por defecto que se
entrega) en vez de quedar vacío. Una fila `adoptable: yes` sin analizador nombrado es exactamente la
afirmación no falsable que este artefacto existe para quitar; y como el valor se lee de la regla, un
corpus configurado con `semgrep` se regenera diciendo `semgrep`, mientras que una lista enumerada
quedaría obsoleta en cuanto cambiara la configuración.

Una regla que declara analizador **y** además lleva un `adoptable` contradictorio en la tabla `MAP` del
generador rompe el build. Uno de los dos está mal, y ninguno debería ganar en silencio.

Las ocho reglas del SSDF y las cuatro de SLSA se quedan en `no`, y eso es un veredicto y no un olvido
— ver [Cómo leer una fila](#cómo-leer-una-fila).

## Re-dimensionar el backlog de handlers

El enunciado del gap dimensionaba el beneficio contra "~240 handlers por escribir". **Esa cifra ya está
retirada.** GT-595 hizo el triage del corpus y el backlog real, decidible desde el repositorio, son **52
reglas** — la clase `unimplemented-native`. De las 410 reglas que carga el triage del Core, 170 ya se
ejecutan y las otras 188 son 137 placeholders de generador solo documentales, 14 reglas sin check
redactado, 20 que requieren un sistema externo y 17 que requieren uno en ejecución.

(410, no 412: los dos archivos de regla única llevan sus metadatos en la raíz del documento, y el
cargador de corpus del Core no los lee. Aparecen en el mapeo como `not-in-snapshot`.)

60 → 48 el 2026-07-29: ocho reglas con forma de configuración recibieron handler (GT-595) y cuatro
reglas de límites de módulo ya traían una cláusula `enforce` completa que la normalización descartaba
(GT-632).

48 → 52 el 2026-08-09: las cuatro reglas de ISO/IEC 5055 (GT-662). Son `unimplemented-native` porque
ningún handler NATIVO las decide, lo cual es el diseño y no una carencia — llevan `enforce:` y las
decide un adaptador sobre el SARIF de un analizador libre. Las cuatro reglas del pack SLSA (GT-665) NO
cayeron aquí: `SlsaRuleHandler` las reclama, así que son `native-handler`.

Proyectar este mapeo sobre esa clase es la cifra que importa:

| Del backlog de 52 handlers | Cantidad |
|---|---|
| Decidibles hoy por un analizador estándar | 9 |
| Decidibles parcialmente (señal necesaria pero no suficiente) | 5 |
| Que hay que escribir de verdad | 38 |

Las 9 son `HXA-03` (estructura de capas — dependency-cruiser o ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (consultas de inyección y path traversal de CodeQL/Semgrep), `SEC-TIMING-01` (comparación
en tiempo constante) y las cuatro reglas `ISO5055-*`, que declaran ellas mismas su analizador. Las 5
parciales están listadas en `handlerBacklog.byEvaluabilityClass` del JSON de mapeo.

Es decir, adoptar vale **17,3% del backlog por completo, 26,9% incluyendo parciales** — 14 de 52 reglas
que no necesitan handlers a medida.

5 → 9 el 2026-08-09 (GT-667): las cuatro reglas de ISO/IEC 5055 se contaban como trabajo por escribir
mientras las decidía un analizador, así que `remainderToAuthor` exageraba el backlog real en cuatro. **La
proporción se movió porque se corrigió la descripción, no porque se adoptara nada** — entre ambas cifras
no se entregó nada, y leer este salto como avance sería leer una medición arreglada como un resultado.

Antes de eso la dirección era la contraria. Entre las doce reglas cerradas el 2026-07-29 están `HXA-01`,
`HXA-02`, `HXA-04` y `GIT-08`, que eran cuatro de las nueve que esta tabla ofrecía a un analizador:
Evolith escribió el handler primero, y ambas proporciones bajaron al encogerse el backlog. Lo que queda
sigue inclinándose hacia escribir, y las reglas de seguridad siguen apuntando a analizadores mejores que
cualquier cosa que escribiéramos.

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

Se deriva del `enforce.config.analyser` de la propia regla cuando la regla declara uno, y en caso
contrario de la tabla `MAP` del generador. `analyser.examples` nombra checks concretos para que la
afirmación sea falsable; en una regla que declara, es el analizador que la regla nombra.

**Las reglas del SSDF y de SLSA se quedan en `no`, y esas doce son el caso interesante**, porque
`international-standard` es la misma clase de regla que las cuatro que se movieron. No llevan bloque
`enforce` en absoluto: las deciden `SsdfRuleHandler` y `SlsaRuleHandler` de forma nativa. Y no es un
accidente de quién alcanzó a escribir qué — ningún analizador estándar responde *«¿cumple este
repositorio la práctica SSDF PW.4.1?»* ni *«¿se distribuye procedencia con cada artefacto publicado?»*.
Esos predicados leen los workflows, manifiestos y evidencias de este repositorio, que es «específico del
repositorio» palabra por palabra, así que el trabajo sí había que escribirlo, y se escribió (`GT-659`,
`GT-665`). `no` es el veredicto verdadero para ellas y `yes` lo es para las cuatro reglas de ISO/IEC
5055, y la diferencia se ve en el corpus en vez de argumentarse aquí: un pack declara analizador, los
otros dos entregan handler.

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
