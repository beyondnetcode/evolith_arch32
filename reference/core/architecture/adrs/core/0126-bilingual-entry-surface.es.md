# ADR-0126: El mandato bilingüe se estrecha a una superficie de entrada

> **Navegación Bilingüe:** [English](./0126-bilingual-entry-surface.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-16 |
| **Decisores** | Architecture Board |
| **Historia técnica** | Un mandato de traducción de alcance repo-wide valorado en 783 pares, gastado en documentos que nadie abre, que además hacía fallar por construcción el primer PR de cualquier contribuyente externo |

<!-- implementation-status: .harness/scripts/lib/bilingual-scope.mjs,.harness/scripts/ci/suites/bilingual-suite.mjs,.harness/scripts/ci/66-validate-bilingual-sync.mjs -->
> **Estado de implementación en este repositorio: parcial** (2026-08-16).
> El módulo de alcance es `.harness/scripts/lib/bilingual-scope.mjs` y ambos guards lo leen, pero
> solo uno de ellos satisface la cláusula 3: `.harness/scripts/ci/suites/bilingual-suite.mjs`
> imprime el denominador liberado en cada ejecución, y
> `.harness/scripts/ci/66-validate-bilingual-sync.mjs` no lo imprime en ninguno de sus tres modos
> — ver [Brechas pendientes](#brechas-pendientes). Lo que sí quedó verificado corriendo cada guard
> antes y después del cambio es la detección: la ejecución previa reportó los cuatro defectos que
> este ADR predice, incluido el desbalance de `<div>` en `README.es.md` sobre el que dos guards
> bilingües hechos a propósito llevaban dando verde. La mitad del denominador de la cláusula 3
> **no está verificada**, porque todavía no está implementada en ambos lados.

## Status

Aceptado — 2026-08-16. En vigor; implementado salvo la mitad del denominador de la cláusula 3
en `66-validate-bilingual-sync`, registrada más abajo como brecha abierta.

## Contexto

Todo `.md` en inglés bajo `reference/` estaba obligado a llevar un gemelo `.es.md`, y todo par
existente en cualquier punto del árbol estaba obligado a moverse por ambos lados dentro de un
mismo rango. Medido el día de esta decisión: **527** documentos en inglés bajo `reference/`,
**783** pares EN/ES existentes en todo el repo, **1.661** ficheros markdown escaneados por
ejecución.

El mandato no era incorrecto. Era inasumible, y cobraba todo su coste en la puerta equivocada.
Tres efectos, todos medidos en vez de argumentados:

**1. Gastaba el presupuesto de traducción en documentos que nadie lee.** En los 14 días previos
el repositorio sirvió **66 vistas a 14 visitantes únicos**. `traffic/popular/paths` lista un
único `.es.md` entre ellos. El mandato compraba paridad sobre un corpus cuya audiencia medida es
aproximadamente cero, al mismo tiempo que la propia superficie de aterrizaje estaba rota.

**2. No cazaba el defecto que más falta hacía cazar.** `README.es.md` perdió su
`<div align="center">` de apertura y conservó el `</div>` de cierre en la línea 24. GitHub
renderizaba la página de aterrizaje en español alineada a la izquierda mientras la inglesa salía
centrada — lo primero que veía un visitante hispanohablante, mal, durante todo el tiempo que
tardó alguien en notarlo. Ambos guards bilingües estuvieron verdes todo ese tiempo, y
**correctamente**: el fichero existía, su conteo de encabezados coincidía y se leía como español.
Todas sus preguntas eran sobre el TEXTO del documento. Ninguna preguntaba si el marcado seguía
cerrando. La amplitud se compró a costa de la profundidad en el único fichero que más importa.

**3. Hacía fallar por construcción el primer PR de un contribuyente externo.**
`66-validate-bilingual-sync` rechaza un rango que edita un documento en inglés sin su gemelo
español. Su escotilla de escape es un mapa `ALLOWED` indexado por SHA de commit — y un extraño no
puede rellenarlo, porque el SHA no existe hasta después de commitear, y editar un fichero de
guard no es algo que deba tener que hacer una primera contribución. Aplicada a 783 pares, esa
escotilla era un muro justo delante de las personas que el proyecto intenta atraer.

## Decisión

### 1. El mandato aplica a una superficie de entrada, no a un prefijo de ruta

Diecisiete documentos, declarados por nombre en `.harness/scripts/lib/bilingual-scope.mjs`. El
listón para pertenecer: **un extraño alcanza el documento en dos clics desde la página de
aterrizaje del repositorio, o el proyecto lo trata como autoritativo.** La lista son los seis
ficheros de aterrizaje y salud comunitaria, el quickstart, los ocho hubs de `reference/`
enlazados directamente desde `README.md` — la espina navegacional, que es lo que los hace
alcanzables siquiera — y los dos documentos de gaps, incluidos no porque los lea un extraño sino
porque el proyecto trata ambas mitades como su registro de verdad, que es el defecto por el que
GT-702 registró el guard 66.

**Enmendado el 2026-08-16: el catálogo se suma al board.** El primer corte nombró solo a
`gap-tracking.md`, y eso no cubría el caso que citaba. La divergencia real de GT-702 estaba en
`gap-reference-catalog.es.md`, que afirmó un conteo refutado durante un día entero de checks en
verde; el board nunca fue el fichero que divergió. Medido después de aterrizar este ADR, una
edición de un solo lado del catálogo se detectaba **0** veces — el guard ya no podía cazar su
propio caso de reproducción. `gap-reference-catalog.md` entra por tanto en la superficie según
el listón de arriba, no relajándolo: el catálogo es autoritativo, es a donde enlaza cada fila
del board para su evidencia, y que sus dos mitades se contradigan es justo el fallo para el que
existe el guard.

### 2. Nada fuera de la superficie se borra, se mueve ni se sella

Los 783 pares liberados conservan su `.es.md` exactamente donde está. El ahorro viene de
**terminar la aplicación, no de tocar los ficheros.** Una migración que edite 712 ficheros para
dejar constancia de que ya no se comprueban costaría más que el mandato al que sustituye.

### 3. Un guard estrechado debe imprimir lo que dejó de comprobar

Esta es la cláusula que sostiene el peso. Estrechar el alcance de un guard y dejar su mensaje de
éxito intacto produce el defecto exacto contra el que este repositorio vende un producto: un
tick verde que se lee como *el corpus es consistente* cuando significa *un corpus que ya no miro
no fue examinado*. **Una regla que no se evaluó no es una regla que pasó.**

Ambos guards deben por tanto imprimir el denominador liberado en cada ejecución, pase o falle, y
sus líneas de éxito deben declarar con palabras el límite de lo que afirman. La línea es
`formatCoverageReport`, en el módulo de alcance:

```
bilingual scope (ADR-0126): 17/17 entry-surface document(s) enforced; 783 EN/ES pair(s)
outside the entry surface were NOT evaluated — their state is unknown, not verified.
```

Cualquier futuro consumidor del módulo de alcance lo imprime también. Un módulo de alcance cuya
salida se puede consumir en silencio es un módulo de alcance que se consumirá en silencio.

**Hoy solo uno de los dos guards lo hace.** `.harness/scripts/ci/suites/bilingual-suite.mjs`
importa `summarizeCoverage` y `formatCoverageReport` e imprime esa línea incondicionalmente
(línea 280). `.harness/scripts/ci/66-validate-bilingual-sync.mjs` importa únicamente
`ENTRY_SURFACE` e `isEntrySurface` (línea 55) y no imprime denominador alguno en ninguno de sus
tres modos. Declara el límite con palabras — *«Pairs outside it were not examined»* — pero nunca
la cifra, que es la mitad que hace visible el coste de volver a ensanchar. La exigencia de arriba
se mantiene exactamente como está escrita; el guard 66 la incumple, y el incumplimiento queda
registrado en [Brechas pendientes](#brechas-pendientes).

### 4. La profundidad comprada con la amplitud: balance de marcado en la superficie de entrada

El presupuesto liberado al soltar 783 pares compra una comprobación que el mandato antiguo no
podía permitirse ejecutar en ningún sitio: etiquetas HTML de bloque que abren y nunca cierran, o
que cierran sin haber abierto, sobre los diecisiete documentos de la superficie de entrada y sus
dos mitades. Deliberadamente estrecha — solo `div`, `details`, `table`, `picture`, `figure`; los
elementos vacíos y en línea quedan excluidos porque `README.md` los usa sin cerrar y de forma
legítima; el código en bloque se elimina primero o cada heredoc se convierte en un hallazgo.

### 5. Añadir a la superficie es una decisión, no una comodidad

Añadir un fichero es barato de escribir y caro de mantener: compromete al mantenedor a espejar
cada edición futura, para siempre. Un documento que no supera la prueba de los dos clics no entra
en la lista para poner verde un guard rojo. Sacar uno exige decir aquí por qué.

### 6. Lo que este ADR NO decide

No deprecia el español como lengua del proyecto, no decide el destino del corpus liberado, y no
afirma que los pares liberados sean consistentes. Su estado es **desconocido**. Si acaban
re-aplicándose, generándose o envejeciendo es una decisión aparte que debería tomarse con datos
de audiencia que este proyecto todavía no tiene.

## Consecuencias

**Ganado.** El primer PR de un contribuyente externo ya no choca con un guard cuya escotilla de
escape no puede alcanzar. La superficie de aterrizaje gana una comprobación de marcado que habría
cazado el defecto del `<div>` el día que aterrizó. `SECURITY.md` y `MASTER_INDEX.md` — ficheros
de raíz que la vieja regla de huérfanos, limitada a `reference/`, nunca examinó — adquirieron
gemelos en español como consecuencia directa de ser nombrados, tras haber estado sin ellos toda
la vida del mandato que se suponía que los garantizaba.

**Cedido.** 783 pares dejan de comprobarse en paridad estructural, corrección de idioma por
ranura y ediciones a un solo lado. Algunos van a derivar. Ese es el coste aceptado, y la suite
bilingüe lo dice en voz alta y con la cifra, en lugar de dejar que un tick verde insinúe lo
contrario. El guard 66 lo dice solo con palabras, sin el número — la mitad abierta de la
cláusula 3.

**Reversible.** El alcance es un único array exportado. Re-ensancharlo es un cambio de una línea
más la deuda de traducción acumulada mientras tanto — que es exactamente por lo que la cláusula 3
exige el conteo liberado en cada ejecución en vez de calcularlo una vez y olvidarlo. La suite
cumple esa exigencia; el guard 66 todavía no.

## Brechas pendientes

La cláusula 3 está en vigor e implementada a medias. La mitad abierta, con su localización:

- **`66-validate-bilingual-sync` no publica el denominador liberado.**
  `.harness/scripts/ci/66-validate-bilingual-sync.mjs:55` importa únicamente `ENTRY_SURFACE` e
  `isEntrySurface` de `.harness/scripts/lib/bilingual-scope.mjs`; no importa ni
  `summarizeCoverage` ni `formatCoverageReport`, y ninguna de sus tres salidas imprime un conteo
  liberado — autotest en la línea 260, modo rango en las líneas 341-345, barrido de auditoría en
  las líneas 403-406. Cada una de esas líneas reporta el tamaño de la superficie de entrada y la
  frase «Pairs outside it were not examined»: la mitad de palabras de la cláusula, no la mitad de
  cifras. Una ejecución del guard 66 por sí sola no puede decirle a un operador cuántos pares
  liberó el alcance.
  **Para cerrarla:** importar los dos helpers de cobertura e imprimir `formatCoverageReport(...)`
  en cada salida de `main()`, tal como ya hace `.harness/scripts/ci/suites/bilingual-suite.mjs:280`.

Hasta que eso aterrice, la garantía de la cláusula 3 se sostiene para la suite y no para el
guard 66, y este ADR no afirma lo contrario.

## ADRs relacionados

- ADR-0125 — un único registro de artefactos indexado por slug: la misma preferencia por una
  lista declarada frente a una regla que infiere la pertenencia a partir de rutas.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
