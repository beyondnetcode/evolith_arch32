# Road to production — what is ready, what is not, and what only the owner can do

> **Bilingual Navigation:** English (this document) · [Versión en Español](./PRODUCTION_READINESS.es.md)

`GT-435` is the epic that says nothing has ever run in production. This page is the **preflight**:
everything about that path that can be established *without a server*, established, so the day the
VPS exists is not the day to discover the charts point at nothing.

It is deliberately not a plan. It is a list of facts with dates, and a list of decisions that are
not ours to make.

## What was broken, found on 2026-08-02 without a cluster

**Every Core chart named an image tag no workflow produces.**

| chart | asked for | published by CI | verdict |
|---|---|---|---|
| `evolith-core-api` | `0.0.2` | `latest`, `<sha>` | semver build exists but `docker-images.yml` **has never run** |
| `evolith-mcp` | `1.1.0` | `latest`, `<sha>` | same |
| `evolith-agent-runtime` | `0.1.0` | `latest`, `<sha>` | **worse — no `v0.1.0` git tag has ever existed**, so no path could produce it |

A `helm install` with default values would have met `ImagePullBackOff` on all three services. No
green CI could have revealed it: nothing has ever pulled these images.

Fixed by pointing the charts at `latest`, which `ci-cd.yml` pushes on every merge to `main`, and
guarded by `58-validate-deployable-images` so it cannot regress. The guard is static — it never
contacts a registry, because a check that needs a credential runs in one job and rots everywhere
else.

**Production must still override the tag.** `--set image.tag=<sha>` is the correct production
invocation: `latest` cannot be rolled back to a previous build, and `GT-448` requires a rollback
that has actually been exercised, which a floating tag makes impossible to demonstrate.

## What the preflight cannot tell you

That an image **can** be produced is provable here. That it **was** is a fact about a registry.
The guard says which of the two it is checking, per image, rather than implying the stronger one.

Before the first deploy, one command settles it:

```bash
# Requires a token with read:packages. If a tag is missing, push to main first.
gh api /orgs/beyondnetcode/packages/container/evolith-core-api/versions \
  --jq '[.[].metadata.container.tags[]] | unique'
```

## The Tracker has no image CD at all

Measured the same day, in `evolith_tracker`: three Dockerfiles, **zero workflows that build or
push them**, and charts referencing `ghcr.io/beyondnetcode/evolith-tracker-api:0.0.1`,
`…-web:0.0.1` and `evolith-tracker-gateway:local` — the last a tag no registry can ever serve.

This is the larger half of `GT-435` and it lives in the other repository. It is not a tag fix: the
CD does not exist. Tracked there rather than restated here, so one board owns it.

## Decisions and credentials — owner only

None of these is a code change, and none of them can be done from this repository.

| What | Why it is yours | Blocks |
|---|---|---|
| A reachable VPS | `72.60.63.240` answered nothing on 8000/443/80/ICMP when probed from two vantage points | `GT-435`, `GT-448`, `GT-324` |
| `COOLIFY_API_TOKEN` + the two deploy hooks | The `deploy` job no-ops with a warning until these repo secrets exist — deliberately, so it stays safe to merge | `GT-324` |
| Production database credentials and their store | Never in a chart, never in git | `GT-442` |
| Two Ed25519 seeds for the transparency ledger, in a secret store, plus a PVC | Key custody. The signing wire is built and off by default; it refuses to fall back to a development key, because a ledger that looks signed and proves nothing is worse than none | `GT-588` |
| A pen-test engagement | An outside party has to attempt it; we cannot self-certify this one | `GT-444` |

## What becomes measurable the day the server exists

Recorded now so the numbers get taken rather than estimated later:

- **RTO and RPO on a real DR restore** — `GT-443`'s last open criterion. The chaos drill already
  refuses to conflate them: it publishes MTTR and states that a container restart on one CI host is
  never RTO/RPO.
- **The gate false-block rate** — `GT-585`. The instrument is built and tested; it needs humans
  overriding real gate decisions, which needs production. `evolith calibrate report` computes it
  the day the labels exist.
- **The end-to-end path of the diagram** — a satellite change reaching a Core verdict through the
  Tracker, evidenced by one recorded run. That is `GT-435`'s own second criterion, and it is the
  only one that cannot be simulated.
