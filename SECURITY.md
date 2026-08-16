# Security Policy

> **Bilingual Navigation:** [Versión en Español](./SECURITY.es.md)

The Evolith maintainers take the security of the framework and its execution
surfaces (CLI, MCP server, and Service CORE API) seriously. This document
explains which versions receive security updates and how to report a
vulnerability responsibly.

## Supported Versions

Security fixes are applied to the latest minor release line. Older lines do not
receive backports; please upgrade to a supported version before reporting.

| Version | Supported          | Notes                                  |
| ------- | ------------------ | -------------------------------------- |
| 1.3.x   | :white_check_mark: | Current stable line — actively patched |
| 1.2.x   | :white_check_mark: | Critical fixes only                    |
| < 1.2   | :x:                | Superseded; not supported              |

## Reporting a Vulnerability

**Please do not open public GitHub issues, pull requests, or discussions for
security vulnerabilities.** Public disclosure before a fix is available puts
all users at risk.

Use one of the private channels below:

1. **GitHub Private Vulnerability Reporting (preferred).** Go to the
   repository's **Security → Report a vulnerability** tab
   (<https://github.com/beyondnetcode/evolith_arch32/security/advisories/new>).
   This opens a private advisory visible only to you and the maintainers.
2. **Email.** Write to **beyondnet.peru@gmail.com** with the subject line
   `[SECURITY] Evolith — <short summary>`. If you wish to encrypt the report,
   request the maintainer's public key in a first contact message containing no
   sensitive details.

### What to include

To help us triage quickly, please provide:

- A description of the vulnerability and its impact.
- The affected component (CLI, MCP server, Core API, a specific ruleset/policy,
  a dependency) and version (`1.1.0`, commit SHA, or branch).
- Step-by-step reproduction instructions or a proof of concept.
- Any known mitigations or suggested fixes.

### Scope

**In scope:** the Evolith source code in this repository — `src/sdk/`, `src/apps/`,
`src/packages/`, the OPA policies and rulesets under `src/rulesets/`, the CI/CD harness
(`.harness/`, `.github/workflows/`), and the published `@beyondnet/evolith-*` packages.

**Out of scope:** third-party dependencies (report those upstream; we track them
via Dependabot and `npm audit`), issues requiring a compromised developer
machine or already-leaked credentials, and findings in example/reference
documentation that do not affect executable surfaces.

## Response Targets

These are good-faith targets for a community-maintained project, not contractual
guarantees:

| Stage                         | Target                         |
| ----------------------------- | ------------------------------ |
| Acknowledgement of report     | Within 3 business days         |
| Initial assessment / triage   | Within 7 business days         |
| Fix or mitigation for High/Critical | Within 30 days (best effort) |
| Coordinated public disclosure | After a fix is released        |

## Disclosure Process

1. You report privately through one of the channels above.
2. We confirm receipt, assess severity (CVSS-style: Low / Medium / High /
   Critical), and may ask clarifying questions.
3. We develop and test a fix on a private branch.
4. We release a patched version and publish a GitHub Security Advisory
   crediting the reporter (unless anonymity is requested).
5. We coordinate the public disclosure timeline with you.

## Recognition

We are grateful to security researchers who report responsibly. With your
consent, we will credit you in the published advisory and the `CHANGELOG.md`.

## Network Egress and Data Handling

Evolith is local-first. The CLI, the rulesets, the OPA policies and the stateless
evaluation Core all execute on the operator's machine, and repository contents are
never uploaded: evaluation happens where the code is. The Core API and the MCP HTTP
transport are servers the operator hosts. No surface reports telemetry, analytics or
a licence check to the maintainers.

There is exactly **one** outbound third-party integration in the published packages.
It is **disabled by default** and the following is its complete disclosure. Answer
enterprise questionnaires and DPAs from this section.

### The single egress path

| Item | Disclosure |
|---|---|
| Component | `GeminiProvider`, a public export of `@beyondnet/evolith-agent-runtime` (`src/packages/agent-runtime/src/providers/GeminiProvider.ts`) |
| Endpoint | one HTTPS `POST` to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, default model `gemini-2.5-flash`. No other host is contacted by the package. |
| Default state | **DISABLED.** With no configuration the provider opens no socket: it records the refused attempt and throws `LlmEgressDisabledError`. |
| Opt-in | the environment variable `EVOLITH_LLM_EGRESS=true` (or `1`), or an explicit `new GeminiProvider({ enabled: true })`. There is no implicit activation path. |
| Credential | `EVOLITH_LLM_API_KEY`, falling back to `GEMINI_API_KEY`. Transmitted in the `x-goog-api-key` request header, never in the URL query string. Absent a key, the call is refused before a socket opens. |
| Transport limits | 30,000 ms `AbortController` timeout; 60,000 bytes / ~15,000 estimated tokens, enforced over the exact bytes to be sent and **failing closed** rather than truncating. |
| Human-in-the-loop | the intended wiring injects the provider as the `IAssistantTransport` of `SupervisedAssistantClient`, itself off by default and requiring an explicit human approval before the transport is reached. |

**Data transmitted.** Through the governed `IAssistantTransport` seam: the request
intent, the optional tool id, the request parameters, the `dryRun` flag and the
governed skill catalog (id and description only). Through the deprecated
`ILLMProvider` seam (`generateStructuredJson`): the caller's system prompt and user
prompt verbatim. Both are secret-redacted before serialization across 8 pattern
classes — PEM private keys, JWTs, AWS access key ids, Google API keys, GitHub PATs,
Slack tokens, `Bearer` tokens, and generic `KEY`/`SECRET`/`TOKEN`/`PASSWORD`
assignments.

**Data deliberately excluded.** Tenant id, product id, initiative id, workspace
reference, requester identity and repository contents are not part of the transport
payload, by construction.

**Auditability.** Every attempt, including refusals, emits one content-free JSON
line prefixed `[evolith:llm-egress]` carrying provider, endpoint, purpose, outcome,
byte and token counts, redaction count, HTTP status, duration and correlation id.
Prompt and response content are never logged.

### Sub-processors

| Sub-processor | Purpose | When engaged |
|---|---|---|
| Google LLC — Gemini API | LLM inference for the agent-runtime assistant/plan path | Only when LLM egress is explicitly armed via `EVOLITH_LLM_EGRESS`; never by default |

An operator-configured OpenTelemetry collector (`OTEL_ENABLED=true`) receives CLI
traces, but it is the operator's own endpoint, not a maintainer-side processor.

### Known limitations of these controls

Stated so a reviewer does not have to discover them:

- Redaction is pattern-based, not a data-loss-prevention control: it materially
  reduces accidental credential egress, it does not guarantee absence.
- The header, timeout, budget, redaction and response-schema controls are covered by
  unit tests with an injected `fetch`. They have **not** been exercised against the
  live Google endpoint.
- The timeout and budget values are inherited from the repository's own CI reviewer
  and are not tuned for large interactive prompts, which fail closed rather than
  degrade.
- No command registered in the shipped CLI reaches this provider today, so a default
  CLI install performs no LLM egress at all.
- The npm tarballs currently on the registry predate this hardening; the controls
  described above are on `develop` and reach the registry with the next release.
  Until then, treat the published `GeminiProvider` as ungoverned and do not arm it.
- The repository does not yet run the product's own 9 blocking `AAI-*` agentic-AI
  rules against itself in CI; that gate is still open work.

## Operational Security Posture

For reference, this project already enforces:

- Dependency scanning via Dependabot and `npm audit` (CI gate at `--audit-level=high`).
- SAST via CodeQL, container/filesystem scanning via Trivy, and secret scanning
  via gitleaks in CI (`.github/workflows/sdk-cli-ci.yml`). `CodeQL SAST` is a
  **required** status check on both `main` and `develop`.
- GitHub secret scanning with push protection enabled on the repository.
- Input validation, security headers (`helmet`), rate limiting, and API-key
  authentication on the executable surfaces.
- Secrets are never committed; `.env` is git-ignored and credentials are managed
  outside the repository.

### Supply-chain posture: measured, not asserted

Prose is not a posture. The list above says what exists; it cannot say whether it
is still true next month. Two artifacts answer that instead:

- **An automated, external, numeric score.** [OpenSSF Scorecard](https://scorecard.dev)
  runs weekly from `.github/workflows/openssf-scorecard.yml`, publishes to the
  public OpenSSF API, uploads SARIF to code scanning, and — this is the part that
  makes it a measure — is compared against floors committed in
  `.harness/security/scorecard-baseline.json` by a gate that **fails the workflow
  on a regression**.
- **A control-by-control mapping**, with the verification behind every row, plus
  the declared SLSA build target and an honest inventory of the gap to it:
  [Supply-Chain and Repository Posture](./reference/core/control-center/security/supply-chain-posture.md).

**Verifying what you install.** Packages published by
`.github/workflows/npm-release.yml` carry npm provenance attestations, signed via
Sigstore against a GitHub OIDC identity. Verify them yourself:

```bash
npm audit signatures
```

Seven of the eight `@beyondnet/evolith-*` packages carry an attestation on their
`latest` version as of 2026-07-30; `@beyondnet/evolith-contracts` and every
version published before that workflow existed do not. The posture document names
each gap and who has to close it, rather than rounding up.
