# Evolith — Product Maturity Audit (2026-07-26)

> **Bilingual Navigation:** [Versión en Español](./product-maturity-audit-2026-07-26.es.md)

> **What this document is and is NOT.** It is a **point-in-time, dated, immutable audit**: it portrays the state of the product on 2026-07-26 and is not updated. **It is not a second maturity surface.** The living surface remains [maturity-assessment.md](./maturity-assessment.md), and the deviations this audit finds in it are corrected there, not here. Derived gaps are registered exclusively on the [Gap Tracking Board](../gaps/gap-tracking.md) (`GT-569`…`GT-578`), never in this document. Keeping this file as a historical record and not forking it is deliberate: duplicating living surfaces is precisely root cause **C4** that this audit identifies.

**Date:** 2026-07-26 · **Repository:** `beyondnetcode/evolith_arch32` @ `develop` (cf5c94b0)
**Scope:** the whole product — not just the code: market, architecture, quality, testing, delivery, security, operations, surfaces, documentation, domain/data, process, dependencies, AI layer, Core↔Tracker boundary, capacity.

**Method:** 12 independent auditors, each followed by an adversarial verifier tasked with refuting it; a completeness critic that found 3 blind spots and triggered 3 fill-in audits; a synthesis; and a final red team that re-verified every figure by hand against the repository. 31 agents, 4.75 M tokens, 2,423 tool calls. Rule of evidence: every claim requires `path:line` or a command with its real output; the repository's own documentation was treated as a *claim*, never as evidence.

---

## 1. Executive verdict

Evolith is **a real deterministic governance engine, wrapped in a governance layer that does not govern.**

The core engineering is good and verifiable: it installs from npm, starts in **517–698 ms** in an empty directory with no server, no database and no Docker; the package graph has **20 edges and 0 cycles**; `strict: true` across all 10 workspaces with not a single override; **7 files above 500 LOC out of 585**; and the hexagonal boundary lint genuinely rejects — proven with synthetic probes — over **34,755 of 62,342 production LOC (55.7%)**, inside required jobs.

And yet, **the number the product rests on means nothing**. Of 379 rules in the corpus, the native engine evaluates 108 and reports 111; **271 return `skipped`, of which 192 are blocking**, are excluded from the denominator, and no field exists that reveals it (`grep -rn "rulesSkipped" src` → 0 results). A satellite with 192 unexecuted blocking rules receives a clean PASS. The same field also fails in the opposite direction: `validate --engine opa --core <repo>` returns **`rulesChecked: 379` having executed zero policies** (the wasm does not resolve against the Core's own layout). The counter has no semantics in either direction.

**The "Enforced" layer the product sells does not exist.** The required check `Validate documentation` has been red since 2026-07-23T13:26Z — **43 of 43 completed runs failed** plus 5 cancelled — and 8 PRs have been merged over it; the latest, #209, landed on `main` with **0 reviews and 5 checks in FAILURE**. `enforce_admins = false`, `required_pull_request_reviews = null`, `develop` with no protection at all. The workflow containing CodeQL, Trivy, gitleaks, ZAP and `npm audit` has accumulated **82 failures / 17 cancellations / 1 success in its last 100 runs** and **none of its 13 jobs is a required context**.

What is installable today (**1.1.0, 2026-07-18**) predates the security wave of **2026-07-23**, whose public CHANGELOG enumerates the vulnerable files by name while `SECURITY.md` promises the 1.1.x line is *actively patched*. And the README quickstart **fails twice**: `evolith` is not a published binary, and `init` creates a subdirectory, so the following `validate` targets the parent.

Commercially there is nothing to defend: **0 stars, 0 forks, 0 watchers, 0 external issues or PRs in 80 public days**; not one occurrence of *ideal customer profile*, *design partner*, *pilot customer* or *willingness to pay* across 929 English documents; no price, no unit of measurement, not a single deployed environment.

> **Weighted ACMM: 2.0 / 5 · Real rung: Implemented.**
> The engineering is good quality. The governance over that engineering is **measured theatre**.

**Product stage:** public single-author prototype with artifacts published to npm. Pre-alpha commercially. The local evaluation engine is usable today by an isolated developer; everything around it — automated release, enforcement, integration with the monetizable product, operations, price — is pre-production or nonexistent.

---

## 2. Reliability of this report

The red team verified by hand the figures underpinning the top risks. **The backbone holds, several figures to the digit.** What did not hold is segregated below, because a report about evidence inflation cannot afford to inflate its own.

**Independently verified (with command and output):**
379 total rules / 192 blocking skipped · `rulesSkipped` nonexistent · 43 consecutive red runs · PR #209 with 0 reviews and 5 red checks · `main` protection (6 contexts, `enforce_admins=false`, 0 reviews) · `develop` unprotected · 82/17/1 on `sdk-cli-ci` · npm 1.1.0 of 2026-07-18 against fixes of 2026-07-23 · 0 of 8 packages with `dist.attestations` · the SDK 1.1.0 installed as a real directory under the CLI while the workspace is at 2.0.0 · the Tracker→SKIPPED chain end to end · RLS/CDC with 0 occurrences in code · Alertmanager/k6/helm-lint/`gen_ai` at zero · 2,716 of 2,730 commits from the same email · 928 `.ts` / 343 spec / 585 non-spec / 7 files >500 LOC · published MCP 47/47 FORBIDDEN over stdio.

**Figures that must NOT be quoted externally without regenerating:**

| Figure | Status |
|---|---|
| `npm audit`: 9 vulns / 7 high (prod) vs 29 (dev) | **Not verifiable today** — the registry bulk endpoint returns invalid JSON |
| 3,803 green tests · 88.09% CLI coverage · 76.14% core-domain | **Not reproduced** — read from a stale `coverage-summary.json` on disk; counting `it()` blocks gives 3,481 |
| O(N²) timings: 0.233 s / 7.03 s / 29.7 s | **Not reproduced** by anyone but the original auditor; the mechanism (linear scan in `overlay-file-system.ts:100,130`) is confirmed |
| 715 broken internal links | **Mechanism confirmed** (`01-validate-docs.mjs:190` only matches targets starting with `.`), number not recomputed |

**Four documentary counts corrected downward** (inflated in the first synthesis): the phantom command is **447 invocations across 49 files**, not 529 across 37 · untranslated ES files: **2 byte-identical + ~12 by vocabulary heuristic**, not 46 · disconnected validators: **~9 of 46 scripts** (15 not invoked, of which ~6 are libraries), not "11 of 39" nor "43 guards" · rules with a machine-check field: **303 with prose `validationQuery`, 6 with an executable `enforce:` block** (and the mapper discards it, so the effective number is 0), not "1 of 379".

---

## 3. Scorecard

Rungs: **Documented** < **Implemented** < **Tested** < **Enforced** < **Operated**.
None of the 15 rows reaches *Operated*. None reaches *Enforced* sustainably.

| # | Dimension | ACMM | Rung | Weight | Biggest gap |
|---|---|---|---|---|---|
| 1 | **Product & market** | 2.0 | Implemented | 5 | 0 ICP across 929 EN docs; 0 price; 0 customers; 0 conversion in 80 days |
| 2 | **Architecture** | 3.0 | Tested | 4 | 36.7% of the corpus is executable; the rest vanishes from the verdict with no counter |
| 3 | **Code quality** | 2.3 | Implemented | 3 | CLI lint dead since ESLint 9, masked with `continue-on-error`; 437 errors in core-api nobody runs |
| 4 | **Testing** | 2.8 | Tested | 4 | 94.7% unit, 0 against DB or container; ~340 tests in 3 workspaces with no CI job |
| 5 | **CI/CD & release** | 2.2 | Implemented ⬇ | 5 | The release path has never run end to end; 7 of 8 packages publish without a build step |
| 6 | **Security** | 2.2 ⬇ | Implemented ⬇ | 5 | 0 of the 6 required checks is a security check; path traversal on 2 network surfaces |
| 7 | **Operability** | 2.0 | Implemented | 4 | 0 environments; Alertmanager nonexistent; no chart validated by any job |
| 8 | **Surfaces & DX** | 1.5 ⬇ | Implemented ⬇ | 5 | The published MCP package rejects its 47 tools over stdio; the quickstart fails twice |
| 9 | **Documentation** | 3.0 | Tested | 2 | Validates FORM, not SUBSTANCE: the bilingual gate compares heading counts |
| 10 | **Data & domain** | 2.0 | Implemented | 4 | 192 blocking rules unevaluated and invisible; the richest aggregates disconnected |
| 11 | **Process & governance** | 2.3 | Implemented | 3 | Bus factor 1; 0 approvals across 82 PRs; a GT board certifying DONE against live defects |
| 12 | **Dependencies** | 2.3 | Implemented | 3 | 0 of 8 with attestations; monorepo silently split; Node 20 EOL since 2026-04-30 |
| 13 | **AI/LLM layer** *(follow-up)* | 1.5 | Implemented | 5 | Sells AI governance and publishes its only LLM egress without any of the controls it sells |
| 14 | **Core↔Tracker boundary** *(follow-up)* | 1.5 | Implemented | 5 | The flagship path records SKIPPED over real FAILs, with both CIs green |
| 15 | **Capacity & performance** *(follow-up)* | 1.5 | Initial ⬇ | 4 | Nobody ever measured anything; accidental 100 KB ceiling (~15 files) |

⬇ = level or rung downgraded by the red team relative to the synthesis.

**Weighted by weight: 2.0 / 5.** The five weight-5 dimensions — product/market, CI-CD, security, surfaces, AI layer and Tracker boundary — average 1.9. The highest scorers (architecture 3.0, documentation 3.0) carry the least weight for *product* maturity.

---

## 4. The five systemic root causes

This is the core of the analysis: five mechanisms explain nearly every symptom across the 15 dimensions.

### C1 — Every instrument scores the case it cannot measure as PASS

This is not a repeated bug: it is an unintentional design pattern. Each gate was written to close a GT ticket whose acceptance criterion was *"the gate exists and is green"*, never *"the gate turns red on a known bad input"*. There is no negative control anywhere — no mutation testing, no deliberately broken fixture, no assertion of non-zero coverage — and **no instrument publishes its own denominator**.

Measured symptoms:
- 271 `skipped` rules excluded from `rulesChecked`, 192 of them blocking, inside a PASS verdict.
- The same field reports **379 checked having executed 0 policies** when the OPA engine fails to start.
- An evaluator that throws becomes `skipped` (`native-evaluator.ts:69-72`): **a crash is indistinguishable from a green rule**.
- The surface parity gate classifies 8 items as *undetermined* and still prints success.
- The cross-surface oracle **excludes FORBIDDEN** from error comparison — precisely 100% of the MCP stdio surface.
- The link validator only matches `./` and `../`.
- Bilingual parity compares the count of `##` headings.
- `36-validate-agent-memory.mjs` prints green after reading a directory that does not exist.
- The Trivy job does not pass `exit-code` (default 0): **it can never fail**.
- A load test measures the latency of 404s (wrong route) and throws `ReferenceError` on the first iteration.

**The antidote already exists in-house** and this is the encouraging part: `34-boundary-guard-repository.mjs:57-73` exits 1 if the directory does not exist **and** exits 1 if it scanned zero files, with the literal comment *"A zero-file scan must never be reported as boundary guard passed"*. And the Tracker contract gate includes a **negative self-test** that corrupts a pin and requires the guard to fail. The pattern is invented; it was applied to 2 guards out of ~46.

**Fix:** make negative control an acceptance criterion. Every gate publishes its denominator and exits 1 on zero elements; every gate carries a bad fixture that MUST turn it red in CI; `ValidationResult` gains `rulesSkipped` and an `errored` state distinct from `skipped`.

### C2 — The move to `src/` migrated the code and the imports, not the path literals

The compiler detects a moved module. **Nothing detects a moved file referenced by a string**, and a path that does not resolve produces silence, not an error. Aggravating factor: the broken literals live in scripts that are themselves disconnected or gated by a secret, so they never run and never throw.

- `OpaEvaluator` hardcodes `<corePath>/rulesets/opa/policy.wasm` and never received the dual probe `DiskRulesetRepository` has: **the entire OPA engine is non-functional against the Core layout**.
- The `upgrade` command — a customer's only migration mechanism — diffs against `<corePath>/rulesets`, which does not exist: it proposes zero changes.
- The CLI boundary config guards `src/domain`, `src/application` and `src/core`: **none of the three has ever existed**.
- `sdk-cli-ci.yml:467` invokes `.harness/scripts/ci/13-agentic-code-review.mjs`, a nonexistent file; and the real script points at `packages/mcp-server/dist/main.js`, a pre-refactor path. **"Winston Agentic Review" is dead twice** and reports `success`.
- The `evolith.yaml` generated by `init` bakes in `coreRef.path: "../evolith"` — a sibling that does not even match the real repo name (`evolith_arch32`).

**Fix:** a ~40-line guard that resolves against disk every path literal in `.harness/scripts/**`, `run:` steps of workflows, Helm values and evaluator constants. It would have caught every instance above.

### C3 — A multi-person governance apparatus deployed in a one-person organization

A lone maintainer cannot be blocked by their own gates without halting all work. So the admin bypass was enabled out of practical necessity and never revisited; the pre-push hook that rewrote tracked files made `git push --no-verify` the routine path, removing the local layer too. **Nobody has ever observed what happens when a gate legitimately blocks a change.**

`enforce_admins=false` · `required_pull_request_reviews=null` · `develop` unprotected · `ci-cd.yml` does not run on push to `develop` · 0 second-party approvals across 82 PRs · commitlint neither installed nor configured, with `.husky/commit-msg` failing open · `strict=false` allows merging against a stale base.

**Fix — and it is counterintuitive:** *fewer* gates. Reduce the required set to a small core that is genuinely green, enable `enforce_admins=true` **over that core**, and declare everything else advisory instead of leaving it required-but-ignored. With bus factor 1, 6 decorative gates are strictly worse than 2 that bite.

### C4 — Agentic waves create the new artifact *beside* the old one, with no obligation to kill the predecessor

The repository contains two of everything, and frequently **the one that executes or ships is the worse of the two**.

- Two LLM egress implementations with opposite postures: the internal CI one with key in header, redaction, budget and fail-closed; **the one published to npm with the key in the query string and zero controls**.
- The shared ruleset path resolver exists and **both** `policy.wasm` consumers bypass it.
- The GT-514/524 enforcer subsystem, complete and tested, **can never fire** because `disk-ruleset.repository.ts:189-202` discards the `enforce:` block. One missing field in a mapper silences an entire subsystem.
- `SupervisedAssistantClient` is the architecturally correct LLM port (fail-closed, HITL, off by default) and `GeminiProvider` bypasses it via a second port in the same package.
- Four different MCP tool counts, two CLI command counts, three latency budgets and two error budgets committed simultaneously, two k6 suites on different ports.

**Fix:** "predecessor retired" as a mandatory acceptance criterion for every wave; a *ban the raw primitive* rule (every new abstraction ships with the removal of the alternative path and a restricted-import rule preventing its recreation).

### C5 — The gap board records INTENT, not RESULT — and feeds what a buyer reads

The evidence guard checks that `validationCommands` are non-empty strings **but never executes them**. A GT can be closed against a command that does not exist.

GT-146 closes with commands pointing at three nonexistent files · GT-147 closes over a script no workflow invokes · GT-142 "Real LLM Bridge Pipeline in CI" is DONE while the job has never executed its script · GT-12 (`--dry-run`) is DONE with the flag parsed and never read, **a live defect in the published 1.1.0** · GT-568 records "0 vulnerabilities" while the same gate is red · **81 of 539 records (15%) contain no command at all: they are prose**.

**Fix:** have CI execute every `validationCommand` and fail if any does not resolve; no GT may close on evidence that is only prose.

---

## 5. Risks, ranked by impact × likelihood

| # | Risk | Lik. | Effort |
|---|---|---|---|
| 1 | **The verdict is a false green by construction.** 271 of 379 rules are not evaluated, are excluded from the denominator, and no field reveals it. In OPA mode the same field reports 379 having executed 0 policies. An evaluator that crashes is indistinguishable from a green one. | certain | days (reporting) + quarters (handlers) |
| 2 | **The flagship Tracker→Core integration records SKIPPED over real FAILs.** Core returns `{topology,gates,summary}`, the Tracker binds `{overallVerdict,results.gate[]}`; `ToDecision` falls through to `"SKIPPED"` and is persisted with `status=COMPLETED`. Both CIs green, 0 cross-repo contract tests. | certain | days + weeks |
| 3 | **The installable package predates the CRITICALs, and the public repo publishes the map.** npm serves 1.1.0 of 2026-07-18; the fixes are from 2026-07-23; the CHANGELOG names them by file under `[Unreleased]`; `SECURITY.md` promises 1.1.x is patched. | certain | **hours** |
| 4 | **There is no enforcement layer.** Required check red for 43 runs, 8 PRs merged through it, `enforce_admins=false`, `develop` unprotected, 0 of 6 required contexts is security. Every "Enforced" rung across 1,716 documents collapses to "Implemented". | certain | hours of config, weeks to make it green |
| 5 | **The MCP surface does not work in its documented configuration.** Verified against the **published tarball**: 47 tools announced, **47/47 FORBIDDEN** over stdio. The two escape routes the code defines (`--allow-no-auth`, `EVOLITH_MCP_ALLOW_NO_AUTH`) **exist and do nothing** — worse than their absence. Both CI oracles are blind by construction. | certain | hours for the fix |
| 6 | **The first 60 seconds fail twice.** `evolith` is not a published bin (only `evolith-cli`/`evolith-mcp`), and `init` creates a subdirectory, so the following `validate` validates the parent → `GOV-000` + 41 blocking. Inside the correct satellite: 46 findings / 39 blocking, dominated by the vendor's own monorepo rules. The binary also self-identifies as `main` in its own help. | certain | hours + days |
| 7 | **Accidental ~15-file ceiling and a quadratic path.** `body-parser` imposes 102,400 B by default, never overridden; file 16 of the repo itself already breaks it; `grep '413\|PayloadTooLarge'` in `src` → 0. The producer builds up to 8 MB against a 100 KB consumer (80× mismatch). k6 in 0 of 12 workflows. | certain | weeks |
| 8 | **Ungoverned LLM egress in a product that sells AI governance.** `GeminiProvider.ts:17` puts the API key in the query string; no timeout, budget, redaction or telemetry; public export of a published package. Disclosure: zero across README/SECURITY.md and the 8 package READMEs. ***Latent** exposure*: the only in-tree caller is a `plan` command not even registered in the CLI module — but it sits on the public surface a reviewer reads. | certain | days + hours |
| 9 | **The self-assessment a buyer would read is inflated and falsifiable in 10 minutes.** `maturity-assessment.md` marks Security *Level 4 / Validated* citing RLS and CDC → **0 files** across all of `src`; marks *Level 4 / Validated* citing Nx → no `nx.json` exists. The document itself defines Validated as *"passing all quality gates, tests, and active in CI/CD"*. | certain | days |
| 10 | **Nothing is operated nor can be.** `VPS_DEPLOY_ENABLED=false`; **0 occurrences of Alertmanager** in the whole repo; no chart carries a ServiceMonitor; 10 of 14 alerts link to runbooks in a nonexistent directory; telemetry is written to a local `.jsonl` that never leaves disk. With no usage signal there is no way to prune a surface this large. | certain | weeks |
| 11 | **The two engines give irreconcilable verdicts on the same input.** Same freshly created satellite with the published artifact: native → 96 checked / 39 blocking; OPA → 353 / 46. The dual-engine 8/8 parity claim is demonstrably false **in two commands**. | certain | weeks |
| 12 | **Coupling to the only monetizable product is unpinned.** The compose builds from `../../../evolith_tracker/src` with no submodule, tag or digest; the Tracker's `main` has **no branch protection** (against 6 checks on the engine); its UI is 25,961 LOC with **0 tests**. No third party can reproduce the product's only demo. | certain | days + weeks |
| 13 | **Bus factor 1 over a base with 44.3% ungated boundaries.** 2,716 of 2,730 commits from the same email; 0 approvals across 82 PRs; the package holding all agent logic (7,723 LOC, 29 specs, including the guard freezing the npm contract of a published package) **has no test job in any of the 12 workflows**. | certain | hours (jobs) / months (bus factor) |
| 14 | **The integration composite action always renders "0 violation(s) found".** The `jq` reads `.summary.violations`, a key absent from the envelope. *Important nuance:* the action **does block correctly** (it propagates the exit code); what is broken is the counter and the PR text. And no workflow in the repo exercises it, so no regression is possible. | certain | **hours** |

---

## 6. Real strengths

These are not courtesy items: they are what a competent buyer would value, and several are rare.

1. **The symbolic half of the thesis genuinely executes, offline, in under a second.** Published tarball with `policy.wasm` and 84 `.rego` policies; execution in an empty directory in **517–520 ms** warm, no DB, no server, no Docker. Sub-second time-to-first-run is the exact technical precondition of a bottom-up wedge, and almost no competitor in the category meets it.
2. **Hexagonal boundary enforcement is real**, proven with synthetic probes that genuinely reject (`There is no rule allowing dependencies from elements of type "domain" to elements of type "infrastructure"`), and it sits inside required contexts. Most repos shipping `eslint-plugin-boundaries` have it misconfigured and silently a no-op.
3. **Explicit anti-vacuous-pass discipline exists, born of having been burned and documented as a lesson.** It is the exact antidote to root cause C1, already invented in-house. The problem is deployment (2 guards of ~46), not capability.
4. **Surface parity is verified bidirectionally against live code**, not against a hand-kept list: 68 operations, `0 unregistered, 0 obsolete`. It is the only place in the repository where the project measures itself against code instead of prose, and the oracle design (same question to three surfaces) is above what most platform teams do.
5. **Orderly, readable technical base:** 20 edges / 0 cycles, `strict:true` with no overrides across 10 workspaces, `any` density of 0.192%, 7 files >500 LOC of 585, 6 TODOs aged 2 days. In 62k LOC written by one person in agentic waves, the absence of god-files is not what you would expect.
6. **The positioning thesis is self-critical and its differentiator exists in code.** `§14.2 "The honest moat"` explicitly rejects the rule engine as a moat; and `enforce edit` plus the Claude Code `PreToolUse` hook (blocking exit code 2) are implemented with specs. It names a real, unoccupied job.
7. **The Tracker contract conformance gate self-tests:** it fails the job if a corrupted pin passes, anchored to a public npm artifact reproducible without credentials. **The single best artifact in the entire audit.**
8. **The correct LLM egress implementation already exists in-house**, with 27 tests: key in header, budget, 8 redaction patterns, fail-closed. It turns risk #8 from a design problem into a porting problem.
9. **Complete bilingual EN/ES corpus** (~787 pairs), including ruleset payloads. Practically no competitor ships a first-class Spanish corpus — it would be a moat component if the ICP were named.

---

## 7. Kill shots — the questions a technical due diligence would ask

Ordered by how much damage they do in the room.

**1. "Of your rule corpus, what fraction actually executes when I run `validate`? Show me the denominator."**
111 reported over 108 executed of 379 (29%). 192 blocking rules skipped and invisible. In OPA mode: 379 reported, 0 policies executed. *Severity: fatal — invalidates every coverage figure ever communicated.*

**2. "Is your own protected branch green? Let's open Actions."**
No. 43 consecutive red runs on a required check, 8 PRs merged through, the latest with 0 reviews. *Fatal in this product specifically: the thesis sold is "CONTROL, not READ" and the vendor exercises no control over its own trunk.*

**3. "Show me the integration working end to end over a real violation."**
It persists `decision=SKIPPED, status=COMPLETED` over a hard architectural FAIL. *Fatal: the central promise fails silently while leaving an audit trail that actively lies.*

**4. "Show me a customer. Or a design partner. Or a person who isn't you."**
0 stars / forks / watchers in 80 days; 100 of 101 issues are the project's own bot; 0 of 107 PRs external. There is top-of-funnel traffic (73 views / 14 unique in 14 days, referrers from Google, ChatGPT, LinkedIn) and **zero conversion**. *Fatal for a round or an acquisition.*

**5. "Let's run your quickstart exactly as written."**
It fails twice, and whoever gets past it receives 39 blocking findings from the vendor's own monorepo rules. *Critical — it single-handedly explains the zero-adoption profile.*

**6. "Does the version I install today have the CRITICALs you documented patched?"**
No. Eight days published unpatched, with the map of the holes in the public CHANGELOG and `SECURITY.md` promising otherwise. *Critical — hard stop in a customer security review.*

**7. "Your self-assessment says Level 4 / Validated on security. Show me the code."**
RLS and CDC: 0 files. Nx: does not exist. *Fatal for credibility — once one inflation is found, no reviewer can keep using the rest of the document, including the honest scores.*

**8. "What is the maximum repository size your endpoint supports?"**
Never measured. Real ceiling ~15 files. *Critical — no possible answer to an enterprise customer's capacity question.*

**9. "What does your library send to third parties, and with what controls?"**
API key in the query string, no controls, not one line of disclosure, in a product that sells AI governance. *Critical — enterprise security questionnaire and DPA blocked.*

**10. "Does your own code pass your own blocking agentic-AI rules?"**
No: it violates ≥4 of the 9 AAI rules. No root `agent.config.json` exists, so the agentic-ai topology is never evaluated against Evolith. `grep -rn 'gen_ai' src .harness` → 0. *Critical — invalidates the claim that the rules are enforceable.*

**11. "What does it cost and what is behind the paywall?"**
No unit of measurement, tier, free/paid boundary, SLA or price exists. The only paid thing is the Tracker, which one hub sells as *"Active product"* and whose own hub, one directory down, declares *"Conceptual / design-stage — not yet implemented"*. *Critical for investment.*

**12. "If your CI broke without you noticing, how would you know?"**
It is already happening: "Winston Agentic Review" concludes `success` and executes its script in 0 runs. Trivy can never fail. ZAP scans 3 unauthenticated health probes and reports *"PASS: 146"*. *Critical — the detection system has the same defect it audits.*

**13. "Who else can maintain this if you get hit by a bus?"**
Nobody. *Critical in acquisition diligence — the asset is one person's knowledge, not the repository.*

**14. "Is the package I install built from the code I am reading?"**
Not guaranteed: 7 of 8 without `prepublishOnly`, 0 of 8 with attestations, published by hand. *High.*

---

## 8. Roadmap sequenced by dependency

### Week 0–1 · Stop the credibility bleeding
*All hours-scale, no dependencies between them. Prerequisite for any conversation with a customer, investor or buyer.*

- Publish **1.2.0** with the security wave, deprecate 1.1.0 on npm pointing at the fixed one, move the section from `[Unreleased]` to the published heading and issue the advisory `SECURITY.md` already promises.
- Make `main` green: the red is a derived-doc staleness assertion (`exploration.spec.ts:289`) — **minutes, not days**.
- Fix the quickstart **in both its causes**: alias `evolith` in the bin map (2 lines, matching the 447 invocations already written), and have `init` without `--name` initialize in the cwd, or have the README say `cd my-sat`. Set the `program name` (help currently says `main`).
- Correct the composite action's `jq` to `.data.issues | map(select(.blocking)) | length`.
- `GeminiProvider`: key to the `x-goog-api-key` header, `AbortController`, byte cap and `redactSecrets` **ported from the code that already exists** in `.harness/scripts/ci/agentic/`.
- Add a *"Network egress and data handling"* section to README, README.es, SECURITY.md and the `agent-runtime` and `cli` READMEs.
- Downgrade `maturity-assessment.md` Pillar 1 to `Designed`; delete the RLS, CDC and Nx citations; report parity against the published artifact.
- Decide and label which artifact each surface count describes: **HEAD serves 50/12/8, the published package 47/11/8** and no doc says so.

**Exit:** `npm view` later than the fixes with 1.1.0 deprecated · the 6 checks green with no bypass · the README quickstart completes in a clean container · the action reports a count ≠ 0 over a non-conforming fixture · zero `Validated` claims without a `file:line` or CI job.

### Weeks 2–6 · Make the verdict honest
*Everything commercial depends on this: there is no point courting a design partner for an engine that returns PASS over 192 blocking rules it never executed.*

- `rulesSkipped` + skipped-id array in `ValidationResult`, plus an `errored` state distinct from `skipped`; fail the run when the skipped fraction exceeds a threshold.
- Route both `policy.wasm` consumers through `rulesets-location.ts` and **unify skipped semantics between native and OPA** (today they give 96/39 vs 353/46 on the same input).
- Stop `OpaEvaluator` returning `passed` for rules with no policy: no policy is `skipped`, never a counted PASS.
- Emit `advisory`/`blocking:false` for the **91 rules** carrying the placeholder *"Concrete checks to be wired into the harness"*; enum in the schema and a guard rejecting `executable` without a machine-check field.
- **Propagate the `enforce:` block in `disk-ruleset.repository.ts:189-202` — one field** — to resurrect the already-built, already-tested `CompositeRuleEvaluator`/`EnforcerEvaluator` subsystem.
- Topology gating and `audience: core` for `CLI-RR-*` and `TAX-*`.

**Exit:** `validate` over a freshly initialized repo returns **0 blocking**, with an acceptance test · the envelope reports checked/skipped/total · the two engines agree · the 6 rules declaring `enforce:` actually fire against a fixture in CI.

### Weeks 4–10 (in parallel) · Close the instruments' blind spots
*Without this, every earlier fix decays again with no signal.*

- Write the path-literal guard (~40 lines).
- Extend the anti-vacuous pattern to all ~46 guards: published denominator + mandatory negative fixture.
- Execute every `validationCommand` on the board in CI.
- `test-agent-runtime` and `test-agent-runtime-api` jobs (~340 tests nobody runs today, including the public-surface freeze guard of a published package).
- Migrate the CLI to flat config (`--ext` does not exist in ESLint 9), drop the `continue-on-error` at `sdk-cli-ci.yml:142`, and add boundary configs to `agent-runtime` and `infra-providers`.
- Move the dual-engine parity gates onto the PR path (today only cron at 06:00).

### Weeks 8–16 · Make enforcement exist
*Depends on a green `main` and non-vacuous gates. Not fixable fast, and not fixable with more gates.*

- Reduce the required set to a genuinely green core and enable `enforce_admins=true` **over that core**; declare the rest advisory.
- Protect `develop`; make `ci-cd.yml` run on push to `develop`.
- Put at least one security check in the required core *(recompute `npm audit --omit=dev` first: the figure in circulation is not verifiable today)*.
- Pull CodeQL/Trivy/gitleaks/audit out of the workflow filtered to `src/sdk/cli/**` and pass `exit-code` to `trivy-action`.
- Update the Node base (20 EOL since 2026-04-30) in CI and the 4 Dockerfiles.
- Resolve the monorepo fracture: `@beyondnet/evolith-sdk` is 2.0.0 in-tree and 1.1.0 on npm, and **the CLI compiles against the registry tarball**.

**Exit:** a PR with a core check red **cannot** be merged, demonstrated empirically · 30 days with no merge to `main` with a required context red · a `v*` tag traverses the release end to end with provenance.

### Weeks 8–20 · A demonstrable, measured integration path
- Have the inline branch return the canonical `EvaluationResult`, with a **consumer-driven contract test** run in the Core CI and request/response fixtures published in `@beyondnet/evolith-contracts`.
- Pin the Tracker (submodule with tag, or GHCR images by digest) and apply branch protection to it.
- Explicit body limit with 413 handling on both ends; replace `OverlayFileSystem`'s linear scans with prefix indexes; cache the corpus.
- Unify the 6 latency budgets into one and wire k6; add a `helm lint/template/kubeconform` job.

**Exit:** a real round-trip verdict with `decision ≠ SKIPPED` over a genuine violation · the demo comes up from published references · 20,000 files under 60 s within the pod's memory limit.

### Months 3–6 · Turn the engine into a product
*None of this makes sense earlier: today a design partner would hit the broken quickstart, the false verdict and an unpatched package.*

- **Name a concrete ICP** and write it down; recruit 3 design partners **only** for the `enforce edit` + GitHub Action path; freeze everything else.
- Publish the `enforce edit` hook as a Claude Code / Cursor plugin, where the audience already is.
- Stand up an operated environment with Alertmanager, ServiceMonitor and executable runbooks; measure a real SLI.
- Expose the two cheapest already-derivable metrics (violations blocked at the gate; edit-hook blocks per week) with opt-in telemetry.
- Write the business model and **decide explicitly whether the monetization vehicle is still the Tracker or becomes the CLI wedge** — today the documents assume the former and all engineering goes to the latter.
- Self-govern: root `agent.config.json` and evaluate the repo against the 9 blocking AAI rules in CI. It is simultaneously the fix and **the best available sales demo**.

---

## 9. What would have to be true

Eight currently unvalidated premises on which Evolith being a commercial product depends:

1. That **at least one buyer** exists for whom "deterministically blocking what a coding agent produces" is a budgeted problem today. Zero of 929 documents names that buyer.
2. That the actually-executable fraction can rise above 29% without **rewriting the corpus**. If closing the gap requires writing ~240 handlers, the product's cost is another order of magnitude.
3. That **the moat is the corpus and not the engine**. If the corpus is replicable in months, what is defensible is the live graph plus edit-time enforcement — and then much of the 1,716 documents is cost, not asset.
4. That **a single maintainer can operate a multi-person apparatus**. The evidence says no. Either a second pair of hands arrives, or the apparatus shrinks to what one person keeps green.
5. That **the Tracker remains the monetization vehicle**. Today the documents assume so while all engineering goes to the CLI wedge, and the Tracker exists (25,961 LOC of UI) contradicting the Core's own documentation saying it does not.
6. That the market **tolerates a governance tool whose vendor does not govern itself**. It is the exact angle an incumbent would attack in a comparative evaluation.
7. That an **evaluation architecture exists that scales without a rewrite**. Never measured, because there is no production.
8. That the **1.9 : 1 documentation-to-code ratio** (221,305 `.md` lines against 116,243 `.ts`) is an asset and not a maintenance liability. Today the evidence points to the latter: docs are the repository's most drift-laden surface.

---

## 10. Appendix — Discarded claims

30 claims fell or were corrected under adversarial verification. They are listed because a report showing only what survived is not auditable. The most relevant:

**Refuted (dropped):**
- *"`evolith-mcp` with no arguments starts and exits without listening"* — `serve` **is** the default; the README is right.
- *"The LLM half of the neuro-symbolic thesis exists nowhere in the code"* — it exists and works; the problem is that it is **ungoverned**. A claim of the form *"X exists nowhere"* should never have been issued from keyword searches over markdown.
- *"6 import cycles cause runtime `undefined`"* — all back-edges are type-only and `tsc` erases them. Severity: cosmetic.
- *"The 80% coverage threshold is not enforced and CONTRIBUTING.md lies"* — it is enforced with a `jq`/`bc` gate; the auditor looked in the wrong workflow.
- *"70% of the TypeScript is never scanned; zero SAST"* — inferred from the trigger without querying the API: 57 of 64 open CodeQL alerts sit precisely in the packages declared unscanned. It is PR-level latency, not absence.
- *"All 9 Kubernetes probes point at a constant handler"* — that is correct for liveness/startup; the real defect is **one** probe (`values.yaml:78`). ~9× narrower than claimed.
- *"Tracing is off by default"* — it is **on in every container and failing to export**; the proposed remediation was a no-op.
- *"The `brace-expansion` override blocks the very fix it was created to deliver"* — the patch shipped 5 days **after** the override. The red is advisory decay, not a fabricated closure.

**Corrected in the opposite direction (worse than reported):**
- *"The 8 packages carry SLSA provenance"* — the auditor read `dist.signatures` as provenance. **0 of 8** carry `dist.attestations`.
- *"Two branch-protection checks are red"* — only one is, **and there is no mystery about how red commits land**: `enforce_admins` is explicitly false and they are direct pushes.

**Corrected downward (arithmetic):**
- 46.7% without boundary lint → **44.3% of production code**.
- 1,129 non-spec `.ts` files → **585**; 8 files >500 LOC → **7**.
- 31 advisories / 29 HIGH as customer exposure → the production tree is far smaller *(exact figure pending recomputation)*.
- 72.2% of commits Markdown-only → **39.2% strict** (883/2,255).

---

*Report produced by multi-agent audit with adversarial verification. Every figure marked verified has a command executed against this repository or against the published npm artifact behind it. Unverified figures are segregated in §2 and must not be quoted externally without being regenerated.*
