# @beyondnet/evolith-agent-runtime

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Evolith Agent Runtime — a decoupled agentic layer that operates Evolith Core
through Ports & Adapters (Hexagonal Architecture). It orchestrates, remembers,
validates and executes Core capabilities through ports. It does **not** replace
`.harness` (the official governed executor) and does **not** depend on Hermes or
any LLM framework (those are optional, replaceable adapters).

Architecture docs: [`reference/core/architecture/foundations`](../../../reference/core/architecture/foundations/README.md)
· Decision: [core/ADR-0102](../../../reference/core/architecture/adrs/core/0102-evolith-agent-runtime.md).

<a name="network-egress-and-data-handling"></a>

#### Network egress and data handling

> **This package is the only one in Evolith that can contact a third party, and it does not do so by default.** Read this before deploying it. Repository-wide disclosure: [SECURITY.md](../../../SECURITY.md).

| Item | Disclosure |
|---|---|
| Component | `GeminiProvider` (`src/providers/GeminiProvider.ts`), a public export of this package |
| Endpoint | one HTTPS `POST` to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`, default model `gemini-2.5-flash`. No other host is contacted. |
| Sub-processor | **Google LLC (Gemini API)**. Prompt content sent through this path is processed by Google under its terms for that API. |
| Default state | **DISABLED.** Unconfigured, the provider opens no socket: it audits the refused attempt and throws `LlmEgressDisabledError`. Every other adapter default is in-memory or stub, so the package makes zero network calls out of the box. |
| Opt-in | `EVOLITH_LLM_EGRESS=true` (or `1`), or an explicit `new GeminiProvider({ enabled: true })`. There is no implicit activation. |
| Credential | `EVOLITH_LLM_API_KEY`, falling back to `GEMINI_API_KEY`; sent in the `x-goog-api-key` request header, never in the URL. No key means the call is refused before a socket opens. |
| Limits | 30,000 ms `AbortController` timeout; 60,000 bytes / ~15,000 estimated tokens (`DEFAULT_EGRESS_BUDGET`), enforced over the exact bytes to be sent and failing closed rather than truncating. |
| Response handling | the Gemini envelope and the inner JSON payload are both validated against declared schemas (`GEMINI_RESPONSE_SCHEMA`, `ASSISTANT_PROPOSAL_SCHEMA`) instead of being cast. |

**What is transmitted.** Through `IAssistantTransport.invoke` (the governed seam):
the request intent, the optional tool id, the request parameters, the `dryRun` flag,
and the governed skill catalog (id and description only). Through the deprecated
`ILLMProvider.generateStructuredJson` seam: the caller's system prompt and user
prompt verbatim. Both are secret-redacted first across 8 pattern classes — PEM
private keys, JWTs, AWS access key ids, Google API keys, GitHub PATs, Slack tokens,
`Bearer` tokens, and generic `KEY`/`SECRET`/`TOKEN`/`PASSWORD` assignments.

**What is not transmitted.** Tenant id, product id, initiative id, workspace
reference and requester identity are excluded from the payload by construction, as
are repository contents.

**Audit.** Every attempt, including refusals, emits a content-free
`[evolith:llm-egress]` JSON line (provider, endpoint, purpose, outcome, bytes,
estimated tokens, redaction count, HTTP status, duration, correlation id) through
`ILlmEgressAudit`; inject your own sink to route it. Prompt and response content are
never logged.

**Intended wiring (HITL).** Inject `GeminiProvider` as the `IAssistantTransport` of
`SupervisedAssistantClient`, which is itself off by default and requires an explicit
human approval before the transport is reached. The `ILLMProvider` seam is
`@deprecated`: it runs through the identical governed core but has no approval gate.

**Honest limitations.** Redaction is pattern-based, not a DLP control. The controls
above are covered by unit tests with an injected `fetch` and have not been exercised
against the live Google endpoint. The timeout and budget are inherited from the
repository's own CI reviewer and are not tuned for large interactive prompts, which
fail closed. The tarball currently on npm predates this hardening — until the next
release reaches the registry, treat the published `GeminiProvider` as ungoverned and
do not arm it.

## Install

This package is part of the Evolith monorepo workspaces. Build it with the rest
of the graph (`npm run build` at the root) or standalone:

```bash
npm --workspace @beyondnet/evolith-agent-runtime run build
npm --workspace @beyondnet/evolith-agent-runtime test
```

## Quickstart

```ts
import { createAgentRuntime, parseAgentRuntimeRequest } from '@beyondnet/evolith-agent-runtime';

const { runtime, deps } = createAgentRuntime(); // safe stub/in-memory adapters
const result = await runtime.handle(parseAgentRuntimeRequest({
  intent: 'validate_discovery_gate', tool: 'validate-discovery-gate',
  tenant: 'acme', initiative: 'init_001', phase: 'discovery', gate: 'prd_readiness',
  parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'] },
}));
```

A runnable example: `examples/validate-discovery-gate.mjs`.

## Architecture

The package is hexagonal: `domain` (contracts, ports, tokens), `application`
(the orchestration service + pure mappers), `adapters` (concrete tech), and a
`bootstrap` factory. No framework or LLM is a domain dependency.

## Ports

`IAgentRuntime`, `IHarnessPort`, `ICoreEvaluationPort`, `IPolicyValidationPort`,
`ITrackerTracePort`, `IMemoryPort`, `ISkillRegistryPort`, `ISchedulerPort`,
`ICommunicationGatewayPort`, `IApprovalPort`, `IAgentEnginePort`.

## Adapters

Defaults are in-memory/stub. Real adapters: `HarnessProcessAdapter` (reads
`.harness/manifest.yaml`), `OpaCliPolicyValidationAdapter`,
`HttpTrackerTraceAdapter`, `InProcessCoreEvaluationAdapter` /
`HttpCoreEvaluationAdapter` (run the real stateless Core, in-process or over the
Core API), `FileSchedulerAdapter` / `FileMemoryAdapter` (durable, file-backed),
and `HermesAgentAdapter` (optional engine).

## Versioning & contract stability

This package follows **SemVer**. The public surface is the three subpath exports
declared in `package.json` — `.` (main), `./ports`, and `./adapters`. The
`public-surface.spec.ts` guard freezes the runtime value surface of `.` and
`./adapters`, so adding, removing or renaming a public export is a deliberate,
reviewed change.

- **`./ports`** is a type-only surface (port interfaces + canonical contract
  types). It is frozen at the type level — the consumer's `tsc` is the guard.
- **`schemaVersion`** on `EvaluationResult` (and any other versioned contract)
  is independent of the package version: it is bumped **only** on an
  incompatible change to that contract's shape, never for additive fields.
- **Deprecation:** a public export is marked `@deprecated` (naming its
  replacement) for at least one minor before removal; a removal or rename ships
  in a **major**, additive exports ship in a **minor**.



## Scripts

```bash
npm run build                  # tsc -> dist/
npm test                       # jest
npm run example:discovery-gate # run the end-to-end example (after build)
```
