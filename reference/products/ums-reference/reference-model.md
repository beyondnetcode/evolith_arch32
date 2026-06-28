# UMS — Reference Model

> **Bilingual navigation:** [Versión en Español](./reference-model.es.md)
> **Parent:** [UMS Reference Hub](./README.md)

How Evolith treats UMS as the official applied reference model, and which architectural elements are eligible for inheritance into Core. For the source narrative (history, deprecation of the To-Do sandbox), see [`ums-reference-model.md`](../../knowledge/demo/ums-reference-model.md).

---

## 1. The Boundary

| Lives in this corpus | Lives in UMS |
|---|---|
| Universal architecture principles | Product code, schemas, deployment |
| Core ADRs and rulesets | Product ADRs and product-local ADRs |
| Multi-topology rules | Concrete topology realisation (`modular-monolith`, maturity F1) |
| SDLC governance | Product backlog and release operations |
| Quality gates and thresholds | Observed metrics, scan results, release notes |

UMS is *evidence*. Authority remains here.

---

## 2. What Can Be Inherited

UMS is consumed by this corpus through four well-bounded mechanisms:

1. **ADR candidates** discovered in a running product and promoted only after review by the Architecture Board.
2. **Runtime-specific canonical patterns** whose scope is clearly identified as runtime-only.
3. **Traceability practices** linking business capability → decision → code pattern → operations.
4. **Concrete extraction signals** from a modular product with meaningful security boundaries.

Anything outside these four cannot enter Core simply because UMS uses it. Runtime selections in UMS — SQL Server, Redis, .NET 8 — are not normative for the corpus unless an accepted Evolith artifact explicitly promotes them.

---

## 3. Architectural Concerns Validated by UMS

| Concern | UMS Evidence |
|---|---|
| Bounded contexts and product scope | 8 contexts (EP-01..EP-08): Identity, Authorization, Configuration, Audit, Console/Admin, Approvals, Compliance, IGA |
| Clean / Hexagonal Architecture | Domain ↔ Application ↔ Infrastructure separation across every context |
| Query and command boundary | GraphQL queries + REST commands (protocol-level CQRS) |
| Security and accountability | Authorization graph, immutable audit, RLS, idempotency |
| Progressive adoption | Modular Monolith now → extract to microservices when criteria are met |
| Delivery realism | Executable API / web app, setup guide, tests, operational artifacts |

---

## 4. Promotion Workflow

When a UMS pattern is being considered for Core:

1. **Sponsor** files an Adoption Case at [adoption-cases.md](../../knowledge/adoption-cases.md).
2. **Architecture Board** reviews against universality and runtime-neutrality criteria.
3. If accepted → an Evolith ADR is drafted; the source is referenced as evidence, not authority.
4. Once the ADR is `Accepted`, the pattern enters Core.
5. The UMS upstream remains free to keep the runtime-specific implementation.

No Core artifact may cite a UMS file as a normative source. UMS appears in Core ADRs only under the `Evidence` or `Inspiration` section, never under `Decision`.

---

## 5. Open Items

- Maintain EN ↔ ES parity of UMS setup guidance upstream; surface any drift as a Known Gap here.
- Audit Core ADRs quarterly to ensure they cite UMS only as evidence, not authority.

---

[Back to UMS Reference Hub](./README.md)
