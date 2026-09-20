# Phase-gate capture

> **Bilingual Navigation:** [Versión en Español](./phase-gate-capture.es.md)

The front page shows `evolith gate evaluate` and `evolith phase advance` on a freshly
initialized satellite. This file is that run, in full, so the animation can be checked
rather than believed — including the command that fails without `--core`, which the
animation only names in its caption.

## Conditions

| | |
|---|---|
| **Date** | 2026-09-20 |
| **Package** | `@beyondnet/evolith-cli@1.3.2`, resolved by `npx -y` from the public registry |
| **Where** | a clean `node:20` container: `/work/my-project` (empty, then `git init` and `evolith init --name my-project --yes`) next to `/work/evolith`, a checkout of this repository at `142b8324` (`main`, 2026-09-19), mounted read-only |
| **Gate definitions** | `reference/governance/sdlc/gates/gate-f1.json` … `gate-f5.json` from that checkout — the tarball does not carry them (see below) |
| **Exit codes** | `1` without `--core` — the tool failed · `2` with `--core`, twice — the gate blocked |

Reproduce it (Docker; the checkout can be any clone of this repository):

```bash
git clone --depth 1 https://github.com/beyondnetcode/evolith_arch32 evolith
docker run --rm -it -v "$PWD/evolith:/work/evolith:ro" -w /work node:20 bash
```

and, inside the container:

```bash
mkdir my-project && cd my-project && git init -q
npx -y @beyondnet/evolith-cli@1.3.2 init --name my-project --yes
npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery                   # exit 1
npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery --core ../evolith  # exit 2
npx -y @beyondnet/evolith-cli@1.3.2 phase advance --from discovery --to design --core ../evolith
echo $?                                                                              # 2
```

## What the two commands decide

- **`gate evaluate --phase discovery`** loads the Discovery gate (`business-sign-off`,
  `gate-f1.json`) and checks its mandatory evidence against the satellite. Six
  artifacts are required and none exists on a fresh repository, so the verdict is
  `FAILED` and the exit code is `2`. Each missing artifact is one `[error]` row that
  names the rule (`PG-1-EVIDENCE-*`), the artifact and the path where it was expected.
- **`phase advance --from discovery --to design`** runs the same gate and turns the
  verdict into a *transition proposal*: `NOT RECOMMENDED`. It moves nothing. The
  phase in `evolith.yaml` stays `phase-0`; the proposal is the record a human — or the
  Tracker — decides on.

Both exit `2` for the same reason `validate` does on the front page: a blocking
condition that is not met. Exit `1` is a different animal, and the first command
below shows it.

## The run, unedited

Terminal control sequences and the progress spinner are stripped; nothing else is
removed, reordered or reworded. `stderr` is quoted separately where it was not empty.

`init`, for the record — the satellite is five files and a `src/` directory:

```
$ npx -y @beyondnet/evolith-cli@1.3.2 init --name my-project --yes
│
◇  
│
◆  ✓ Satellite my-project initialised
│
●    Directory: /work/my-project
│
●    Artifacts creados: 5
│
●      - evolith.yaml
│
●      - README.md
│
●      - README.es.md
│
●      - package.json
│
●      - commitlint.config.mjs
│
▲  Warnings:
│
▲    - Conventional Commits are configured (commitlint.config.mjs) but nothing runs them: the `hooks` feature was not selected, so no commit-msg hook was installed. Wire commitlint into CI or re-run with --features hooks.

Next steps:
  1. evolith validate
  2. evolith agents install
  3. evolith sdlc handoff --from phase-0 --to phase-1

│
└  Done!

exit=0
```

The three commands the front page is about:

```
$ npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery
│
■  Error: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
│
└  Failed

exit=1

$ npx -y @beyondnet/evolith-cli@1.3.2 gate evaluate --phase discovery --core ../evolith
┌  Gate business-sign-off — phase discovery
│
●  Verdict: FAILED (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)
│
▲  [error] PG-1-EVIDENCE-prd @ PRD: Artifact not found: /work/my-project/docs/prd.md
│
▲  [error] PG-1-EVIDENCE-discovery-canvas @ Discovery Canvas: Artifact not found: /work/my-project/docs/discovery-canvas.md
│
▲  [error] PG-1-EVIDENCE-technical-feasibility-canvas @ Technical Feasibility Canvas: Artifact not found: /work/my-project/docs/technical-feasibility.md
│
▲  [error] PG-1-EVIDENCE-ballpark-estimation @ Ballpark Estimation: Artifact not found: /work/my-project/docs/ballpark-estimation.md
│
▲  [error] PG-1-EVIDENCE-moscow-prioritization-matrix @ MoSCoW Prioritization Matrix: Artifact not found: /work/my-project/.evolith/moscow/phase-0.json
│
▲  [error] PG-1-EVIDENCE-build-versus-compose-analysis @ Build-versus-Compose Analysis: Artifact not found: /work/my-project/.evolith/build-vs-compose.json
│
└  Evaluated by human at 2026-09-20T03:45:10.277Z

exit=2

$ npx -y @beyondnet/evolith-cli@1.3.2 phase advance --from discovery --to design --core ../evolith
┌  Phase Transition Proposal: discovery -> design
│
●  Transition is NOT RECOMMENDED
│
●  Evidence Verdict: FAILED (ruleset rulesets/sdlc/phase-gates.rules.json@2.0.0)
│
▲  [error] PG-1-EVIDENCE-prd @ PRD: Artifact not found: /work/my-project/docs/prd.md
│
▲  [error] PG-1-EVIDENCE-discovery-canvas @ Discovery Canvas: Artifact not found: /work/my-project/docs/discovery-canvas.md
│
▲  [error] PG-1-EVIDENCE-technical-feasibility-canvas @ Technical Feasibility Canvas: Artifact not found: /work/my-project/docs/technical-feasibility.md
│
▲  [error] PG-1-EVIDENCE-ballpark-estimation @ Ballpark Estimation: Artifact not found: /work/my-project/docs/ballpark-estimation.md
│
▲  [error] PG-1-EVIDENCE-moscow-prioritization-matrix @ MoSCoW Prioritization Matrix: Artifact not found: /work/my-project/.evolith/moscow/phase-0.json
│
▲  [error] PG-1-EVIDENCE-build-versus-compose-analysis @ Build-versus-Compose Analysis: Artifact not found: /work/my-project/.evolith/build-vs-compose.json
│
└  Proposed at 2026-09-20T03:45:12.501Z

exit=2
```

`stderr` of the first command (the other two wrote nothing to `stderr`):

```
[Nest] [AppModule] WARN GateRegistryService: failed to load the artifact registry: ENOENT: no such file or directory, open '/work/my-project/src/rulesets/sdlc/artifact-registry.json'
[Nest] [GateCommand] ERROR Command execution failed: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
Error: ENOENT: no such file or directory, scandir '/work/my-project/reference/governance/sdlc/gates'
    at fail (/root/.npm/_npx/34c429256ffa78f0/node_modules/@beyondnet/evolith-cli/dist/commands/gate/gate.command.js:61:23)
    at GateCommand.executeCommand (/root/.npm/_npx/34c429256ffa78f0/node_modules/@beyondnet/evolith-cli/dist/commands/gate/gate.command.js:92:20)
    …
```

## What in here is a defect

- **`gate evaluate` and `phase advance` need a checkout of this repository on disk.**
  Without `--core` (or `EVOLITH_CORE_PATH`, or a profile), the CLI composes
  `reference/governance/sdlc/gates` and `src/rulesets/sdlc/artifact-registry.json` off
  the satellite itself, finds neither, and exits `1`. The tarball carries
  `rulesets/sdlc/phase-gates.rules.json` — the fallback the validator would use — but
  the resolver never reaches it. The MCP server fixed the same defect for its own
  package in GT-705 by bundling both trees; the CLI did not get that change. Tracked
  as GT-714 on the [gap board](../../reference/core/control-center/gaps/gap-tracking.md).
- **An `exit 1` that reads as a broken tool is the correct code**, and it is why the
  front page insists on the difference: `1` and `3` mean the repository was *not
  evaluated*. The defect is that a fresh install reaches it, not that it is reported.
- **`init` prints one label in Spanish inside an English run** (`Artifacts creados: 5`).
  Cosmetic; noted so nobody reads it as a transcription error.

Everything else above is behaviour by design: the six artifacts are the Discovery
gate's mandatory evidence, and a satellite that has none of them should not be
recommended for Design.
