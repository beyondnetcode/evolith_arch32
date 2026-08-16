# Quickstart

> **Bilingual Navigation:** [Versión en Español](./evolith-quickstart.es.md)

Three commands. No server to boot, no database, no cluster.

## 1. Install

```bash
npm install -g @beyondnet/evolith-cli
```

The package installs two equivalent bins: `evolith` (the documented name) and `evolith-cli`.
Requires Node 20.

## 2. Initialize a satellite

A *satellite* is any repository governed by an Evolith Core. Initializing writes an
`evolith.yaml` into the current directory and nothing else.

```bash
evolith init --name my-sat --yes
```

`--yes` runs without prompts, which is also implied by a non-TTY stdin or `--format json`.
To scaffold into a new directory instead, pass it positionally: `evolith init my-sat --yes`.
`--dry-run` writes nothing.

## 3. Validate

```bash
evolith validate --engine opa
```

Real output from `@beyondnet/evolith-cli@1.3.0` against a freshly initialized satellite, in a
container with nothing but Node:

```
Rules: 133 checked / 26 skipped / 0 errored / 159 total
37 blocking issue(s)
exit code 2
```

## What the numbers mean

**Expect findings on the first run.** A freshly initialized satellite is a baseline, not a
pass: many rules assume a fuller repository than a phase-0 project has.

The number that matters is **skipped**. Those 26 rules were not evaluated, so their result is
*unknown* -- not *passed*. Nine of the 37 blocking issues are exactly that: rules the engine
could not decide, reported as failures rather than rounded up into the green. Most linters do
not draw this distinction, which is why their coverage and their compliance look identical.

Exit codes are a taxonomy, not a boolean:

| Code | Meaning |
|:---:|---|
| `0` | passed |
| `1` | the tool failed -- no verdict was produced |
| `2` | the gate blocked -- a real verdict, and it says no |
| `3` | invalid invocation -- nothing was evaluated |

`1` and `3` are **not** weaker forms of `2`. They mean your repository was never examined.

## Next steps

- Narrow what runs: `evolith rulesets` lists the packs, and `--select <ref>` evaluates only
  the ones you name. Naming nothing evaluates the whole corpus this Core carries, reported as
  `selection.source: core-default`.
- Put it in CI: see [Use it as a PR gate](../../README.md#use-it-as-a-pr-gate).
- Serve it to an AI agent: `npx -y @beyondnet/evolith-mcp` over stdio.
- Run the Core API yourself -- only needed for the REST surface and multi-repository
  scenarios, never for the CLI: [Self-hosting the Core API](./self-hosting-core-api.md).
