# Captura de la primera ejecución

La portada cita unas cuantas cifras de una ejecución del CLI publicado contra un
satélite recién inicializado. Este fichero es esa ejecución, entera, para que los
contadores de la portada se puedan comprobar en vez de creer.

## Condiciones

| | |
|---|---|
| **Fecha** | 2026-08-21 |
| **Paquete** | `@beyondnet/evolith-cli@1.3.2`, resuelto con `npx -y` desde el registro público |
| **Corpus del tarball** | 177 packs · 412 reglas · 188 que pueden hacer fallar una ejecución (`evolith rulesets`) |
| **Corpus de este árbol** | 182 ficheros de reglas · 415 reglas — el árbol va por delante del paquete publicado |
| **Repositorio evaluado** | un directorio vacío, luego `evolith init --name my-sat --yes` y nada más |
| **Código de salida** | `2` — la puerta bloqueó |

Para reproducirlo:

```bash
mkdir my-sat && cd my-sat
npx -y @beyondnet/evolith-cli@1.3.2 init --name my-sat --yes
npx -y @beyondnet/evolith-cli@1.3.2 validate --engine opa
echo $?
```

## Los dos denominadores

En la salida aparecen dos totales distintos y miden cosas distintas. Un informe
que los mezclara sería el defecto exacto que este proyecto existe para evitar.

- **412** es el corpus que carga el CLI instalado.
- **159** es lo que la ejecución de este satélite seleccionó de él. La fila
  `GOV-RULE-NOT-APPLICABLE` dice el resto con palabras: 253 reglas del corpus no
  aplican a este repositorio, y `253 + 159 = 412`.
- De esas 159, **133 se evaluaron** y **26 se saltaron** — el motor no pudo
  decidirlas.
- La ejecución reporta **72 issues, 37 de ellos bloqueantes**. **Nueve de los 37
  son reglas saltadas**, no reglas que fallaron: llevan el prefijo
  `Blocking rule did not run:`. Una regla bloqueante que acaba sin decidir hace
  fallar la ejecución, porque una regla sin decidir no es una regla que pasa.

## La ejecución, sin editar

Se han quitado las secuencias de control del terminal y el spinner de progreso;
nada más se elimina, reordena ni reescribe. `stderr` salió vacío.

```
**Status:** failed
**Rules Checked:** 133
**Rules Skipped:** 26
**Rules Errored:** 0
**Rules Total:** 159

### Issues
| Rule Id | Severity | Category | Title | Blocking |
| --- | --- | --- | --- | --- |
| ACL-01 | MUST | anti-corruption | Schema Validation Before Ingestion | YES |
| ACL-02 | MUST | anti-corruption | Transformation Traceability | YES |
| ACL-04 | MUST | anti-corruption | ACL Version Synchronization with Core | YES |
| HXA-03 | MUST | layer-structure | Infrastructure (Adapters) implements Core ports | YES |
| CICD-01 | MUST | security-scan | CodeQL Static Analysis runs on every PR | YES |
| CICD-02 | MUST | dependency-scan | Dependency vulnerability scan blocks merge | YES |
| CICD-03 | MUST | secret-detection | Secret detection enabled on repository | YES |
| CICD-04 | MUST | pipeline-structure | All quality gates execute before merge | YES |
| MTN-01 | MUST | filtering-layer | Application-layer tenant filtering is primary | YES |
| MTN-02 | MUST | filtering-layer | Database-native tenant enforcement is secondary | YES |
| MTN-03 | MUST | context-propagation | Tenant context propagated through all layers | YES |
| MTN-06 | MUST | audit-trail | Tenant-scoped audit trail maintained | no |
| MTN-07 | MUST | data-migration | Tenant migration path defined for schema changes | YES |
| MTN-08 | MUST | external-api | External APIs validate tenant context on every request | YES |
| TPY-03 | MUST | integration-testing | Integration tests use ephemeral containers | no |
| TPY-04 | MUST | e2e-testing | E2E tests cover full HTTP routes | no |
| PROT-05 | MUST | protobuf-centralization | Proto files centralized in Contracts library | YES |
| RUNT-01 | MUST | runtime-selection | Runtime selected by workload profile only | YES |
| RUNT-08 | MUST | contract-registry | Contracts centrally stored and versioned | YES |
| GIT-03 | MUST | code-review | PR requires minimum 1 approved review | YES |
| GIT-10 | MUST | code-review | Higher environments require stronger approval | YES |
| DORA-01 | MUST | metrics | Deployment Frequency | no |
| DORA-02 | MUST | metrics | Lead Time for Changes | no |
| DORA-03 | MUST | metrics | Change Failure Rate | no |
| DORA-04 | MUST | metrics | Time to Restore | no |
| SPACE-01 | MUST | metrics | Reliability (Observability) | YES |
| SPACE-02 | SHOULD | metrics | Culture (Team Health) | no |
| SPACE-03 | SHOULD | metrics | Execution (Throughput) | no |
| SPACE-04 | SHOULD | metrics | Communication (Visibility) | no |
| SPACE-05 | MUST | metrics | Sponsorship (Leadership Alignment) | no |
| INH-02 | MUST | inheritance | Version Pinning | no |
| INH-04 | MUST | inheritance | Satellite Extension via Local ADRs | no |
| INH-06 | MUST | inheritance | Mandatory Architecture Tracker | no |
| KI-R02 | MUST | general | Winston owns review | YES |
| KI-R04 | MUST | general | Topology contract completeness | YES |
| SVC-01 | MUST | general | Each satellite project must have exactly one evolith.yaml at its project root | no |
| SVC-02 | MUST | general | Satellite name must be unique across all Evolith satellites | no |
| SVC-05 | MUST | general | Core version referenced must exist in Evolith Core registry | no |
| MCP-01 | MUST | protocol | Initialize Request Must Return Capabilities | YES |
| MCP-02 | MUST | tools | Tools List Must Be Complete and Stable | YES |
| MCP-03 | MUST | resources | Resources Must Preserve Core Traceability | YES |
| MCP-04 | MUST | security | HTTP Transport Requires Explicit Authentication Mode | YES |
| MCP-05 | SHOULD | observability | MCP Calls Should Emit Metrics | no |
| OBS-EVD-01 | MUST | tracing | Production Paths Emit Trace Context | YES |
| OBS-EVD-02 | MUST | logging | Structured Logs Carry Request Context | YES |
| OBS-EVD-03 | MUST | metrics | Service Health Metrics Are Reported | YES |
| OBS-EVD-04 | SHOULD | dashboards | Gate Evidence References Dashboard | no |
| QT-05 | MUST | testing | Blocking rule did not run: Testing Pyramid Distribution | YES |
| SEC-INJ-01 | MUST | security | Blocking rule did not run: No shell exec with user input | YES |
| SEC-INJ-02 | MUST | security | Blocking rule did not run: Parameter allowlists for scaffold tools | YES |
| SEC-PATH-01 | MUST | security | Blocking rule did not run: Path input sanitization | YES |
| SEC-PATH-02 | MUST | security | Blocking rule did not run: Base directory containment | YES |
| SEC-RL-01 | MUST | security | Blocking rule did not run: Rate limiting on HTTP endpoints | YES |
| SEC-RL-02 | MUST | security | Blocking rule did not run: Request body size limits | YES |
| SEC-TIMING-01 | MUST | security | Blocking rule did not run: Constant-time credential comparison | YES |
| SEC-TIMING-02 | MUST | security | Blocking rule did not run: No early rejection on credential length | YES |
| SLSA-PROV-L1 | SHOULD | slsa-build | MUST rule not evaluated: Build L1 — EVERY publishing path generates provenance, not just the main one | no |
| SLSA-BUILD-L1 | SHOULD | slsa-build | MUST rule not evaluated: Build L1 — the artifact is built by the run whose provenance describes it | no |
| SLSA-AUTH-L2 | SHOULD | slsa-build | MUST rule not evaluated: Build L2 — the PUBLISHING job can mint the identity that signs the provenance | no |
| SLSA-HOSTED-L2 | SHOULD | slsa-build | MUST rule not evaluated: Build L2 — nothing offers a way to publish from a workstation | no |
| SSDF-PW.4.1 | SHOULD | ssdf-third-party | MUST rule not evaluated: PW.4.1 — third-party components resolve to pinned versions in CI | no |
| SSDF-PW.4.4 | SHOULD | ssdf-third-party | MUST rule not evaluated: PW.4.4 — components are re-verified over their life cycle, not once at adoption | no |
| SSDF-PW.7.2 | SHOULD | ssdf-review | MUST rule not evaluated: PW.7.2 — code is analysed by both a code scanner and a secret scanner | no |
| SSDF-PS.3.2 | SHOULD | ssdf-provenance | MUST rule not evaluated: PS.3.2 — an SBOM that is generated but never published satisfies nothing | no |
| SSDF-RV.1.2 | SHOULD | ssdf-vulnerability | MUST rule not evaluated: RV.1.2 — the code scanner sees the whole change, not a filtered slice | no |
| SSDF-RV.1.3 | SHOULD | ssdf-vulnerability | MUST rule not evaluated: RV.1.3 — there is a disclosure policy that names how to report | no |
| ISO5055-SEC | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Security | no |
| ISO5055-REL | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Reliability | no |
| ISO5055-PERF | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Performance Efficiency | no |
| ISO5055-MAINT | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Maintainability | no |
| GOV-RULE-NOT-APPLICABLE | COULD | governance | 253 corpus rules do not apply to this repository | no |
**Selection:** {"source":"core-default","requested":[],"matched":[],"unmatched":[],"rulesSelected":412,"corpusTotal":412}
**Core Ref:** {"version":"1.0.0","path":"../evolith"}
**Timestamp:** 2026-08-21T16:05:06.083Z
└  ❌ Validation failed. See the errors above.
```

## El mismo repositorio, con el motor por defecto

`--engine opa` evalúa con el bundle Rego compilado. Sin la bandera el CLI corre el
evaluador nativo en TypeScript, y sobre el mismo repositorio, la misma versión y
el mismo corpus no cubre lo mismo:

| | `validate --engine opa` | `validate` |
|---|---|---|
| Reglas evaluadas | 133 | **41** |
| Reglas saltadas | 26 | **118** |
| Filas de issues | 72 | 114 |
| Bloqueantes | 37 | 77 |
| Código de salida | 2 | 2 |

CI exige que los dos motores coincidan sobre fixtures. No exige que tengan la
misma cobertura sobre un repositorio real, y hoy no la tienen. Por eso la portada
usa `--engine opa` en todas partes.

```
**Status:** failed
**Rules Checked:** 41
**Rules Skipped:** 118
**Rules Errored:** 0
**Rules Total:** 159

### Issues
| Rule Id | Severity | Category | Title | Blocking |
| --- | --- | --- | --- | --- |
| ACL-02 | MUST | anti-corruption | Blocking rule did not run: Transformation Traceability | YES |
| ACL-03 | MUST | anti-corruption | Blocking rule did not run: Reject Non-Compliant Data | YES |
| HXA-03 | MUST | layer-structure | Blocking rule did not run: Infrastructure (Adapters) implements Core ports | YES |
| CICD-01 | MUST | security-scan | Blocking rule did not run: CodeQL Static Analysis runs on every PR | YES |
| CICD-02 | MUST | dependency-scan | Blocking rule did not run: Dependency vulnerability scan blocks merge | YES |
| CICD-03 | MUST | secret-detection | Blocking rule did not run: Secret detection enabled on repository | YES |
| CICD-04 | MUST | pipeline-structure | Blocking rule did not run: All quality gates execute before merge | YES |
| CICD-05 | SHOULD | documentation | MUST rule not evaluated: Security findings documented with justification | no |
| CICD-06 | SHOULD | sla-compliance | MUST rule not evaluated: Critical findings resolved within 24 hours | no |
| CICD-07 | SHOULD | sla-compliance | MUST rule not evaluated: High findings resolved within 72 hours | no |
| MTN-01 | MUST | filtering-layer | Blocking rule did not run: Application-layer tenant filtering is primary | YES |
| MTN-02 | MUST | filtering-layer | Blocking rule did not run: Database-native tenant enforcement is secondary | YES |
| MTN-03 | MUST | context-propagation | Blocking rule did not run: Tenant context propagated through all layers | YES |
| MTN-04 | MUST | data-isolation | Blocking rule did not run: Cross-tenant data access prohibited | YES |
| MTN-06 | SHOULD | audit-trail | MUST rule not evaluated: Tenant-scoped audit trail maintained | no |
| MTN-07 | MUST | data-migration | Blocking rule did not run: Tenant migration path defined for schema changes | YES |
| MTN-08 | MUST | external-api | Blocking rule did not run: External APIs validate tenant context on every request | YES |
| TPY-01 | SHOULD | test-layer-distribution | MUST rule not evaluated: Test distribution follows 70/20/10 pyramid | no |
| TPY-02 | MUST | unit-testing | Blocking rule did not run: Unit tests dominate total test volume | YES |
| TPY-03 | SHOULD | integration-testing | MUST rule not evaluated: Integration tests use ephemeral containers | no |
| TPY-04 | SHOULD | e2e-testing | MUST rule not evaluated: E2E tests cover full HTTP routes | no |
| TPY-05 | MUST | coverage-threshold | Blocking rule did not run: Business logic coverage >= 80% | YES |
| TPY-06 | MUST | per-layer-thresholds | Blocking rule did not run: Per-layer coverage thresholds enforced | YES |
| TPY-07 | MUST | test-isolation | Blocking rule did not run: Unit tests do not execute IO | YES |
| PROT-01 | MUST | internal-communication | Blocking rule did not run: Internal service-to-service uses gRPC | YES |
| PROT-02 | MUST | external-communication | Blocking rule did not run: Public and external APIs use REST | YES |
| PROT-04 | MUST | graphql-isolation | Blocking rule did not run: GraphQL resolvers never in domain layer | YES |
| PROT-05 | MUST | protobuf-centralization | Blocking rule did not run: Proto files centralized in Contracts library | YES |
| PROT-07 | MUST | contract-versioning | Blocking rule did not run: Breaking changes require version bump | YES |
| RUNT-01 | MUST | runtime-selection | Blocking rule did not run: Runtime selected by workload profile only | YES |
| RUNT-02 | MUST | web-apis | Blocking rule did not run: Web APIs and BFF use Node.js/TypeScript | YES |
| RUNT-03 | MUST | compute-workloads | Blocking rule did not run: High compute and batch use .NET (C#) | YES |
| RUNT-04 | MUST | mobile-workloads | Blocking rule did not run: Mobile with hardware access uses Android/Kotlin | YES |
| RUNT-05 | MUST | runtime-coupling | Blocking rule did not run: Direct runtime dependency forbidden | YES |
| RUNT-06 | MUST | sync-interop | Blocking rule did not run: Synchronous inter-op uses gRPC | YES |
| RUNT-07 | SHOULD | async-interop | MUST rule not evaluated: Asynchronous inter-op uses message broker | no |
| RUNT-08 | MUST | contract-registry | Blocking rule did not run: Contracts centrally stored and versioned | YES |
| GIT-01 | MUST | branch-naming | Blocking rule did not run: Branch names follow pattern: type/ticket-id-description | YES |
| GIT-02 | MUST | branch-naming | Blocking rule did not run: Protected branches enforce direct push prohibition | YES |
| GIT-03 | MUST | code-review | Blocking rule did not run: PR requires minimum 1 approved review | YES |
| GIT-04 | MUST | release-tagging | Blocking rule did not run: Release tags follow semver format | YES |
| GIT-05 | SHOULD | merge-policy | MUST rule not evaluated: Feature branches merge via squash or rebase | no |
| GIT-06 | MUST | hotfix-flow | Blocking rule did not run: Hotfixes follow expedited merge path | YES |
| GIT-07 | SHOULD | branch-lifetime | MUST rule not evaluated: Stale branches must be deleted after merge | no |
| GIT-09 | MUST | promotion-policy | Blocking rule did not run: Environment promotion follows develop to qa to uat to main | YES |
| GIT-10 | MUST | code-review | Blocking rule did not run: Higher environments require stronger approval | YES |
| DOD-01 | MUST | code | Blocking rule did not run: Code implemented and reviewed | YES |
| DOD-02 | MUST | testing | Blocking rule did not run: Unit tests meet coverage threshold | YES |
| DOD-06 | MUST | security | Blocking rule did not run: Security gates passed | YES |
| DOD-07 | SHOULD | architecture | MUST rule not evaluated: ADR created if architectural decision made | no |
| DOD-08 | MUST | integration | Blocking rule did not run: Integration tests pass | YES |
| DOD-09 | MUST | lint | Blocking rule did not run: Linting and formatting passed | YES |
| DOD-10 | MUST | ci | Blocking rule did not run: CI pipeline green on target branch | YES |
| EM-S-03 | MUST | SOLID | Blocking rule did not run: Liskov Substitution: subtype substitutable for base | YES |
| EM-S-05 | MUST | SOLID | Blocking rule did not run: Dependency Inversion: depend on abstractions | YES |
| EM-K-01 | MUST | KISS | Blocking rule did not run: Keep It Simple, Stupid | YES |
| EM-Y-01 | SHOULD | YAGNI | MUST rule not evaluated: You Aren't Gonna Need It | no |
| TAX-07 | MUST | adr-naming | Blocking rule did not run: ADR files named with zero-padded ID | YES |
| TAX-08 | MUST | adr-naming | Blocking rule did not run: Bilingual ADR files use .es.md suffix | YES |
| ABAC-01 | MUST | access-control | Blocking rule did not run: Tool Access Requires Authorization | YES |
| ABAC-02 | MUST | access-control | Blocking rule did not run: User Context Must Carry Roles | YES |
| ABAC-03 | MUST | access-control | Blocking rule did not run: Tool Must Be Classified in the Tool Registry | YES |
| DORA-01 | SHOULD | metrics | MUST rule not evaluated: Deployment Frequency | no |
| DORA-02 | SHOULD | metrics | MUST rule not evaluated: Lead Time for Changes | no |
| DORA-03 | SHOULD | metrics | MUST rule not evaluated: Change Failure Rate | no |
| DORA-04 | SHOULD | metrics | MUST rule not evaluated: Time to Restore | no |
| SPACE-01 | MUST | metrics | Blocking rule did not run: Reliability (Observability) | YES |
| DRIFT-01 | SHOULD | governance | MUST rule not evaluated: Architecture Drift Index | no |
| INH-06 | MUST | inheritance | Mandatory Architecture Tracker | no |
| KI-R01 | MUST | general | Blocking rule did not run: Provenance and rights are mandatory | YES |
| KI-R02 | MUST | general | Blocking rule did not run: Winston owns review | YES |
| KI-R03 | MUST | general | Blocking rule did not run: Promotion requires executable evidence | YES |
| KI-R04 | MUST | general | Blocking rule did not run: Topology contract completeness | YES |
| KI-R05 | MUST | general | Blocking rule did not run: Source registry linkage | YES |
| KI-R06 | MUST | general | Blocking rule did not run: Promotion state machine | YES |
| KI-R07 | MUST | general | Blocking rule did not run: Promotion evidence and disposition | YES |
| SVC-02 | SHOULD | general | MUST rule not evaluated: Satellite name must be unique across all Evolith satellites | no |
| SVC-05 | SHOULD | general | MUST rule not evaluated: Core version referenced must exist in Evolith Core registry | no |
| SVC-06 | SHOULD | general | MUST rule not evaluated: Workspace integrity: declared projects and discovered manifests must correspond one-to-one | no |
| MCP-01 | MUST | protocol | Blocking rule did not run: Initialize Request Must Return Capabilities | YES |
| MCP-02 | MUST | tools | Blocking rule did not run: Tools List Must Be Complete and Stable | YES |
| MCP-03 | MUST | resources | Blocking rule did not run: Resources Must Preserve Core Traceability | YES |
| MCP-04 | MUST | security | Blocking rule did not run: HTTP Transport Requires Explicit Authentication Mode | YES |
| OBS-EVD-01 | MUST | tracing | Blocking rule did not run: Production Paths Emit Trace Context | YES |
| OBS-EVD-02 | MUST | logging | Blocking rule did not run: Structured Logs Carry Request Context | YES |
| OBS-EVD-03 | MUST | metrics | Blocking rule did not run: Service Health Metrics Are Reported | YES |
| QT-01 | MUST | testing | Blocking rule did not run: Code Coverage | YES |
| QT-02 | MUST | code-quality | Blocking rule did not run: Cyclomatic Complexity | YES |
| QT-03 | MUST | security | Blocking rule did not run: Security Vulnerabilities | YES |
| QT-04 | MUST | code-quality | Blocking rule did not run: Technical Debt Ratio | YES |
| QT-07 | MUST | operations | Blocking rule did not run: Observability Evidence | YES |
| QT-08 | MUST | contract | Blocking rule did not run: API Contract Compatibility | YES |
| SEC-INJ-01 | MUST | security | Blocking rule did not run: No shell exec with user input | YES |
| SEC-INJ-02 | MUST | security | Blocking rule did not run: Parameter allowlists for scaffold tools | YES |
| SEC-PATH-01 | MUST | security | Blocking rule did not run: Path input sanitization | YES |
| SEC-PATH-02 | MUST | security | Blocking rule did not run: Base directory containment | YES |
| SEC-TIMING-01 | MUST | security | Blocking rule did not run: Constant-time credential comparison | YES |
| SEC-TIMING-02 | MUST | security | Blocking rule did not run: No early rejection on credential length | YES |
| SSDF-PO.3.1 | SHOULD | ssdf-toolchain | PO.3.1 — the toolchain is specified as code, not as recollection | no |
| SSDF-PW.4.1 | MUST | ssdf-third-party | PW.4.1 — third-party components resolve to pinned versions in CI | no |
| SSDF-PW.4.4 | MUST | ssdf-third-party | PW.4.4 — components are re-verified over their life cycle, not once at adoption | no |
| SSDF-PW.7.2 | MUST | ssdf-review | PW.7.2 — code is analysed by both a code scanner and a secret scanner | no |
| SSDF-PS.3.2 | MUST | ssdf-provenance | PS.3.2 — an SBOM that is generated but never published satisfies nothing | no |
| SSDF-RV.1.2 | MUST | ssdf-vulnerability | RV.1.2 — the code scanner sees the whole change, not a filtered slice | no |
| SSDF-RV.1.3 | MUST | ssdf-vulnerability | RV.1.3 — there is a disclosure policy that names how to report | no |
| HXA-06 | SHOULD | aop-isolation | MUST rule not evaluated: AOP implemented exclusively in Infrastructure layer | no |
| HXA-07 | SHOULD | testing | MUST rule not evaluated: Core domain tests run without framework bootstrap | no |
| ISO5055-SEC | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Security | no |
| ISO5055-REL | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Reliability | no |
| ISO5055-PERF | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Performance Efficiency | no |
| ISO5055-MAINT | SHOULD | iso-5055 | MUST rule not evaluated: ISO/IEC 5055 — Maintainability | no |
| GOV-RULE-NON-EXECUTABLE | COULD | governance | 16 corpus rules are not executable by any engine | no |
| GOV-RULE-NOT-APPLICABLE | COULD | governance | 253 corpus rules do not apply to this repository | no |
**Selection:** {"source":"core-default","requested":[],"matched":[],"unmatched":[],"rulesSelected":412,"corpusTotal":412}
**Core Ref:** {"version":"1.0.0","path":"../evolith"}
**Timestamp:** 2026-08-21T16:05:17.202Z
└  ❌ Validation failed. See the errors above.
```

## Qué de todo esto es un defecto

- **La brecha de cobertura entre motores de arriba.** Seguida como P0.
- **Dos reglas de infraestructura no están en ningún denominador.** `INFRA-001` e
  `INFRA-OPA-001` no aparecen en ninguna salida. El cargador rechaza tres ficheros
  de reglas que viajan dentro del tarball, y desde 1.3.2 ya no lo dice por stderr
  — el aviso que lo divulgaba ha desaparecido, así que la omisión es ahora
  silenciosa ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)).
- **Una primera ejecución sobre un repositorio en fase 0 reporta hallazgos
  bloqueantes.** Eso es una línea base, no un aprobado: varias reglas siguen
  asumiendo un layout de repositorio más completo. Llevar el default a cero se
  sigue como GT-571 en el
  [tablero de gaps](../../reference/core/control-center/gaps/gap-tracking.es.md).

Todo lo demás de arriba es comportamiento por diseño.
