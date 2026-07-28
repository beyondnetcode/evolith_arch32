# Agent Runtime — operator runbooks

Referenced by `agent.config.json` (`operationalBudgets.runbooksPath`), which the
`AAI-R08` rule of the `agentic-ai` topology requires to exist and to be readable.
These are the procedures an operator follows when a governed agent misbehaves.
Bilingual note: this file is the operational surface for both language editions
of the README.

## 1. Stop all outbound AI traffic

1. Unset the opt-in flag: `EVOLITH_LLM_EGRESS` (any value other than `true`/`1`
   disables it) and restart the process. Egress is off by default, so an
   unconfigured deployment is already stopped.
2. Confirm from the audit stream: every attempt — including refusals — emits a
   content-free `[evolith:llm-egress]` JSON line. After the restart the expected
   line for any attempt is `"outcome":"refused","reason":"egress-disabled"`.
3. If the flag cannot be changed immediately, revoke the API key
   (`EVOLITH_LLM_API_KEY` / `GEMINI_API_KEY`) at the provider. The provider fails
   closed with `LlmEgressConfigurationError` before opening a socket.
4. Human gate as the last line: with no `IApprovalPort` and no
   `SupervisedAssistantClient` grant, the call is refused with
   `LlmEgressUnsupervisedError` and nothing is sent.

Budgets: 30,000 ms timeout, 60,000 bytes / ~15,000 estimated tokens per request,
enforced over the exact bytes to be sent and failing closed rather than
truncating (`DEFAULT_EGRESS_BUDGET` in `src/providers/llm-egress.ts`).

## 2. A capability script is hung, looping, or eating memory

1. Every capability runs as a child process with a hard `SIGKILL` timeout
   (`HarnessProcessOptions.timeoutMs`, default 120,000 ms) and a bounded heap
   (`--max-old-space-size`, default 2,048 MB). A hung capability terminates on
   its own; there is no unbounded run.
2. To lower the ceilings for a deployment, construct the adapter with
   `new HarnessProcessAdapter({ timeoutMs, maxMemoryMb })`.
3. To take a capability out of service, remove its entry from
   `.harness/manifest.yaml`: the adapter executes only what the manifest
   declares and answers `exitCode 127` for anything else.

## 3. A capability needs an environment variable it does not have

Since GT-607 a spawned capability receives an **allowlisted** environment, never
`...process.env`. Nothing whose name looks like a credential or an endpoint
(`*_TOKEN`, `*_KEY`, `*_SECRET`, `*_URL`, `*_URI`, …) reaches a child from any
path.

1. If the variable is ordinary configuration, add its name to
   `HarnessProcessOptions.envAllowlist`.
2. If it is a credential, it is refused by design. Pass the value explicitly
   through `HarnessProcessOptions.env` after reviewing that this specific
   capability should hold it, or — better — have the capability ask the runtime
   for what it needs instead of holding the secret itself.
3. Refusals are reported through `HarnessProcessOptions.onEnvDenied`, so wire it
   to your logger before debugging a "missing" variable.

## 4. Credential compromise

Declared in `agent.config.json` under `credentialLifecycle`, and binding on the
deployment that holds the tokens:

| Item | Commitment |
|---|---|
| Delegation TTL | 3,600 s maximum |
| Rotation cadence | 90 days |
| Revocation on incident | immediate |
| Maximum propagation | 300 s |

Procedure: revoke at the issuer, redeploy with the new value, then confirm from
the append-only run journal (`FileRunJournalAdapter`, one line per step, keyed by
`correlationId`) that no run used the old credential after the revocation
timestamp.

## 5. Approvals are stuck

Approval records carry `expiresAt` and expire to a **fail-closed deny**, so a
forgotten request never becomes a silent grant. To unblock, resolve the request
through the configured `IApprovalPort` adapter (chat, Slack, Tracker) or restart
the run — a re-issued request gets a fresh record and a fresh TTL.

## 6. Known limits (do not page on these)

- Network isolation for capability children is **declarative**: the runtime
  denies them credentials and endpoints, but does not block sockets. Hard
  isolation requires the sandboxed runner of ADR-0081, which is not implemented.
- `sandbox.maxCpuCores` is declarative — there is no CPU pinning.
- `operationalBudgets.mcpToolConcurrency` is declarative — this package has no
  MCP scheduler of its own.
- Secret redaction before egress is pattern-based, not a DLP control.
