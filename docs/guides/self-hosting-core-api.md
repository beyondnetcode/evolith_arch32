# Self-hosting the Core API

> **Bilingual Navigation:** [Versión en Español](./self-hosting-core-api.es.md)

**You do not need this to use the CLI.** `evolith validate` evaluates locally against the
ruleset corpus bundled in the npm package; it opens no socket and needs no server. This guide
is for the REST surface and for multi-repository scenarios where several satellites query one
governed Core.

## What it is

The Core API is a stateless evaluation service: it receives an evaluation context and returns
an evaluation result. It stores no product, tenant or initiative state -- those are context,
never entities.

## Running it locally

The compose file under `product/infra/` brings up the supporting services (PostgreSQL and
friends). Check which services it actually declares before assuming a port:

```bash
grep -nE '^  [a-z0-9-]+:' product/infra/docker-compose.yml
```

> **This guide used to claim a one-command boot at `http://localhost:30080` via
> `./.harness/scripts/run-core-local.sh`.** That script does not exist, and no service in the
> compose file exposes that port. It was the repository's most prominent call to action for
> months. If you find another instruction here that does not run, it is a defect -- please
> open an issue.

For a full local stack including the Tracker, see
[`product/infra/docker-compose.fullstack.yml`](../../product/infra/docker-compose.fullstack.yml).

## Pointing the CLI at it

```bash
export EVOLITH_CORE_URL="http://localhost:30080/api/v1"
```

Only meaningful once a Core API is actually listening on that address.

## Kubernetes

Helm charts live under `product/infra/`. Cross-cluster addressing has measured gotchas
(`host.docker.internal` does not resolve inside kind pods, among others) -- see the
infrastructure notes rather than guessing.
