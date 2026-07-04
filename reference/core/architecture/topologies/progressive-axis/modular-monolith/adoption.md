# Modular Monolith — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Entry Criteria

Before adopting the modular monolith topology, teams must satisfy all entry criteria. These ensure the team and organization are ready for modular discipline.

- **Domain clarity:** Bounded contexts identified and documented; team ownership per context defined
- **Team structure:** Cross-functional teams aligned to bounded contexts; max 8-10 engineers per team
- **Infrastructure:** CI/CD pipeline capable of module-level testing; database provisioning per module
- **Governance:** Architecture Board established; review process for module boundaries defined
- **Tooling:** Module boundary linter configured; cross-module access scanner available

**Go/No-Go decision:** Architecture Board reviews entry criteria; approval required before adoption begins.

## Team Structure

Teams are organized around bounded contexts, not technical layers. Each team owns one or more modules end-to-end.

- **Team scope:** One bounded context per team (preferred) or closely related contexts
- **Responsibilities:** Design, development, testing, deployment, and operation of owned modules
- **Autonomy:** Teams make independent decisions within their module boundaries
- **Coordination:** Cross-module decisions escalated to Architecture Board

**Team topology:**

| Role | Responsibility | Count per team |
|------|---------------|----------------|
| Module Lead | Architecture, design decisions | 1 |
| Engineers | Implementation, testing | 4-6 |
| SRE | Operations, monitoring, incident response | 1 |
| Product Owner | Requirements, prioritization | 1 |

## Development Workflow

The development workflow enforces module boundaries at every stage.

1. **Design:** Module boundary review before implementation begins
2. **Implementation:** Module-level development with interface-first approach
3. **Testing:** Unit tests (module-scoped), integration tests (cross-module contracts), system tests (full stack)
4. **Review:** Code review checks module boundary compliance
5. **Deployment:** Module-level quality gates in CI/CD pipeline

**Key practices:**
- Interface-first development: define APIs before implementation
- Contract testing: verify cross-module contracts in CI
- Schema review: database changes reviewed by architecture board
- Event catalog: domain events documented and versioned

## Adoption Checklist

- [ ] Bounded contexts identified and documented
- [ ] Team structure aligned to contexts
- [ ] Module boundary linter configured
- [ ] Cross-module access scanner enabled
- [ ] CI/CD pipeline supports module-level testing
- [ ] Database provisioning per module configured
- [ ] Structured logging with correlation IDs implemented
- [ ] Health check endpoints for all modules defined
- [ ] Circuit breaker patterns implemented for cross-module calls
- [ ] Architecture Board review process established

## Exit Criteria for F2

A module is ready to exit F1 (modular monolith) and enter F2 (distributed services) when all exit criteria are met.

- **Readiness score >= 70%** sustained for 3 months
- **Business justification** approved by Architecture Board
- **Dedicated team** assigned and trained for service operation
- **Infrastructure** provisioned and load-tested
- **Migration plan** documented and reviewed
- **Rollback plan** tested and validated
- **Monitoring** established for both monolith and new service during transition

---

[Back to Modular Monolith Profile](./README.md)
