# ADR-0126: El mandato bilingüe se estrecha a una superficie de entrada

> **Navegación Bilingüe:** [English](./0126-bilingual-entry-surface.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-16 |
| **Decisores** | Architecture Board |
| **Historia técnica** | Un mandato de traducción de alcance repo-wide valorado en 783 pares, gastado en documentos que nadie abre, que además hacía fallar por construcción el primer PR de cualquier contribuyente externo |

<!-- implementation-status: .harness/scripts/lib/bilingual-scope.mjs,.harness/scripts/ci/suites/bilingual-suite.mjs,.harness/scripts/ci/66-validate-bilingual-sync.mjs -->
> **Estado de implementación en este repositorio: completo** (2026-08-16).
> El módulo de alcance es `.harness/scripts/lib/bilingual-scope.mjs`; ambos guards lo leen y ambos
> imprimen el denominador liberado en cada ejecución. Verificado corriendo cada guard antes y
> después del cambio: la ejecución previa reportó los cuatro defectos que este ADR predice,
> incluido el desbalance de `<div>` en `README.es.md` sobre el que dos guards bilingües hechos a
> propósito llevaban dando verde.

## Status

Aceptado — 2026-08-16. En vigor e implementado.

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

Dieciséis documentos, declarados por nombre en `.harness/scripts/lib/bilingual-scope.mjs`. El
listón para pertenecer: **un extraño alcanza el documento en dos clics desde la página de
aterrizaje del repositorio, o el proyecto lo trata como autoritativo.** La lista son los seis
ficheros de aterrizaje y salud comunitaria, los ocho hubs de `reference/` enlazados directamente
desde `README.md` — la espina navegacional, que es lo que los hace alcanzables siquiera — y
`gap-tracking.md`, incluido no porque lo lea un extraño sino porque el proyecto trata ambas
mitades como su registro de verdad, que es el defecto por el que GT-702 registró el guard 66.

### 2. Nada fuera de la superficie se borra, se mueve ni se sella

Los 783 pares liberados conservan su `.es.md` exactamente donde está. El ahorro viene de
**terminar la aplicación, no de tocar los ficheros.** Una migración que edite 712 ficheros para
dejar constancia de que ya no se comprueban costaría más que el mandato al que sustituye.

### 3. Un guard estrechado debe imprimir lo que dejó de comprobar

Esta es la cláusula que sostiene el peso. Estrechar el alcance de un guard y dejar su mensaje de
éxito intacto produce el defecto exacto contra el que este repositorio vende un producto: un
tick verde que se lee como *el corpus es consistente* cuando significa *un corpus que ya no miro
no fue examinado*. **Una regla que no se evaluó no es una regla que pasó.**

Ambos guards imprimen por tanto el denominador liberado en cada ejecución, pase o falle, y sus
líneas de éxito declaran el límite de lo que afirman, con palabras:

```
bilingual scope (ADR-0126): 16/16 entry-surface document(s) enforced; 783 EN/ES pair(s)
outside the entry surface were NOT evaluated — their state is unknown, not verified.
```

Cualquier futuro consumidor del módulo de alcance lo imprime también. Un módulo de alcance cuya
salida se puede consumir en silencio es un módulo de alcance que se consumirá en silencio.

### 4. La profundidad comprada con la amplitud: balance de marcado en la superficie de entrada

El presupuesto liberado al soltar 783 pares compra una comprobación que el mandato antiguo no
podía permitirse ejecutar en ningún sitio: etiquetas HTML de bloque que abren y nunca cierran, o
que cierran sin haber abierto, sobre los dieciséis documentos de la superficie de entrada y sus
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
ranura y ediciones a un solo lado. Algunos van a derivar. Ese es el coste aceptado, y los guards
lo dicen en voz alta en lugar de dejar que un tick verde insinúe lo contrario.

**Reversible.** El alcance es un único array exportado. Re-ensancharlo es un cambio de una línea
más la deuda de traducción acumulada mientras tanto — que es exactamente por lo que el conteo
liberado se imprime en cada ejecución en vez de calcularse una vez y olvidarse.

## ADRs relacionados

- ADR-0125 — un único registro de artefactos indexado por slug: la misma preferencia por una
  lista declarada frente a una regla que infiere la pertenencia a partir de rutas.
