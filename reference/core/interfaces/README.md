# Evolith Core — Interface How-To

> Bilingual navigation: [Versión en Español](./README.es.md)

How to drive Evolith Core across its three surfaces — **CLI** (`evolith …`), **MCP**
(`evolith-*` tools), and **REST** (`/api/v1/…`).

## Start here — readable guides (by interface)

Written for a person learning to use Evolith Core: each command/tool/endpoint
explained in prose, with its options, examples from simple to advanced, and
common combinations.

- **[Usando la CLI](using-the-cli.md)** — the 25 CLI commands and subcommands.
- **[Usando MCP](using-the-mcp.md)** — the 51 `evolith-*` tools, for agents.
- **[Usando la API REST](using-the-rest-api.md)** — the 27 endpoints, for integrators / the Tracker.

## Reference catalog (by phase, generated)

A machine-derived cross-reference — the same operation on all three surfaces,
with the SHAPE of its real captured response — organized by SDLC phase. Kept
drift-proof by a CI check (see below). Use it to look up an operation's exact
request and response shape across surfaces; use the readable guides above to
*learn*.

## Two layers

| Layer | File pattern | Nature | Answers |
| --- | --- | --- | --- |
| **Reference catalog** | `how-to-<phase>.md` | **Generated** | "What is operation X, on each surface — its options, a worked request, and the shape of the real response?" |
| **Phase playbook** | `playbook-<phase>.md` | **Curated** | "How do I work this phase — what do I run, in what order, and what do I expect?" |

The playbook is the narrative journey; it links into the catalog for the exact
command/options/examples. The catalog is the dictionary.

## Why the catalog cannot drift

The catalog is **derived from the certified source of truth**, never hand-written:

1. `reference/core/control-center/audits/surface-parity-matrix.json` — which
   operations exist and on which surfaces.
2. `src/tests/exploration/bindings.ts` — the **exact CLI/MCP/REST request** the
   conformance tester executes for each operation.
3. `src/tests/exploration/.out/howto-capture.json` — each MCP tool's live
   `inputSchema` **and the real ADR-0073 response envelope** every surface
   returned (emitted by the exploration test run).
4. The `@Option` (CLI) and `@ApiProperty` (REST) decorators — the flag/field tables.

A conformance test (`exploration.spec.ts` → *"the generated interface how-to docs
are up to date"*) regenerates the docs and **fails CI if the committed files
diverge** from the source of truth. So a documented invocation is, by
construction, one that actually runs and returns what it says.

What the response blocks show is the **shape** of the captured envelope, not its
content: every field name is real, values carry their type (`"<string>"`,
`"<number>"`), and an array appears as one element merging every element observed.
What a rule counts or a gate decides belongs to the workspace being evaluated, not
to the interface, and printing it here would misinform the reader *and* make this
check unfalsifiable — the same number differs between two machines, so the docs
could never be regenerated into agreement. Values that ARE the contract stay
literal: `success`, `command`/`tool`, the error `code`, `schemaVersion`. The check
therefore still goes red when a field appears or disappears, a type changes, an
option table changes, or an operation's identity changes.

## Target architecture the how-to reflects

- **CLI** — the reference surface; every command emits an ADR-0073 envelope with
  `--format json` and exits non-zero on a failing verdict.
- **MCP** — full parity with the CLI for agent-invokable actions (filesystem/
  scaffolding included); mutative tools require `{ apply, approvalToken }`.
- **REST** — the middleware the Evolith Tracker consumes; exposes the Core's
  stateless evaluation commands + data behind a global envelope.

## Regenerating

```bash
npm run test:exploration        # boots the 3 surfaces, captures schemas + responses
npx ts-node --transpile-only \
  --project src/tests/exploration/tsconfig.json \
  src/tests/exploration/gen-howto.ts all
```

## Phases

- [Discovery](how-to-discovery.md) · _playbook: pending_
- [Design](how-to-design.md) · _playbook: pending_
- [Construction](how-to-construction.md) · [playbook](playbook-construction.md)
- [QA](how-to-qa.md) · _playbook: pending_
- [Release](how-to-release.md) · _playbook: pending_

---

[Back to Evolith Core hub](../README.md)
