# Template: Release Notes

> **Bilingual navigation:** [Versión en Español](./release-notes-template.es.md)
> **Phase:** 5 — Delivery and Operations
> **Exit gate:** Production Live (Monitoring Nominal)
> **Parent:** [Artifact Templates](./README.md)

---

## About This Template

Release Notes are the formal communication artifact that accompanies every production deployment. They are required before the Production Live gate can be declared. Audience is both technical (operations team, engineering lead) and non-technical (product owner, stakeholders). Each section must be written accordingly.

Release Notes are stored in version control tagged to the release commit. They must comply with the [SDLC Documentation Best Practices](../03-documentation/sdlc-documentation-best-practices.md) versioning rule: document state maps exactly to the release tag.

---

## Section 1 — Blank Template

```markdown
# Release Notes — [Product Name] [Version]

> Release date: [YYYY-MM-DD]
> Release type: [Major | Minor | Patch | Hotfix]
> RC signed off: [Date of RC stamp]
> Deployment target: [Production | Staging | UAT]
> Deployed by: [Engineer or automated pipeline]
> Rollback version: [Previous stable version tag]

---

## 1. Release Summary

[2–4 sentences. What does this release deliver for the business?
Write at the product level, not the code level.
Product Owners and sponsors will read this section.]

---

## 2. New Features

### [EP-XX — Bounded Context Name]

#### [Feature Name]

[Brief description of what the feature does for the user.
Business language. Link to the Functional Story for detail.]

- Delivered by: [FS-XX — Story Title]
- Available to: [Persona or role]

---

## 3. Improvements

| Area | Description |
|---|---|
| [Component] | [What was improved and the observable effect] |

---

## 4. Breaking Changes

> If there are no breaking changes, write: "None in this release."

| Change | Affected | Migration Required | Migration Guide |
|---|---|:---:|---|
| [API endpoint renamed or removed] | [Consumer name] | Yes | [Link or inline instructions] |
| [Database schema change] | [Service name] | Yes | [Migration script name] |

---

## 5. Bug Fixes

| Issue | Description | Severity |
|---|---|:---:|
| [ISS-XXX] | [What was broken and how it behaves now] | [High / Medium / Low] |

---

## 6. Dependency Updates

| Package | Previous | Updated | CVE Fixed |
|---|:---:|:---:|:---:|
| [Package name] | [vX.X.X] | [vY.Y.Y] | [CVE-XXXX or N/A] |

---

## 7. Deployment Instructions

### Prerequisites

- [ ] [Prerequisite 1: e.g. Database migration script must be applied before service restart]
- [ ] [Prerequisite 2: e.g. Environment variable X must be set to Y in the target environment]

### Deployment Steps

1. Apply database migrations: `dotnet ef database update --project Identity.Infrastructure`
2. Deploy the container image: `[image tag or helm command]`
3. Verify health endpoint: `GET /health` must return `200 OK`
4. Confirm OTel spans are flowing to Grafana (check: [Dashboard link])

### Post-Deployment Verification

- [ ] Health endpoint returns `200 OK`
- [ ] Login flow completes successfully with a test account
- [ ] OTel traces visible in Grafana (TraceID propagated end-to-end)
- [ ] Audit log records a `UserAuthenticated` event on test login
- [ ] No ERROR-level logs in the first 10 minutes of traffic

---

## 8. Rollback Procedure

If a critical issue is detected within 30 minutes of deployment:

1. Revert the deployment to the previous image tag: `[previous image tag]`
2. If database migrations were applied: run rollback script `migrations/rollback-[version].sql`
3. Notify the on-call SRE and the Engineering Lead.
4. Create an incident in the issue tracker with label `production-incident`.
5. Do not re-deploy until root cause is identified.

---

## 9. Known Issues

| Issue | Description | Severity | Workaround |
|---|---|:---:|---|
| [ISS-XXX] | [Issue description] | [Medium / Low] | [Temporary workaround if any] |

---

## 10. Observability Checklist

Confirm that the following are active before declaring Production Live.

- [ ] OTel collector receiving spans from all bounded contexts
- [ ] Grafana dashboard shows active request rate
- [ ] Loki receiving structured logs with correlation IDs
- [ ] Tempo traces queryable by TraceID
- [ ] Alerting rules active (error rate, latency P95, health check)

---

## 11. Reference Links

| Resource | Link |
|---|---|
| Release tag | [GitHub release URL] |
| CI pipeline run | [GitHub Actions run URL] |
| Test Summary Report | [Link to TSR for this RC] |
| Observability dashboard | [Grafana dashboard URL] |
| Runbook | [Operations runbook link] |
```

---

## Section 2 — Worked Example

---

```markdown
# Release Notes — UMS v0.1.0

> Release date: 2026-04-05
> Release type: Minor (first production release)
> RC signed off: 2026-03-29
> Deployment target: Production
> Deployed by: GitHub Actions Pipeline (automated)
> Rollback version: N/A (first release)

---

## 1. Release Summary

UMS v0.1.0 delivers the complete MVP: centralized user identity management,
fine-grained RBAC/ABAC authorization with permission graph compilation,
hierarchical multi-tenant configuration, an immutable audit trail, and
the administrative console. This release proves all five Evolith Phase 1
architectural patterns in production-ready .NET 8 code.

---

## 2. New Features

### EP-01 — Identity

#### User Lifecycle Management

Tenant Administrators can create, activate, suspend, and soft-delete user
accounts. All lifecycle events are recorded in the immutable audit log.

- Delivered by: FS-01 — User Registration and Identity Lifecycle
- Available to: Tenant Administrator, System Administrator

#### OIDC Login Flow

Users authenticate via the configured IdP (Keycloak or Azure AD) through a
provider-agnostic adapter. JWT tokens carry tenant context and are validated
on every request.

- Delivered by: FS-08 — OIDC Login Flow and IdP Abstraction
- Available to: All authenticated users

### EP-02 — Authorization

#### Permission Graph Compilation

Effective permissions are compiled at resolution time from a directed acyclic
graph of roles, templates, and organizational context. The Visual Graph Resolver
allows administrators to inspect a user's effective permissions interactively.

- Delivered by: FS-02, FS-05
- Available to: Tenant Administrator, Security Engineer

### EP-04 — Audit

#### Immutable Audit Log

Every state mutation in the system — user creation, role assignment, login,
permission resolution — is recorded in an append-only audit table with a
10-column standard schema. Records cannot be updated or deleted.

- Delivered by: FS-06 — Immutable Audit Trail and Event Logging
- Available to: Compliance Officer (query API), System Administrator

---

## 3. Improvements

| Area | Description |
|---|---|
| Permission resolution latency | DAG compiled at resolution time with Redis cache (TTL 300s). P95 < 12ms for orgs up to 200 roles. |
| Tenant isolation | Dual-layer RLS (EF Core + SQL Server predicate) active on all 14 tables in scope. |

---

## 4. Breaking Changes

None in this release (first production version).

---

## 5. Bug Fixes

| Issue | Description | Severity |
|---|---|:---:|
| ISS-021 | Invitation token was not expiring correctly on timezone boundaries | High |
| ISS-027 | Role template assignment silently succeeded for suspended users | Medium |

---

## 6. Dependency Updates

| Package | Previous | Updated | CVE Fixed |
|---|:---:|:---:|:---:|
| Microsoft.EntityFrameworkCore | 8.0.1 | 8.0.4 | N/A |
| Serilog.AspNetCore | 8.0.0 | 8.0.2 | N/A |

---

## 7. Deployment Instructions

### Prerequisites

- [ ] SQL Server 2022 instance provisioned with UMS database and `identity`, `authorization`, `configuration`, `audit`, `console` schemas.
- [ ] `ASPNETCORE_ENVIRONMENT=Production` and `ConnectionStrings__UmsDb` set in the target environment.
- [ ] Redis cluster accessible on `REDIS_CONNECTION_STRING`.
- [ ] OTel Collector endpoint configured on `OTEL_EXPORTER_OTLP_ENDPOINT`.

### Deployment Steps

1. Apply all pending EF Core migrations:
   `dotnet ef database update --project src/Identity/UMS.Identity.Infrastructure`
   (repeat for Authorization, Configuration, Audit, Console projects)
2. Deploy image `ghcr.io/beyondnetcode/ums:0.1.0` via Docker Compose or Kubernetes manifest.
3. Verify: `GET https://{host}/health` returns `{"status":"Healthy"}`.
4. Confirm OTel spans are visible in Grafana: navigate to the UMS Overview dashboard.

### Post-Deployment Verification

- [ ] Health endpoint returns `200 OK`
- [ ] Create a test user through the Admin Console; verify the user appears with status Pending
- [ ] Complete invitation flow; verify status changes to Active
- [ ] OTel traces visible in Grafana — search by operation `RegisterUser`
- [ ] Audit log shows `UserCreated` and `UserActivated` events for the test user

---

## 8. Rollback Procedure

1. Revert deployment to the previous stable state: `docker pull ghcr.io/beyondnetcode/ums:previous` or Helm rollback.
2. Database migrations for v0.1.0 are additive only — no rollback script required for this release.
3. Notify Engineering Lead and open a `production-incident` issue in the UMS repository.

---

## 9. Known Issues

| Issue | Description | Severity | Workaround |
|---|---|:---:|---|
| ISS-014 | Visual Graph Resolver renders slowly for orgs > 500 roles | Medium | Use the query API instead of the visual renderer for large orgs |
| ISS-019 | Audit log query API lacks cursor-based pagination | Low | Use `limit` and `offset` parameters; max 1000 records per query |

---

## 10. Observability Checklist

- [x] OTel collector receiving spans from all 5 bounded contexts (Identity, Authorization, Configuration, Audit, Console)
- [x] Grafana dashboard "UMS Overview" shows active request rate
- [x] Loki receiving structured logs with `correlation_id` and `tenant_id` fields
- [x] Tempo traces queryable by TraceID on the Explore tab
- [x] Alerting rules active: error rate > 1%, P95 > 500ms, health check DOWN

---

## 11. Reference Links

| Resource | Link |
|---|---|
| Release tag | https://github.com/beyondnetcode/ums/releases/tag/v0.1.0 |
| CI pipeline run | https://github.com/beyondnetcode/ums/actions/runs/2041 |
| Test Summary Report | governance/qa/test-summary-report-v0.1.0-rc1.md |
| Observability dashboard | https://grafana.internal/d/ums-overview |
| Runbook | docs/operations/runbook-v0.1.0.md |
```

---

[Back to Artifact Templates](./README.md)
