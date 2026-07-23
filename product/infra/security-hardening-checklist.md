# Evolith Core — Security Hardening Checklist

> **Bilingual Navigation:** [Versión en Español](./security-hardening-checklist.es.md)

**Status:** Active Reference
**Owner:** Evolith Architecture Board
**Created:** 2026-07-23
**Last Updated:** 2026-07-23

This checklist documents security hardening measures that should be applied to Docker and Kubernetes deployments. Items marked [DONE] are already implemented; items marked [TODO] require action.

---

## Docker Hardening

### Container Configuration

| # | Control | Status | Evidence |
|---|---------|:---:|---|
| D-01 | Run as non-root user | [DONE] | All Dockerfiles use `USER evolith` (uid 1001) |
| D-02 | Multi-stage builds | [DONE] | All Dockerfiles use multi-stage builds |
| D-03 | Alpine base images | [DONE] | All use `node:20-alpine` |
| D-04 | No secrets in images | [DONE] | No `.env` files or hardcoded secrets |
| D-05 | Read-only root filesystem | [TODO] | Add `read_only: true` to docker-compose services |
| D-06 | Drop all capabilities | [TODO] | Add `cap_drop: [ALL]` to docker-compose services |
| D-07 | No new privileges | [TODO] | Add `security_opt: [no-new-privileges:true]` |
| D-08 | tmpfs for writable dirs | [TODO] | Add `tmpfs: [/tmp, /var/tmp]` where needed |
| D-09 | Resource limits | [TODO] | Add `deploy.resources.limits` for CPU/memory |
| D-10 | Health checks | [DONE] | All Dockerfiles have `HEALTHCHECK` instructions |

### Docker Compose Hardening

| # | Control | Status | Action Required |
|---|---------|:---:|---|
| DC-01 | `read_only: true` on all services | [TODO] | Add to each service in `docker-compose.yml` |
| DC-02 | `cap_drop: [ALL]` on all services | [TODO] | Add to each service |
| DC-03 | `security_opt: [no-new-privileges:true]` | [TODO] | Add to each service |
| DC-04 | `tmpfs` for writable directories | [TODO] | Add `/tmp` and `/var/tmp` where needed |
| DC-05 | Resource limits (CPU/memory) | [TODO] | Add `deploy.resources.limits` |

---

## Kubernetes Hardening

| # | Control | Status | Evidence |
|---|---------|:---:|---|
| K-01 | Pod Security Standards | [TODO] | Enforce `restricted` profile |
| K-02 | Network Policies | [TODO] | Restrict pod-to-pod communication |
| K-03 | RBAC least privilege | [TODO] | Minimal service account permissions |
| K-04 | Secret management | [TODO] | Use Vault or K8s secrets (not env vars) |
| K-05 | Image scanning | [DONE] | Trivy in CI pipeline |

---

## Network Security

| # | Control | Status | Evidence |
|---|---------|:---:|---|
| N-01 | TLS termination at edge | [DONE] | Traefik handles TLS |
| N-02 | Internal services not exposed | [TODO] | Verify no direct external access |
| N-03 | CORS restricted | [DONE] | `credentials: false`, configurable origins |
| N-04 | CSP headers | [DONE] | `default-src 'none'` on MCP server |

---

## Implementation Priority

1. **[HIGH]** D-05, D-06, D-07, D-08 — Docker container hardening (read-only, cap_drop, no-new-privileges, tmpfs)
2. **[HIGH]** DC-01 through DC-04 — Docker Compose hardening
3. **[MEDIUM]** K-01, K-02, K-03 — Kubernetes Pod Security Standards
4. **[LOW]** D-09, K-04, K-05 — Resource limits, secret management, image scanning

---

## Impact Assessment

**Risk of implementing:** MEDIUM — Adding `read_only: true` may break services that write to the filesystem at runtime (e.g., Redis data, PostgreSQL WAL, MinIO uploads).

**Recommendation:** Implement incrementally:
1. Start with services that don't write to disk (Traefik, OTEL Collector)
2. Add `tmpfs` for services that need writable dirs (Redis, PostgreSQL)
3. Test each service individually before applying to all

**Estimated effort:** 2-3 days for Docker hardening, 1-2 days for K8s hardening.

---

*This checklist is a living document. Update it as hardening measures are implemented.*
