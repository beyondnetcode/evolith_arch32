# Migration Record: To-Do Sandbox to UMS

> Bilingual navigation: [Espanol](./migration-from-todo-to-ums.es.md)

## Scope

This record documents the retirement of the former local demo and the adoption of [UMS](https://github.com/beyondnetcode/ums) as the official applied reference model.

## Legacy References Found and Disposition

| Former artifact group | Former purpose | Disposition |
|---|---|---|
| `src/apps/todo-api/`, `src/apps/todo-web/` | Runnable To-Do implementation | Removed; executable reference is maintained in UMS |
| `src/libs/aop/` and local workspace configuration | Support code for the old local demo | Removed with the obsolete local implementation |
| `product/research/demo/functional/` | To-Do vision, glossary, use cases, and domain scope | Removed; use UMS product documentation |
| `product/research/demo/project/` | To-Do PRD and backlog | Removed; use the UMS documentation index |
| `product/research/demo/technical/` | To-Do verification and bounded-context map | Removed; use UMS architecture portal |
| Root README, master index, getting-started, onboarding, glossary, and taxonomy | Links and descriptions of a local sandbox | Updated to route to UMS and state the authority boundary |
| Architecture examples and runtime documentation | Mentions presenting a local sandbox as implementation proof | Updated to identify UMS or runtime-specific patterns appropriately |

## Migration Plan Executed

1. Declare UMS as the official product-level, executable reference.
2. Replace navigation from local sandbox pages to the UMS reference hub and public UMS sources.
3. Remove local To-Do source and domain documentation to eliminate competing demo narratives.
4. Preserve a short migration record so historical references can be understood.
5. Keep universal rules in this repository; keep UMS implementation and setup in UMS.
6. Validate links, Markdown character policy, and Mermaid diagrams after migration.

## Risks and Follow-up

| Risk or gap | Response |
|---|---|
| Readers mistake UMS implementation selections for universal architecture policy | Require the reference-versus-applied-model boundary in navigation and taxonomy |
| External UMS links or setup evolve independently | Link to UMS-owned entry points rather than duplicating commands here |
| English and Spanish UMS setup information may diverge | Track and resolve alignment in UMS; call out the gap in the UMS model document |
| New product evidence is promoted without scope control | Require ADR or canonical-pattern review before treating evidence as reusable guidance |

## Recommendation

Maintain this repository as the technology-neutral architectural upstream and UMS as the living enterprise implementation reference. Promote proven UMS lessons selectively through ADRs and canonical patterns, with explicit runtime and product-scope boundaries.

---
[Back to UMS Reference Hub](./README.md)
