> **Navegación bilingüe:** [Read in English](./README.md)

# @beyondnet/evolith-repo-facts

Extractor de hechos estructurales para el Core Evaluation Engine de Evolith (**GT-589**, bajo [ADR-0101](../../../reference/core/architecture/adrs/core/0101-core-stateless-evaluation-engine.es.md)).

## Por qué este paquete vive fuera del Core

El Core es un **motor de evaluación stateless**. No puede adquirir una dependencia de filesystem, no puede invocar un indexador por shell y no puede guardar estado entre evaluaciones. Por eso la profundidad de la evaluación `architecture` acababa donde acaba un `grep`: la costura de enforcers OSS devuelve una lista plana de `Violation` por corrida de herramienta, que responde exactamente las preguntas para las que se configuró esa herramienta y ninguna más.

Este paquete mueve la mitad con efectos —el recorrido del filesystem, el programa del compilador, el reloj— **fuera** del Core, y le entrega al Core un valor terminado y con content-hash:

```
repositorio ──▶ evolith-repo-facts ──▶ RepoFacts ──▶ EvaluationContext.repoFacts ──▶ Core
   (aquí)           (aquí)              (valor)          (inline)                (solo consulta)
```

Es la forma idéntica que el Core ya usa para ficheros fuente (`OverlayFileSystem`, ADR-0080) y para señales de calidad (`Evidence`, [ADR-0111](../../../reference/core/architecture/adrs/core/0111-quality-signal-provider-port.es.md)). **Refuerza** la statelessness en vez de erosionarla.

## Qué compra una base de hechos que no compre una lista de violaciones

`RepoFacts` es *consultable*: lleva el grafo de módulos **y** el grafo de símbolos, así que un ruleset puede hacer una pregunta para la que nadie compiló una regla. Las dos consultas que hoy viven en `core-domain`:

| Consulta | Pregunta | Por qué las comprobaciones de imports no pueden responderla |
|---|---|---|
| `findImportCycles` | *¿Qué cadena concreta de módulos forma un ciclo?* | Una violación plana dice que hay un ciclo; la base de hechos nombra `a → b → c → a`. |
| `findSymbolBoundaryCrossings` | *¿Qué **símbolo** prohibido alcanza una frontera, y por qué cadena?* | Las comprobaciones de imports son fichero-a-fichero y **por pares**. Si `cli → application` y `application → infrastructure` son ambas legales, ninguna arista aislada es una violación — y sin embargo el CLI alcanza el pool de conexiones. |

## Uso

```bash
# extracción (paso de orquestación del consumidor — el Core nunca lo ejecuta)
npx evolith-repo-facts --root . --include src --out facts.json --print-hash

# artefacto byte-reproducible (quita la marca de tiempo de extracción, que de
# todos modos queda fuera del content hash)
npx evolith-repo-facts --root . --include src --out facts.json --omit-timestamp
```

```ts
import { extractTypeScriptFacts } from '@beyondnet/evolith-repo-facts';

const repoFacts = extractTypeScriptFacts({ rootDir: process.cwd(), include: ['src'] });

const context = {
  kinds: ['architecture'],
  repoFacts,                       // miembro inline y determinista del contexto
  architecture: {
    symbolBoundaries: [{
      id: 'cli-must-not-reach-infrastructure',
      fromModules: ['src/cli/**'],
      forbiddenSymbolModules: ['src/infrastructure/**'],
    }],
  },
};
```

## Determinismo

- Los ficheros se visitan en orden y toda colección emitida va ordenada.
- `contentHash` es `sha256` sobre `canonicalizeRepoFacts()`, que **excluye** el propio hash y `provenance.extractedAt`. Dos indexaciones del mismo árbol coinciden en el hash.
- El Core trata `contentHash` como **procedencia opaca** y nunca lo recalcula — igual que trata `Provenance.artifactHash` en `Evidence`. La reproducibilidad viene de la pureza más una entrada estable; el hash es el *nombre* de esa entrada.

## Hechos de drift (GT-594)

El esquema `1.1.0` añade las dos familias de hechos sobre las que se calculan las señales de drift de IA. Ambas son opcionales; ambas participan en la forma canónica, así que el mismo árbol hashea distinto bajo `1.0.0` y `1.1.0` — por eso un delta de conformidad se niega a comparar bases de hechos con esquema o versión de indexador distintos.

| Hecho | Qué es | Qué NO es |
|---|---|---|
| `SymbolFact.structuralHash` / `structuralSize` | Digest del flujo normalizado de nodos sintácticos de la declaración — identificadores, literales, comentarios y trivia borrados. La igualdad es la relación de **clon Type-2**. | No es una puntuación de similitud. No hay umbral que ajustar, y una copia con una sentencia cambiada simplemente no coincide. |
| `RepoFacts.errorMasking` | Ocurrencias de una lista cerrada y puramente sintáctica: `empty-catch`, `catch-discards-error`, `promise-catch-swallow`, `ts-directive-suppression`, `any-assertion`, `non-null-assertion`. | No es un juicio. Aquí no se decide si una ocurrencia está *mal*. |

`errorMasking` **ausente** y `errorMasking: []` significan cosas distintas y se mantienen separadas: ausente es un extractor que no miró (el Core reporta la señal como `not-measurable`), vacío es un extractor que miró y no encontró ninguna (un cero medido). Usa `scanErrorMasking: false` para producir el primer caso deliberadamente.

El Core calcula duplicación, refactor:copia y enmascaramiento de errores sobre estos hechos en `core-domain/src/evaluation/contracts/drift-signals.ts`. Cada señal se emite como `Evidence` canónica con `determinism: 'probabilistic'` y sin calibración, así que `admitEvidenceBlocking` de GT-584 la reporta **advisory** y le niega un veredicto bloqueante. El conteo es exacto; la imputación que se hace a partir de él no lo es, y solo la medición (GT-585) puede cambiar eso.

## Indexador

El primer (y por ahora único) indexador es la **API del compilador de TypeScript** — el mismo motor de resolución de tipos que usa `scip-typescript` — emitiendo ids de símbolo con forma SCIP (`<módulo>#<nombre>`). No necesita binario externo ni red.

**No implementado:** ingerir un payload `index.scip` real, y una vía tree-sitter para lenguajes sin type checker. Ambos son segundos adaptadores detrás de la misma forma de salida.

---

[Paquetes del Core](../) · [ADR-0101](../../../reference/core/architecture/adrs/core/0101-core-stateless-evaluation-engine.es.md)
