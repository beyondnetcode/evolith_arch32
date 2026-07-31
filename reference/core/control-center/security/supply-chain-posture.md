# Supply-Chain and Repository Posture (GT-597)

**Status:** measurement wired, baseline unseeded (see §1.4) · **Last verified against live state:** 2026-07-30

This document exists because posture used to be prose. The 2026-07-26 product
maturity audit had to discover **by hand** that `enforce_admins=false`, that no
required status check was a security check, that `develop` was unprotected, and
that none of the published packages carried `dist.attestations`. Every one of
those is a fact a machine can check on a schedule.

Three things live here, and nothing else:

1. **How posture is measured** — the automated, external, numeric score, and the
   exact mechanism by which a regression becomes visible.
2. **The declared SLSA target**, and an honest inventory of the gap to it,
   including what only the repository owner can do.
3. **A mapping of controls that actually exist** to NIST SSDF v1.1 practice IDs,
   with the verification behind each row.

> **Reading rule.** Every row below records *how it was verified*. A control with
> no verification column is not in this document. A mapping table that lists
> controls the repository does not have would be the same prose this gap exists
> to replace, wearing standard identifiers.

---

## 1. How posture is measured

### 1.1 The score

[OpenSSF Scorecard](https://scorecard.dev) runs against this repository from
[`.github/workflows/openssf-scorecard.yml`](../../../../.github/workflows/openssf-scorecard.yml).
It scores twenty checks — among them Branch-Protection, Code-Review,
Pinned-Dependencies, CI-Tests, Token-Permissions, Signed-Releases, SAST and
Dangerous-Workflow — and produces one aggregate number.

| Property | Value |
|---|---|
| Trigger | weekly cron (Tuesdays 05:27 UTC), plus `branch_protection_rule`, plus manual dispatch |
| Scope | the default branch only; a score is a property of the repository, not of a topic branch |
| Published to | the public OpenSSF API (`publish_results: true`), so the number is externally checkable rather than self-asserted |
| Ingested by | GitHub code scanning, as SARIF |
| Retained as | a 90-day workflow artifact (SARIF **and** JSON), which is the raw per-run evidence a regression is diffed against |

The `branch_protection_rule` trigger is deliberate: it re-scores on the day
branch protection changes, rather than up to a week later. That is precisely the
regression the audit found by hand.

### 1.2 Why the score alone is not a measure

A published number that no job compares to anything cannot fail. A score falling
from 7.1 to 4.2 produces a green workflow run identical to one where nothing
changed, and the difference sits inside an artifact nobody opens between audits —
the original failure mode, reproduced weekly with better ergonomics.

### 1.3 The gate that can go red

[`.harness/scripts/ci/52-validate-scorecard-regression.mjs`](../../../../.harness/scripts/ci/52-validate-scorecard-regression.mjs)
compares each run against floors committed in
[`.harness/security/scorecard-baseline.json`](../../../../.harness/security/scorecard-baseline.json)
and **exits non-zero** on any of:

- the aggregate score below its committed floor;
- any individual check below its committed floor;
- a baselined check absent from the run (a check that stops running is
  indistinguishable from one that stopped passing);
- a check present in the run with no floor in the baseline (an incomplete
  baseline is how a ratchet quietly stops ratcheting);
- a check returning `-1`, Scorecard's "could not reach a verdict", against a
  numeric floor — reported as INCONCLUSIVE, because that is a different fact from
  a regression;
- results that are missing, unparseable, or not recognisably Scorecard JSON;
- results containing zero checks, refused through the repository's own
  `assertScanned`.

An **improvement never fails**. It is printed as a ratchet suggestion, so raising
a floor stays a reviewed commit — a baseline that updates itself cannot detect
anything.

**So a regression is visible in four independent ways**, and the first does not
require anyone to remember to look:

1. **The scheduled job turns red.** GitHub emails the repository owner when a
   scheduled workflow fails on the default branch. This is the load-bearing one.
2. **The job summary** names the check, its floor, its new score and Scorecard's
   own reason.
3. **A code-scanning alert** appears for the failing check.
4. **The public OpenSSF score** for the repository drops, visible to anyone.

### 1.4 What is not done yet, and why

**The baseline is unseeded, and the gate is therefore red by design until a real
run seeds it.**

No Scorecard run has ever executed against this repository: the workflow reached
`main` on 2026-07-29 and its first weekly trigger has not fired
(`gh run list --workflow "OpenSSF Scorecard"` returns nothing), and the public
API returns 404 for `github.com/beyondnetcode/evolith_arch32`. Writing plausible
floors without an observed run would produce a file that looks exactly like a
measurement and is not one.

So `aggregate` is `null`, the gate fails closed, and its failure message prints
the exact JSON document to commit. Seeding is **owner action**: dispatch the
workflow (Actions → OpenSSF Scorecard → Run workflow), then commit the printed
block. Dispatching it publishes a score to a public API, which is a publication
decision, not an agent's to make.

---

## 2. SLSA — declared target and the gap to it

### 2.1 The declaration

**Target: SLSA Build track, Build L3** — as defined by
[SLSA v1.2](https://slsa.dev/spec/v1.2/build-track-basics), the current version
of the specification (v1.1 remains published; v1.2 supersedes it). The Build
track levels are Build L0 (no requirements), Build L1 (provenance exists),
Build L2 (builds run on a hosted platform that generates and signs the
provenance), Build L3 (builds run on a hardened platform with strong tamper
protection).

This is a **target**, not an achievement. §2.3 records what is missing.

### 2.2 Observed state of the published artifacts

Verified 2026-07-30 with `npm view <package> dist.attestations` against the
public registry, on the `latest` dist-tag of each package:

| Package | `latest` | Provenance attestation |
|---|---|---|
| `@beyondnet/evolith-cli` | 1.2.2 | yes — predicate `https://slsa.dev/provenance/v1` |
| `@beyondnet/evolith-mcp` | 1.2.2 | yes |
| `@beyondnet/evolith-sdk` | 2.0.0 | yes |
| `@beyondnet/evolith-core` | 1.2.0 | yes |
| `@beyondnet/evolith-core-domain` | 1.2.0 | yes |
| `@beyondnet/evolith-infra-providers` | 1.2.0 | yes |
| `@beyondnet/evolith-agent-runtime` | 1.2.0 | yes |
| `@beyondnet/evolith-contracts` | 1.1.0 | **no** |

Two corrections to the audit's finding, recorded because a stale number is worth
as little as no number: the audit's "0 of 8 packages carry `dist.attestations`"
was true when written and is no longer. `npm-release.yml` (GT-570) publishes
every workspace from GitHub Actions with `--provenance`, and seven of the eight
now carry one. Versions published **before** that workflow existed still do not:
`npm view @beyondnet/evolith-cli@1.1.0 dist.attestations` returns nothing, while
`@1.2.0` returns the SLSA provenance predicate.

A consumer verifies this themselves with:

```bash
npm audit signatures            # verifies registry signatures AND provenance attestations
```

### 2.3 The gap to the declared target

**What the predicate does and does not establish.** `https://slsa.dev/provenance/v1`
is the *format* of the provenance document. It is not a level. The level comes
from how the provenance was produced.

**Current position, stated as a claim rather than an achievement.** Provenance is
generated during a run on a GitHub-hosted runner and signed through Sigstore
against a GitHub OIDC identity that the workflow's own steps cannot forge. That
is the shape SLSA v1.2 describes for **Build L2**, and GitHub's documentation
states that its artifact attestations "by itself provides SLSA v1.0 Build Level
2". **No independent verification of any level has been performed against these
artifacts**, and npm's own documentation asserts no level. Treat Build L2 as a
claim pending verification.

Open items, each with its owner:

| # | Gap | Who can close it |
|---|---|---|
| 1 | `@beyondnet/evolith-contracts` has never been published with provenance; its `latest` is 1.1.0, predating `npm-release.yml`. | **Repository owner only.** Publishing needs the `NPM_TOKEN` registry credential. An agent must not use or request it. |
| 2 | Versions published before `npm-release.yml` (all `1.0.x` and `1.1.0` lines) carry no attestation and never will — npm cannot retro-attest a published tarball. Consumers pinned to those versions have no provenance. | Nobody. Recorded as permanent, closed only by consumers upgrading. |
| 3 | Build L3 requires isolation between the build and the calling workflow. `npm-release.yml` is a single job of inline steps, so no isolation boundary exists. GitHub's documented route is a reusable workflow. | Engineering. **Deliberately not done here** — the release pipeline is `GT-570`'s subject, and two sessions editing it is how this repository has previously duplicated work. |
| 4 | No published verification instruction reached consumers before this document; the `npm audit signatures` step above is the first. | Done, here. |
| 5 | Nothing verifies attestation presence automatically. A future release could silently drop `--provenance` and no check would notice. | Engineering, and it belongs with item 3 in `GT-570`. |
| 6 | Provenance is asserted for `latest` only. There is no per-version attestation inventory. | Engineering, low value until item 5 exists. |

### 2.4 Related repository settings that bear on this

Verified 2026-07-30 with `gh api repos/beyondnetcode/evolith_arch32`:

| Setting | Live value | Note |
|---|---|---|
| `secret_scanning` | enabled | |
| `secret_scanning_push_protection` | enabled | |
| `dependabot_security_updates` | **disabled** | Version updates are configured in `.github/dependabot.yml`; *security* updates are off. **Owner action** — a repository setting. |
| `required_signatures` (main, develop) | **false** | Commit signing is not enforced. **Owner action.** |
| `require_code_owner_reviews` (main, develop) | **false** | `CODEOWNERS` routes review; it does not gate merge. **Owner action.** |

---

## 3. SSDF v1.1 mapping

Practice identifiers are from **NIST SP 800-218, *Secure Software Development
Framework (SSDF) Version 1.1*, February 2022** — the current final version of
that publication. Identifiers were taken from the publication's own practice
table, not from recollection. Note that SSDF v1.1 **retired** `PW.3.2`, `PW.4.5`
and `PW.5.2`; nothing maps to them.

Status values mean exactly:

- **IMPLEMENTED** — the control exists, is enforced, and the verification column
  says how that was established.
- **PARTIAL** — a real control exists and does not cover the practice; the gap is
  named.
- **NOT IMPLEMENTED** — named because its absence is the useful fact.

| SSDF task | Control in this repository | How it was verified | Status |
|---|---|---|---|
| **PO.3.1** — specify which tools must be in each toolchain and how they integrate | The toolchain is code: 14 workflows in `.github/workflows/`, 63 numbered guards under `.harness/scripts/ci/`, and `.harness/manifest.yaml` as the discovery surface | `ls .github/workflows`, `ls .harness/scripts/ci`; guard count from `42-validate-guard-denominators.mjs` reporting "63 CI guard(s)" | IMPLEMENTED |
| **PO.3.2** — deploy, operate and maintain the toolchain securely, including monitoring it | Guards run in CI and `Validate documentation` is a **required** status check on both `main` and `develop`; two meta-guards (`42`, `43`) keep the guard suite from passing vacuously | `gh api repos/…/branches/main/protection` lists `Validate documentation`; `43-validate-guard-negative-fixtures.mjs` observed turning each scanning guard red on an empty fixture | IMPLEMENTED |
| **PO.4.1** — define criteria for software security checks | The required status-check set is the merge criterion, and it now includes a security check (`CodeQL SAST`) | Same `gh api` call: contexts are `Test`, `Test core-domain`, `Test core`, `Test mcp-server`, `Test core-api`, `Validate documentation`, `CodeQL SAST` | PARTIAL — the criteria are the check list itself; there is no risk-based acceptance criteria document behind it |
| **PO.5.1 / PO.5.2** — separate and protect development environments and endpoints | — | — | NOT CLAIMED — developer endpoints are outside this repository and nothing here evidences them |
| **PS.1.1** — store all code under least privilege, with version control and reviewed changes | Branch protection on `main` and `develop`: `enforce_admins: true`, force pushes and deletions disabled, 1 approving review required; `CODEOWNERS` routes review, and its team handle was verified against the org before shipping | `gh api …/branches/{main,develop}/protection` and `…/protection/required_pull_request_reviews` (`required_approving_review_count: 1`, `require_code_owner_reviews: false`); `.github/CODEOWNERS` | PARTIAL — commit signing is not required (`required_signatures: false`) and code-owner review is not required |
| **PS.2.1** — make integrity verification information available to acquirers | npm provenance attestations, Sigstore-signed, on the `latest` of 7 of 8 packages; verification instruction published in §2.2 | `npm view <pkg> dist.attestations` for all eight packages, 2026-07-30 | PARTIAL — see §2.3 items 1 and 2 |
| **PS.3.1** — securely archive the files and supporting data for each release | The npm registry retains tarballs and their attestation bundles; workflow artifacts retain Scorecard evidence for 90 days | `npm view` as above; `openssf-scorecard.yml` `retention-days: 90` | PARTIAL — no archive independent of the registry |
| **PS.3.2** — collect and share provenance data for all components, e.g. an SBOM | A CycloneDX SBOM is generated during release | `grep -rn "sbom" .github/workflows/` returns exactly one line: `sdk-cli-release.yml:129`, generating `sbom.json` — and no step anywhere uploads, attaches or publishes it | **NOT IMPLEMENTED** — the SBOM is produced and discarded. Generating an artifact nobody can obtain satisfies nothing |
| **PW.4.1** — acquire and maintain well-secured third-party components | `package-lock.json` is committed and every workflow installs with `npm ci`, so builds resolve to pinned versions | `grep -n "npm ci" .github/workflows/*.yml` | PARTIAL — no documented vetting criteria for adopting a new dependency |
| **PW.4.4** — verify third-party components comply, throughout their life cycle | Dependabot (npm weekly, GitHub Actions monthly); `npm audit --audit-level=high` as a blocking CI gate; Trivy filesystem/container scanning with SARIF upload | `.github/dependabot.yml`; `sdk-cli-ci.yml:117` (`npm audit --audit-level=high`); `sdk-cli-ci.yml:406-430` (Trivy job + `upload-sarif`) | IMPLEMENTED |
| **PW.6.1 / PW.6.2** — use and configure build tools that improve executable security | Node 20 pinned across workflows; TypeScript `strict` builds; `eslint-plugin-boundaries` architecture lint in the release path | `NODE_VERSION: '20'` in the release workflows; `"strict": true` in `tsconfig.base.json:6`; `sdk-cli-release.yml` "Architecture Boundary Lint" step | PARTIAL — third-party actions are pinned by **tag**, not commit SHA, everywhere except `openssf-scorecard.yml`. This is exactly what Scorecard's Pinned-Dependencies check scores, and it will score low |
| **PW.7.1** — decide whether code review and/or code analysis is used | Both are decided and configured: `CodeQL SAST` is a required status check, and 1 approving review is required on `main` and `develop`. An active repository ruleset also requests automated review on the default branch | `gh api …/protection` and `…/required_pull_request_reviews`; `gh api repos/…/rulesets` → ruleset "Code Quality Copilot review for default branch", `enforcement: active` | IMPLEMENTED |
| **PW.7.2** — perform review/analysis against a secure coding standard and triage the findings | CodeQL (required), gitleaks secret detection, GitHub secret scanning **with push protection**; findings land in code scanning; work is triaged onto the gap board | `sdk-cli-ci.yml:379-402` (CodeQL), `:436-455` (gitleaks); `gh api repos/…` → `secret_scanning: enabled`, `secret_scanning_push_protection: enabled` | IMPLEMENTED |
| **PW.8.2** — scope, perform and document security testing, triaging what it finds | Five test jobs are required status checks (`Test`, `Test core-domain`, `Test core`, `Test mcp-server`, `Test core-api`) | `gh api …/protection` contexts | PARTIAL — the ZAP DAST job exists but is **non-gating** and covers only the MCP server, unauthenticated, on localhost (`sdk-cli-ci.yml:487-563`, and the pentest readiness package says so in its own words) |
| **PW.9.1 / PW.9.2** — define and implement secure default settings | LLM network egress is disabled by default and fails closed: the provider records the refused attempt and throws rather than opening a socket | `src/packages/agent-runtime/src/providers/GeminiProvider.ts:264` (`options.enabled ?? envFlagEnabled(process.env[GEMINI_EGRESS_ENV_FLAG])`) and `:427` (refusal path) | IMPLEMENTED for this control; **not claimed** as a repository-wide secure-baseline practice |
| **RV.1.1** — gather vulnerability information from public sources and investigate | Dependabot alerts, `npm audit` in CI, GitHub advisories on a public repository | `.github/dependabot.yml`; `sdk-cli-ci.yml:117` | PARTIAL — **`dependabot_security_updates` is `disabled`** on the repository, so alerts do not produce automatic remediation PRs |
| **RV.1.2** — review, analyse or test code to find previously undetected vulnerabilities | CodeQL runs on every pull request to `main` and `develop` with **no path filter**, deliberately, so it sees all of `src/` | `sdk-cli-ci.yml` `on.pull_request.branches: [main, develop]` with the documented absence of a `paths:` filter | IMPLEMENTED |
| **RV.1.3** — have a vulnerability disclosure and remediation policy, with the roles to support it | [`SECURITY.md`](../../../../SECURITY.md): private reporting via GitHub advisories and email, scope, response targets, disclosure process, and a full network-egress and sub-processor disclosure | The file, and GitHub's advisory endpoint linked from it | IMPLEMENTED |
| **RV.2.1** — analyse each vulnerability sufficiently to plan a response | Findings are tracked as gap-board rows with criticality and acceptance criteria | `reference/core/control-center/gaps/` | PARTIAL — severity is the board's P0–P3, not a CVSS-style calculation per vulnerability |
| **RV.3.3** — review for similar vulnerabilities to eradicate a class | — | — | NOT CLAIMED |

### 3.1 Answering a questionnaire from this table

The intended use is a lookup, not an essay: find the practice ID the
questionnaire cites, read the status, and quote the verification column. A
**PARTIAL** or **NOT IMPLEMENTED** row is a usable answer — a mapping in which
everything is green is a mapping nobody checked.

---

## 4. Deliberately not claimed

- **No SLSA level is asserted as verified.** §2.3 states the Build L2 *shape* and
  says plainly that no independent verification has been performed.
- **No Scorecard number appears anywhere in this document.** No run has happened.
  A number here would be invention.
- **The release pipeline is untouched.** Items 3 and 5 in §2.3 belong to `GT-570`.
- **Nothing here changes a repository setting.** Every owner-gated item is listed
  as such, with the reason it is owner-gated.
- **`PO.1`, `PO.2`, `PW.1`, `PW.2`, `RV.3.1`, `RV.3.2` and `RV.3.4` are absent**
  rather than mapped: this repository has no evidence for them that would survive
  the verification column.

## Related

- [`SECURITY.md`](../../../../SECURITY.md) — vulnerability disclosure policy and egress disclosure
- [Penetration-test readiness package](./pentest/README.md) — the human-attacker half of the security posture
- [Product maturity audit, 2026-07-26](../maturity-reports/product-maturity-audit-2026-07-26.md) — the audit whose hand-discovered findings motivated this
