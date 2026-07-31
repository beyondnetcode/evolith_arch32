> **Bilingual Navigation:** [Ver versión en Español](./README.es.md)

# @beyondnet/evolith-repo-facts

Structural fact extractor for the Evolith Core Evaluation Engine (**GT-589**, under [ADR-0101](../../../reference/core/architecture/adrs/core/0101-core-stateless-evaluation-engine.md)).

## Why this package exists outside the Core

The Core is a **stateless evaluation engine**. It must not grow a filesystem dependency, must not shell out to an indexer, and must not hold state between evaluations. So the depth of the `architecture` evaluation used to end where a `grep` ends: the OSS-enforcer seam returns a flat `Violation[]` per tool run, which answers exactly the questions the tool was configured to ask and no others.

This package moves the side-effectful half — the filesystem walk, the compiler program, the clock — **outside** the Core, and hands the Core a finished, content-hashed value:

```
repository ──▶ evolith-repo-facts ──▶ RepoFacts ──▶ EvaluationContext.repoFacts ──▶ Core
   (here)          (here)              (value)          (inline)                (queries only)
```

This is the identical shape the Core already uses for source files (`OverlayFileSystem`, ADR-0080) and for quality signals (`Evidence`, [ADR-0111](../../../reference/core/architecture/adrs/core/0111-quality-signal-provider-port.md)). It **reinforces** statelessness instead of eroding it.

## What a fact base buys that a violation list does not

`RepoFacts` is *queryable*: it carries the module graph **and** the symbol graph, so a ruleset can ask a question nobody compiled a rule for. The two queries shipped in `core-domain` today:

| Query | Question | Why import checks cannot answer it |
|---|---|---|
| `findImportCycles` | *Which concrete chain of modules forms a cycle?* | A flat violation says a cycle exists; the fact base names `a → b → c → a`. |
| `findSymbolBoundaryCrossings` | *Which forbidden **symbol** does a boundary reach, and through which chain?* | Import checks are file-to-file and **pairwise**. When `cli → application` and `application → infrastructure` are both legal, no single edge is a violation — yet the CLI reaches the connection pool. |

## Usage

```bash
# extract (a consumer-side orchestration step — the Core never runs this)
npx evolith-repo-facts --root . --include src --out facts.json --print-hash

# byte-reproducible artifact (drops the extraction timestamp, which is
# excluded from the content hash anyway)
npx evolith-repo-facts --root . --include src --out facts.json --omit-timestamp
```

```ts
import { extractTypeScriptFacts } from '@beyondnet/evolith-repo-facts';

const repoFacts = extractTypeScriptFacts({ rootDir: process.cwd(), include: ['src'] });

const context = {
  kinds: ['architecture'],
  repoFacts,                       // inline, deterministic member of the context
  architecture: {
    symbolBoundaries: [{
      id: 'cli-must-not-reach-infrastructure',
      fromModules: ['src/cli/**'],
      forbiddenSymbolModules: ['src/infrastructure/**'],
    }],
  },
};
```

## Determinism

- Files are visited in sorted order and every emitted collection is sorted.
- `contentHash` is `sha256` over `canonicalizeRepoFacts()`, which **excludes** the hash itself and `provenance.extractedAt`. Two indexings of the same tree therefore agree on the hash.
- The Core treats `contentHash` as **opaque provenance** and never recomputes it — exactly as it treats `Provenance.artifactHash` on `Evidence`. Reproducibility comes from purity plus a stable input; the hash is the *name* of that input.

## Drift facts (GT-594)

Schema `1.1.0` adds the two fact families the AI-drift signals are computed over. Both are optional; both participate in the canonical form, so the same tree hashes differently under `1.0.0` and `1.1.0` — which is why a conformance delta refuses to compare fact bases whose schema or indexer version differ.

| Fact | What it is | What it is NOT |
|---|---|---|
| `SymbolFact.structuralHash` / `structuralSize` | Digest of the declaration's normalized syntax-node stream — identifiers, literals, comments and trivia erased. Equality is the **Type-2 clone** relation. | Not a similarity score. There is no threshold to tune, and a copy with one statement changed simply does not match. |
| `RepoFacts.errorMasking` | Occurrences of a closed, purely syntactic list: `empty-catch`, `catch-discards-error`, `promise-catch-swallow`, `ts-directive-suppression`, `any-assertion`, `non-null-assertion`. | Not a judgement. Whether an occurrence is *wrong* is not decided here. |

`errorMasking` **absent** and `errorMasking: []` mean different things and stay apart: absent is an extractor that did not look (the Core reports the signal `not-measurable`), empty is an extractor that looked and found none (a measured zero). Pass `scanErrorMasking: false` to produce the former deliberately.

The Core computes duplication, refactor:copy and error-masking over these facts in `core-domain/src/evaluation/contracts/drift-signals.ts`. Every signal is emitted as canonical `Evidence` with `determinism: 'probabilistic'` and no calibration, so GT-584's `admitEvidenceBlocking` reports it **advisory** and refuses it a blocking verdict. The count is exact; the imputation drawn from it is not, and only measurement (GT-585) can change that.

## Indexer

The first (and currently only) indexer is the **TypeScript compiler API** — the same type-resolution engine `scip-typescript` drives — emitting SCIP-shaped symbol ids (`<module>#<name>`). It needs no external binary and no network.

**Not implemented:** ingesting a real `index.scip` payload, and a tree-sitter path for languages without a type checker. Both are second adapters behind the same output shape.

---

[Core packages](../) · [ADR-0101](../../../reference/core/architecture/adrs/core/0101-core-stateless-evaluation-engine.md)
