> **Bilingual Navigation:** [Ver versión en Español](./0110-masstransit-v8-apache-license-pin.es.md)

# ADR-0110: Stay on MassTransit v8 (Apache-2.0); v9 Is Commercial and Non-Sublicensable

> **Agent Signature:** Architect Agent (Winston)

## Status
Approved — **scheduled for re-evaluation before 2026-12-31** (see *Review Trigger*)

## Date
2026-07-09

## Context and Problem
ADR-0108 made MassTransit the sole owner of the message topology for the master-data projection
flow (MMS → UMS/Tracker). That makes MassTransit a **load-bearing dependency of the suite**, so its
licensing is an architectural concern, not a procurement footnote.

In April 2025 the MassTransit project announced that **v9 moves to a commercial license** under a
new company, **Massient**, with general availability in Q1 2026. Verified facts, from the license
agreement and product pages rather than from secondary commentary:

1. **v8 remains Apache-2.0.** It receives security patches and critical bug fixes **through at
   least the end of 2026**. Apache-2.0 is irrevocable: the grant on already-published v8 artifacts
   cannot be withdrawn retroactively. What expires is *maintenance*, not the *licence*.
2. **v9 requires a license file to run** (`MT_LICENSE` / `SetLicense()`); it is *source-available*,
   not open source.
3. **The v9 licence is `non-exclusive, non-transferable, non-sublicensable`**, and §5 forbids
   redistribution "except as embedded in Licensee's applications." §2 further states that when
   application ownership transfers to a client, "the client must purchase their own license."
4. **A 100% discount exists for organizations under USD 1M gross annual revenue** (and non-profits
   under USD 1M expenses): full functionality, community support only.

The trap this ADR exists to disarm: **"we are an open-source project, so we are covered."** We are
not. The string *"open source"* appears **nowhere** in the v9 licence agreement as a qualifying
category. The 100% discount is an **economic** criterion (revenue), not a philosophical one, and it
is published on the **pricing page — not in the licence agreement** — making it a revocable
commercial offer rather than a contractual right.

Two consequences follow, and they are what actually bind Evolith:

- **The discount does not reach our adopters.** MMS, UMS and Tracker are open-source products meant
  to be *redistributed and self-deployed*. Because the licence is non-sublicensable, anyone
  deploying Evolith on v9 must obtain their own licence — and v9 will not start without one. Our
  code would remain open while *running it* would not. That negates the reason the suite is open.
- **The discount is conditional on our own failure.** It lapses at renewal once gross revenue
  crosses USD 1M. Depending on it is a bet against Evolith succeeding: the day the product works is
  the day the dependency becomes a cost.

This is not an indictment of Massient's model, which is a legitimate way to fund maintenance. It is
a *fit* problem: the model is designed for products that are **deployed**, and Evolith is a set of
libraries and services that are **redistributed**.

Current state, verified in the monorepo at the time of writing:

| Product | MassTransit | Licence |
| --- | --- | --- |
| MMS (producer) | `8.2.5` | Apache-2.0 |
| UMS (consumer) | `8.3.1` | Apache-2.0 |
| Tracker (consumer) | `8.3.1` | Apache-2.0 |

No project references v9. (A `9.1.2` present in the local NuGet cache is not referenced by any
`.csproj` in this workspace.)

## Decision
1. **Pin the Evolith suite to MassTransit v8.x (Apache-2.0).** No project may take a dependency on
   MassTransit `>= 9.0.0` without superseding this ADR.
2. **Adopting v9 is a governance decision, never a maintenance one.** A routine dependency bump
   (`dotnet outdated`, Dependabot, "it's the latest") is explicitly *not* sufficient authority.
3. **Make the constraint mechanically enforceable**, not merely documented: hoist the MassTransit
   version into Central Package Management (`Directory.Packages.props`) at the monorepo root, so
   the version is declared **once** and any move to v9 appears as a one-line diff in review. Today
   it is declared in three separate `.csproj` files and has already drifted (`8.2.5` vs `8.3.1`).
4. **Keep the framework boundary thin.** MassTransit stays confined to each product's
   `DependencyInjection` composition root and its `ConsumerDefinition` classes. Domain and
   application layers must not reference MassTransit types, so that a future replacement is a
   contained change.

## Consequences
- **Positive:** zero licence cost and zero licence obligation, for Evolith **and for every adopter**,
  in perpetuity. The Apache-2.0 grant on v8 cannot be revoked. The open-source distribution story
  stays intact.
- **Positive:** the failure mode is now *named*. What protects us is **the version**, not our
  open-source status — so the risk is watchable ("nobody bumps MassTransit to 9.x") rather than a
  vague sense of immunity that an automated dependency update would silently violate.
- **Negative / trade-offs:** we forgo v9's features, performance work and commercial support. We
  accept that, after end-2026, v8 receives **no security patches**. That is the single real
  deadline this ADR creates, and it is tracked as a review trigger, not left implicit.
- **Operational:** CI should fail on any MassTransit `9.x` resolution once CPM lands. Until then the
  constraint is review-enforced.

## Review Trigger
Re-open this ADR when **any** of these fires, whichever comes first:
- **2026-10-01** — a deliberate checkpoint one quarter before v8 maintenance lapses, leaving room to
  act rather than react.
- A **CVE affecting MassTransit v8** is published after end-of-maintenance.
- Evolith's gross annual revenue approaches **USD 1M** (the point at which the v9 discount would
  lapse anyway, and at which paying for support may become rational for *our own* deployments — a
  separate question from what we impose on adopters).
- The **OpenTransit** community fork of v8 reaches production maturity.

## Alternatives Considered
- **Adopt v9 under the sub-USD-1M 100% discount.** Rejected. It buys nothing today (v8 already costs
  zero), it does not extend to adopters (non-sublicensable), it is a pricing-page offer rather than a
  contractual right, and it lapses precisely when Evolith succeeds. Cost tomorrow, no benefit today,
  and the open-source distribution story lost in between.
- **Adopt v9 and ask adopters to license it themselves.** Rejected. It converts an open-source suite
  into one that cannot be run without a third-party commercial agreement — the definition of the
  problem, not a solution to it.
- **Switch to the OpenTransit fork of v8 now.** Deferred, not rejected. The fork is young and
  unproven; forking is a real option *after* v8 maintenance lapses, and we lose nothing by waiting
  since v8 is functionally sufficient today. Recorded as a review trigger.
- **Drop the framework for the raw `RabbitMQ.Client`.** Deferred. Our usage is narrow — one
  `Publish`, two consumers, transactional outbox and inbox dedup — so this is tractable, but it
  would require reimplementing the outbox/inbox and retry semantics we currently get for free.
  Kept as the escape hatch that decision 4 (thin boundary) preserves.
- **Do nothing and revisit when it breaks.** Rejected. The end-2026 maintenance cliff is known and
  dated; discovering it via an unpatched CVE is a choice, not an accident.

## References
- ADR-0108 (MassTransit owns the message topology) · ADR-0106 (master tenant context projections) ·
  ADR-0033 (transactional outbox).
- [MassTransit Commercial Software License Agreement](https://massient.com/license) — §1
  (non-sublicensable), §2 (client must purchase their own licence), §5 (redistribution).
- [Massient pricing](https://massient.com/) — sub-USD-1M revenue 100% discount (pricing page, not
  the licence agreement).
- [MassTransit v9 announcement](https://masstransit.massient.com/introduction/v9-announcement) ·
  [License configuration](https://masstransit.massient.com/configuration/license) — "MassTransit v9
  (and beyond) requires a license to use."
- [OpenTransit](https://dev.to/nakib/introducing-opentransit-a-free-open-source-fork-of-masstransit-v8-2eb3) —
  community fork of v8.
- Verified in-repo versions: `beyondnetcode/evolith-products` @ `351ad4ee`.
