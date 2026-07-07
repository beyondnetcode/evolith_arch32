# Evolith Agent Runtime — .harness Integration

> **Bilingual Navigation:** [Versión en Español](./harness-integration.es.md)

The runtime treats `.harness` as an official **capability provider** through
`IHarnessPort`. It discovers what `.harness` declares and executes it — it never
reimplements or replaces it (design rule #4).

## Why .harness stays the executor

`.harness` is the versioned, auditable, governed mechanism that actually runs
scripts, playbooks, validators, audits and skills. The runtime adds decisioning,
governance and trazability around it. The boundary is enforced by the port: the
runtime holds only `IHarnessPort`, and the concrete `HarnessProcessAdapter` is
the only code that knows how to spawn `.harness` scripts.

## The manifest convention

A new file, [`.harness/manifest.yaml`](../../../../.harness/manifest.yaml), makes
`.harness` discoverable. It is the single, versioned declaration of every
capability the runtime may invoke:

```yaml
version: 1
capabilities:
  - name: sdlc-phase-gate-validator
    type: validator
    description: Validate a SDLC phase/gate by checking required vs presented artifacts.
    entry: .harness/playbooks/sdlc-phase-gate-validator.mjs
    runner: node
    inputs:
      gate: { type: string }
      requiredArtifacts: { type: array, items: { type: string } }
      presentArtifacts: { type: array, items: { type: string } }
    outputs:
      status: { type: string }
      missing_artifacts: { type: array }
    permissions: [read:repo, run:validator]
    requiresApproval: false
    emitsTrace: true
    requiresPolicy: true
    policyRef: evolith.gates.discovery
```

## Capability declaration fields

Each capability declares its contract and its governance posture:

| Field | Meaning |
|---|---|
| `name` | Unique capability id (referenced by a skill) |
| `type` | `playbook` / `validator` / `audit` / `script` / `skill` / `adapter` |
| `description` | Human summary |
| `entry` | Repo-relative path the runner executes |
| `runner` | `node` / `opa` / `shell` — how the entry is launched |
| `inputs` | Declared arguments (loose schema) |
| `outputs` | Declared outputs the capability emits |
| `permissions` | Scopes required to run |
| `requiresApproval` | Whether a human must approve first (HITL) |
| `emitsTrace` | Whether execution publishes a Tracker trace event |
| `requiresPolicy` | Whether the result must pass OPA validation |
| `policyRef` | Optional OPA package to evaluate against |

## Discovery and execution

`HarnessProcessAdapter` reads the manifest, exposes `discover()`/`describe()`,
and `execute()` spawns the entry:

- `runner: node` runs `node <entry> --args <json>`,
- `runner: opa` runs the bundled `.harness/bin/opa`,
- `runner: shell` runs the entry through `sh -c`.

Standard output is captured; if it is JSON, it becomes the structured
`HarnessExecutionResult.data`. When a script prints human text instead, the
result falls back to the process exit signal — still a valid governed result.

## Context passing (tenant/product/initiative)

Tenant/product/initiative are passed **per execution** as an environment payload
(`AGENT_RUNTIME_CONTEXT`), never embedded in `.harness` (design rule #8). The same
capability therefore serves every tenant, and `.harness` stays free of tenant
state.

## Mapping skills to harness capabilities

A `SkillDescriptor` (in the SkillRegistry) maps an intent to a capability. For a
harness-backed skill, `harnessCapability` names the manifest entry; for a
composite skill, `.harness` produces the facts and the Core evaluates them. See
the seeded catalog in
[`default-skills.ts`](../../../../src/packages/agent-runtime/src/adapters/skills/default-skills.ts)
and [Extending](./extending.md) to add your own.
