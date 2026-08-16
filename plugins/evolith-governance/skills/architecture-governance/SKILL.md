---
name: architecture-governance
description: Run Evolith architecture validation and report a coverage-honest verdict. Use when asked to validate architecture, check ADR compliance, run architecture or governance rules, check an SDLC phase gate, or answer "does this repo pass architecture review". Also before merging, releasing or promoting a phase. Reports skipped and errored rules as UNKNOWN, never as passed.
license: MIT
---

# Architecture governance with Evolith

Validate a repository against an executable rule corpus, and report the verdict **together
with its coverage**.

## The one thing that matters

`evolith validate` returns four counts: `checked`, `skipped`, `errored`, `total`.

**Never report a run as passing without stating `skipped` and `errored`.** Those rules were
not evaluated. Their result is UNKNOWN, not passed. A run with 133 checked and 26 skipped is
not "133 rules passed" -- it is "133 evaluated, 26 unknown", and a blocking rule among the
unknown is a failure.

This is the whole reason the tool exists. Every other linter collapses "passed" and "never
ran" into the same green, so their coverage and their compliance look identical.

## How to run it

The repository must be an Evolith satellite: it needs an `evolith.yaml`. If there is none,
say so rather than initializing one uninvited -- `evolith init` writes to the user's repo.

```bash
evolith validate --engine opa --format json
```

If the CLI is not installed, use `npx -y @beyondnet/evolith-cli validate --engine opa --format json`.

Prefer `--format json`: it prints exactly one envelope on stdout and never prompts.

## Reading the exit code

It is a taxonomy, not a boolean. Read it before reading the report.

| Code | Meaning | What to tell the user |
|:---:|---|---|
| `0` | passed | Report the verdict, and still state the skipped count |
| `1` | the tool failed | **No verdict exists.** Do not report compliance either way |
| `2` | the gate blocked | A real verdict, and it says no |
| `3` | invalid invocation | Nothing was evaluated. Fix the command |

`1` and `3` are not weaker forms of `2`. If you report them as "some issues found", you have
told the user their repository was examined when it was not.

## Reading the report

From the JSON envelope's `data`:

- `status` -- `passed`, `warning` or `failed`
- `rulesChecked` / `rulesSkipped` / `rulesErrored` / `rulesTotal`
- `skippedRuleIds` -- name them when the user asks what was not covered
- `issues[]` -- each with `blocking`, `ruleId`, `severity`, `file`
- `selection` -- which rulesets ran. `source: core-default` means the whole corpus;
  a caller selection means a narrower claim, and you must say so

## Narrowing the run

```bash
evolith rulesets                      # list what this Core carries
evolith validate --select <ref>       # evaluate only what you name
```

A ref this Core does not carry is a blocking failure, never a quiet pass. If the user asks
about a ruleset that does not resolve, report that nothing was evaluated against it.

## What this skill will not do

- It will not initialize a satellite, scaffold, or write files without being asked.
- It will not summarize a failed run as "mostly fine".
- It will not treat a low `checked` count as a good result. Low coverage with zero violations
  is the least informative outcome there is, and saying so is the point.
