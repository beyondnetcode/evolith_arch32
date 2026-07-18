> **Navegación Bilingüe:** [Read in English](./0117-bilingual-parity-scope-authored-sources.md)

# ADR-0117: La Paridad Bilingüe Aplica a Fuentes Autoradas, No a Proyecciones Generadas

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado

Aceptado (2026-07-18 — implementado en `develop`)

Este ADR registra una decisión de política que **ya está implementada**, no una
que se propone:

| Decisión | Commit | Artefacto |
|---|---|---|
| La paridad se acota a fuentes autoradas | `8481443b` | `.harness/scripts/lib/generated-doc-exclusions.mjs` |

El número de ADR fue reservado con antelación para el carril de normalización del
harness en [COORDINATION.md](../../../control-center/COORDINATION.md).

## Fecha

2026-07-18

## Contexto y Problema

`.harness/scripts/ci/suites/bilingual-suite.mjs` imponía una única regla: *todo
documento en inglés bajo `reference/` debe tener su contraparte en español.*
No tenía **ningún mecanismo de exclusión**: ni archivo de configuración, ni
glob, ni válvula de escape.

Mientras tanto, cuatro generadores escriben Markdown solo-inglés en ese mismo
árbol:

| Árbol | Archivos | Generador |
|---|---|---|
| `reference/knowledge/okf/**` | 15 | `.harness/scripts/knowledge-okf-project.mjs` |
| `reference/wiki/**` | 6 | `.harness/scripts/sync-wiki.mjs` |
| `reference/core/interfaces/how-to-*.md` | 5 | `src/tests/exploration/gen-howto.ts` |
| `reference/core/control-center/audits/COVERAGE_REPORT.md` | 1 | `.harness/scripts/coverage-dashboard.mjs` |

La regla era por tanto **insatisfacible por construcción**. Cumplirla exigía
escribir a mano hermanos en español que la siguiente build borraría, y ninguna
build podía dejar el árbol en verde. El guard estaba permanentemente en rojo.

Un guard permanentemente en rojo no informa nada. Su contenido informativo es
idéntico al de un guard permanentemente en verde: en ambos casos la salida es la
misma el día en que aterriza una regresión que el día anterior. Un documento
*autorado* recién desemparejado — un defecto real, exactamente lo que la regla
existe para atrapar — habría aterrizado invisible entre 38 fallos preexistentes,
indistinguible del pasivo acumulado. Esta es la clase de falsa señal que
`lib/coverage.mjs` cierra desde la dirección opuesta (un guard que no escanea
nada y sale en verde); la misma enfermedad, en espejo.

El problema no era que los generadores se portaran mal. Era que la política nunca
había declarado **de qué es política**.

## Objetivo y Alcance

Declarar el sujeto de la regla bilingüe con precisión suficiente para que una
máquina decida la pertenencia, y hacer que el guard pueda pasar.

**En alcance:** el predicado de alcance de la paridad bilingüe; un mecanismo de
exclusión declarado y razonado que no se pueda ensanchar en silencio; y el
registro de las dos superficies de falsa señal que esto dejó al descubierto.

**Fuera de alcance:** traducir cualquier árbol generado; modificar cualquier
generador; saldar el pasivo de traducción escrito a mano que persiste (ese pasivo
es real y sigue en rojo a propósito); y la pregunta de si el wiki debería
publicarse en dos idiomas, que se registra abajo como pregunta abierta en lugar
de decidirse.

## Opciones Consideradas

### Opción A: Hacer que los generadores emitan ambos idiomas

Enseñar a `knowledge-okf-project.mjs`, `sync-wiki.mjs` y `gen-howto.ts` a
escribir un `.es.md` junto a cada `.md`. *Rechazada.* Responde a la pregunta
equivocada. El bundle OKF es una proyección de `reference/knowledge/canonical/`,
y el wiki se ensambla a partir de documentos del repo que *ya* están bajo
paridad — así que su español ya existe aguas arriba. Emitir una segunda copia
aguas abajo crea dos lugares donde el mismo español puede pudrirse de forma
independiente, y nada los reconcilia. Además confunde el mecanismo con el
objetivo: traducir a máquina una proyección para satisfacer una regla sobre
documentos escritos por humanos produce un check verde y ningún lector. Donde un
árbol generado sí tiene audiencia en español, la forma correcta de esta opción es
estrecha y se preserva abajo como pregunta abierta.

### Opción B: Eliminar por completo la regla de paridad bilingüe

Borrar el guard; la paridad pasa a ser una convención. *Rechazada.* La regla no
está equivocada — apunta correctamente a la documentación autorada y solo
apunta mal a las proyecciones. Borrarla descartaría un invariante genuino para
escapar de un error de alcance, y convertiría el pasivo de traducción visible en
pasivo invisible. Un repositorio cuya gobernanza se publica en dos idiomas no
puede dejar que uno de ellos se rezague en silencio; esa es precisamente la
deriva que el guard existe para detectar.

### Opción C: Silenciar los fallos con un glob de ignorado amplio

Añadir `reference/knowledge/**`, `reference/wiki/**` a una lista de ignorados y
seguir. *Rechazada.* Un glob amplio deja que un árbol entero salga de la política
en una línea descuidada, y excluye por *ubicación* en vez de por *procedencia* —
así que un documento escrito a mano y depositado en un directorio excluido hereda
en silencio una exención que no merece. Tampoco declara razón alguna, con lo que
ningún lector futuro puede distinguir una exención meditada de una oportunista.

### Opción D: Acotar la política a fuentes autoradas, con exclusiones probadas (adoptada)

Declarar que la paridad es una propiedad de la fuente; dejar que las proyecciones
hereden la paridad que tengan sus fuentes; e implementar la exclusión de modo que
la pertenencia se *pruebe* en vez de afirmarse. Ver abajo.

## Decisión y Fundamento

### 1. La paridad pertenece a la fuente, no a la proyección

**La paridad bilingüe aplica a fuentes AUTORADAS. Los árboles generados heredan
la paridad que tengan sus fuentes, y quedan fuera del alcance de la regla.**

El bundle OKF deriva de `reference/knowledge/canonical/`; el wiki se ensambla a
partir de documentos del repositorio ya bajo paridad. Imponer la regla sobre el
derivado en vez del original es imponerla sobre la sombra en vez del objeto: se
puede hacer conformar la sombra mientras el objeto se pudre, y el objeto puede
ser perfecto mientras la sombra marca rojo. Si el español del corpus canónico
está completo, la cobertura en español de la proyección es un *hecho sobre el
proyector*, no un hecho que alguien deba imponer dos veces.

Esto además corrige la imputación de responsabilidad: cuando al bundle OKF le
falta español, el defecto accionable está en `reference/knowledge/canonical/` o
en el proyector — nunca en `reference/knowledge/okf/`, donde ningún humano puede
escribir.

### 2. Un derivado traducido no puede mantenerse correcto

El segundo argumento es más fuerte que el primero, porque no depende del gusto.

`knowledge-okf-project.mjs` **elimina todo su directorio de salida en cada
ejecución** y lo reescribe entero — el proyector es la única mano que escribe
allí. Cualquier `.es.md` commiteado en `reference/knowledge/okf/` queda por tanto
destruido por la siguiente proyección. La política estaría exigiendo un artefacto
que la build borra activamente: no meramente gravoso, sino incoherente.

Los archivos `how-to-*.md` tienen la misma forma con un fallo más lento. Se
regeneran a partir de captura en vivo de los bindings CLI/MCP/REST testeados, así
que un hermano en español escrito a mano no se borra — se **desactualiza en
silencio**, que es peor, porque sigue leyéndose como un documento mientras deja
de describir el sistema. Sus cuerpos son en todo caso mayormente invocaciones de
comandos y respuestas capturadas: texto literal sin nada que traducir.

`COVERAGE_REPORT.md` cierra el argumento por reducción. Es una medición escrita
por máquina *sobre la propia cobertura bilingüe*. Exigir que se traduzca para
satisfacer la regla sobre la que informa es circular.

### 3. El mecanismo de exclusión prueba la pertenencia en vez de afirmarla

Una lista de exclusiones es un agujero en un guard, así que la implementación
(`.harness/scripts/lib/generated-doc-exclusions.mjs`) está construida para ser
más difícil de abusar que la regla que relaja. Cuatro restricciones sostienen el
diseño:

- **Declarada en el código fuente, en ningún otro sitio.** Sin variable de
  entorno, sin archivo de configuración, sin glob leído de disco. Conceder una
  exención significa editar este archivo, lo que significa que aparece en un diff
  junto a su justificación. Una exención concedible desde fuera del código es una
  exención que nadie revisa.
- **Toda entrada debe nombrar su `generator` y su `reason`.** Una entrada a la
  que le falte cualquiera de los dos es rechazada en tiempo de carga por
  `validateEntries()`, no aceptada calladamente.
- **La pertenencia se verifica contra el contenido.** Donde un generador estampa
  su salida, la entrada declara ese `marker` y un archivo se excluye *solo si
  efectivamente lleva el sello*. Deposita un `.md` escrito a mano en
  `reference/wiki/` y no tendrá marcador, así que no se excluye y el guard falla
  sobre él — que es el resultado correcto.
- **Las exclusiones se reportan, nunca se ocultan.** `formatExclusionReport()`
  imprime cada entrada, su conteo de archivos y su razón en cada ejecución, pase
  o falle. Una exclusión silenciosa es un falso verde, que es la enfermedad que
  se está tratando.

### 4. Donde la pertenencia no se puede probar, la exclusión se rechaza a sí misma

Tal como se implementó primero en `8481443b`, la entrada OKF era la única que no
podía usar un marcador: su generador no estampaba nada, porque el bundle emite
frontmatter conforme a OKF y no un banner de procedencia. Esa entrada quedó en
cambio **fijada por conteo** a su inventario exacto (15 archivos).

La fijación era deliberadamente fail-closed. Si el conteo real derivaba en
*cualquiera* de las dos direcciones, la exclusión se **rechazaba por completo** y
los 15 archivos volvían al alcance — el guard poniéndose rojo en vez de estirarse
calladamente para cubrir lo que hubiera aparecido. Una exclusión que crece para
ajustarse a su contenido no es una exclusión; es un comodín con pasos extra.

La fijación por conteo es no obstante el **mecanismo más débil**, y este ADR lo
registra en vez de presentar las cuatro entradas como si alguna vez hubieran sido
equivalentes. Una fijación prueba solo *cuántos*, nunca *cuáles*: borra un archivo
proyectado y añade un archivo escrito a mano en el mismo commit y el conteo sigue
cuadrando. El arreglo era que `knowledge-okf-project.mjs` estampara un banner de
procedencia en cada archivo proyectado, volviendo la entrada OKF verificada por
marcador como las otras tres para poder retirar la fijación. Ese banner ya
aterrizó (`GENERATED by .harness/scripts/knowledge-okf-project.mjs`), y **las
cuatro entradas están ahora verificadas por contenido**; el razonamiento se
conserva aquí porque el principio — preferir la pertenencia probada a la
cardinalidad afirmada — gobierna cualquier entrada futura.

### 5. Lo que deliberadamente NO se decidió

- **La audiencia en español del wiki.** El wiki es el único árbol excluido que es
  una superficie de *publicación* con lectores, no un artefacto intermedio. Si su
  lectoría en español importa, el arreglo pertenece a `sync-wiki.mjs` emitiendo
  ambos idiomas desde las fuentes ya traducidas que ensambla — nunca a escribir a
  mano español junto a salida generada, que la siguiente sincronización
  sobrescribe. Esto se registra aquí como **pregunta abierta**, no como decisión.
- **El pasivo de traducción escrito a mano que persiste.** Los huérfanos bajo
  `reference/core/control-center/`, `reference/core/foundations/`, el conjunto
  `README`/`playbook-*`/`using-the-*` bajo `reference/core/interfaces/`, y
  `reference/knowledge/` son pasivo real y siguen en alcance. Silenciarlos por
  este mecanismo convertiría una factura honesta en un recibo falsificado.

## Evidencia y Criterios de Evaluación

La decisión se juzgó por tres criterios: si la regla pasa a ser *satisfacible*,
si la exclusión se puede ensanchar sin que un revisor lo note, y si el pasivo
restante permanece visible.

- `.harness/scripts/lib/generated-doc-exclusions.mjs` — cuatro entradas, cada una
  con `generator` y `reason`, las cuatro ahora verificadas por marcador.
- `node .harness/scripts/ci/04-check-bilingual-parity.mjs` imprime el reporte de
  exclusiones en cada ejecución: **27 archivos exentos**, detallados por entrada
  con el método de verificación declarado por entrada (`verified by: content
  marker "…"`).
- **La satisfacibilidad es el criterio de aceptación.** Antes del cambio ningún
  estado del árbol de trabajo podía hacer pasar el guard. Después, los fallos
  restantes del guard son todos defectos accionables en documentos autorados.
- **Prueba de tornasol.** Si los cuatro generadores fueran reemplazados mañana,
  la decisión — la paridad es una propiedad de las fuentes, las proyecciones la
  heredan — sigue en pie. Las cuatro entradas son las entradas actuales, no el
  sujeto de la decisión.

## Consecuencias, Riesgos y Concesiones

**Positivo.** El guard bilingüe puede pasar, así que puede volver a reportar una
regresión. Su rojo restante es una lista de pasivo de traducción real y
reparable, no un muro. La política ahora tiene un sujeto declarado, así que los
documentos futuros se pueden clasificar sin discusión, y toda exención llega con
su generador y su razón adjuntos.

**Negativo / concesiones aceptadas.** Existe ahora una lista de exclusiones donde
no había ninguna; es pequeña y se autovalida, pero sigue siendo un agujero y hay
que defenderla en revisión. Y los árboles generados son ahora, por política,
monolingües — un lector solo-español no obtiene bundle OKF ni wiki. Eso se acepta
aquí sobre la base de que ambos son derivados de fuentes que *sí* están
traducidas, pero es un costo real y la pregunta abierta del wiki existe por eso.

**Dos superficies de falsa señal que esto dejó al descubierto, registradas y no
resueltas aquí:**

- **`COVERAGE_REPORT.md` afirmaba completitud sobre un check en rojo.** Ha estado
  reportando `Coverage: 100.0% | Paired: 586` mientras el mismísimo guard que
  pretende medir fallaba sobre 38 archivos. Un dashboard que reporta 100% sobre
  un check que falla es una segunda superficie de falsa señal, y posiblemente
  peor que el guard rojo: el rojo al menos invita a investigar, mientras que un
  dashboard verde desincentiva activamente hacerlo.
- **Cinco documentos ocupan el slot en inglés pero están escritos en español.**
  `reference/knowledge/README.md`, `reference/knowledge/canonical/glossary/knowledge.md`
  y los tres `reference/core/interfaces/using-the-*.md` ocupan la ruta `.md`
  (inglés) mientras su contenido es enteramente español. Sus hermanos `.es.md`
  ahora existen, así que el guard pasa sobre ellos — pero las **versiones en
  inglés no existen**. El pasivo está invertido, y el guard no puede verlo,
  porque comprueba la presencia de un archivo y no el idioma de su contenido.

**Riesgos.**
- *La fijación por conteo da una garantía falsa.* Una fijación prueba
  cardinalidad, no identidad; un intercambio de igual tamaño pasa. Retirada para
  la entrada OKF por el banner de procedencia, y ya no disponible para entradas
  futuras por la regla declarada en §4.
- *La lista de exclusiones crece.* Cada entrada nueva es otro árbol fuera de
  política. Mitigado por los campos obligatorios `generator`/`reason` y el
  reporte siempre activo, que vuelven visible el crecimiento tanto en el diff
  como en el log de CI.
- *Verificación ciega al idioma.* Los cinco documentos invertidos muestran que un
  guard basado en presencia se puede satisfacer con un archivo en el idioma
  equivocado. Ninguna parte de esta decisión cierra eso; se nombra para que no se
  confunda con resuelto.

## Seguimiento Conocido

El banner de procedencia OKF descrito en §4 **ya aterrizó** — la entrada
`knowledge-okf-bundle` declara ahora un `marker` y ya no fija `expectedFiles`,
cerrando el hueco del intercambio de igual tamaño. Ninguna exclusión de la tabla
sigue fijada por conteo, y no debería añadirse ninguna: una entrada cuyo
generador no pueda estampar su salida debería ganar ese sello, no una fijación.

Por separado, `coverage-dashboard.mjs` debería derivar su cifra de cobertura del
mismo predicado de alcance que usa el guard, para que el dashboard no pueda
reportar 100% mientras el guard está en rojo. Hasta entonces, ambos discrepan por
construcción.

## Referencias

- `.harness/scripts/lib/generated-doc-exclusions.mjs` — la tabla de exclusiones y
  su comprobación en tiempo de carga `validateEntries()` (commit `8481443b`).
- `.harness/scripts/ci/suites/bilingual-suite.mjs` ·
  `.harness/scripts/ci/04-check-bilingual-parity.mjs` — el guard y su punto de
  entrada.
- `.harness/scripts/knowledge-okf-project.mjs` — el proyector que limpia su
  directorio de salida en cada ejecución; `--verify` vigila su propia deriva.
- `.harness/scripts/sync-wiki.mjs` · `src/tests/exploration/gen-howto.ts` ·
  `.harness/scripts/coverage-dashboard.mjs` — los otros tres generadores.
- `.harness/scripts/lib/coverage.mjs` — el patrón `allowEmpty` que este mecanismo
  de exclusión toma prestado deliberadamente.
- [COORDINATION.md](../../../control-center/COORDINATION.md) — el carril de
  normalización del harness que reservó este número de ADR.

## Decisiones y Estándares Relacionados

- [ADR-0105](./0105-okf-knowledge-projection.es.md) — establece el bundle OKF
  como una *proyección* del corpus canónico. Este ADR extrae la consecuencia
  directa: una proyección no carga su propia obligación de paridad.
- [ADR-0116](./0116-canonical-finding-and-authority-boundary.es.md) — el mismo
  carril de normalización del harness, y el mismo principio de fondo: una regla
  que nada puede satisfacer ni verificar no es una regla. Allí, prosa que no podía
  rechazar; aquí, un check que no podía pasar.
- [ADR-0115](./0115-emergent-knowledge-axis.es.md) — el corpus de conocimiento
  cuya capa canónica es la fuente portadora de paridad para la proyección OKF.
- `reference/core/control-center/audits/COVERAGE_REPORT.md` — el dashboard cuya
  discrepancia con el guard se registra arriba como consecuencia, no se resuelve.

---
[Volver al Nivel Superior](./README.es.md)
