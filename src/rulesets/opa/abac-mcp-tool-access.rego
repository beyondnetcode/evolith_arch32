# ABAC Policy for Agentic MCP Tool Execution
# Reference implementation for ADR-0087
# Dual-Engine Parity: This policy mirrors the TypeScript ABAC evaluator
#
# Input schema:
# {
#   "user": { "id": string, "roles": [string], "tenant": string },
#   "tool_name": string,
#   "resource_domain": string,
#   "environment": string
# }

package evolith.abac

import rego.v1

# ---------------------------------------------------------------------------
# Role hierarchy
# ---------------------------------------------------------------------------
read_only_roles  := {"viewer", "auditor"}
developer_roles  := {"developer", "qa"}
operator_roles   := {"operator", "sre"}
architect_roles  := {"architect", "admin"}

# ---------------------------------------------------------------------------
# Tool classification
# ---------------------------------------------------------------------------
# Dual-engine parity: these sets MUST mirror TOOL_CLASSIFICATION (plus the legacy
# READ_TOOLS/WRITE_TOOLS/DEPLOY_TOOLS sets) in
# src/packages/mcp-server/src/mcp/abac-evaluator.ts. The abac-classification
# coverage guard-test keeps the TS map in lockstep with the registered tool
# surface; this rego is the OPA twin. If the two drift, OPA fail-closes governance
# tools with ABAC-03 in production even though native ABAC allows them.
#
# GT-602: that is not hypothetical — it happened. Fifteen tools (the ADR catalog,
# the pattern catalog, the scaffolding family, upgrade plan/apply and fixtures)
# were registered in TypeScript and never added here, so an `architect` in
# `production` got ABAC-03 + ABAC-01 from the compiled bundle for all fifteen and
# `mcp-tool-dispatch.ts` (native AND opa) refused them. The parity is now enforced
# mechanically by `abac-rego-parity.spec.ts` in the mcp-server package, which
# parses THIS file and fails the build on any divergence in either direction.
read_tools := {
  # primitives / legacy READ_TOOLS
  "evolith-ping",
  "evolith-echo",
  "evolith-read-gap-tracking",
  "evolith-read-file",
  "evolith-list-dir",
  "evolith-gate-evaluate",
  "evolith-gate-status",
  # core validation / evaluation
  "evolith-validate",
  "evolith-evaluate",
  "evolith-composable-validate",
  "evolith-architecture-validate",
  "evolith-drift-detect",
  "evolith-phase-artifacts-evaluate",
  # topology catalog / advisory
  "evolith-topology-list",
  "evolith-topology-get",
  "evolith-topology-recommend",
  # canonical pattern catalog (PAT-NNNN records; no mutation)
  # GT-602: absent from this set until 2026-07-28, so OPA answered ABAC-03 for
  # them while native ABAC allowed them, and dispatch (native AND opa) forbade
  # them outright.
  "evolith-pattern-list",
  "evolith-pattern-get",
  "evolith-pattern-list-by-topology",
  # ADR catalog (reads) — GT-602
  "evolith-adr-list",
  "evolith-adr-get",
  "evolith-adr-matrix",
  # upgrade planning: computes a plan, applies nothing — GT-602
  "evolith-upgrade-plan",
  # moscow (reads)
  "evolith-moscow-load",
  "evolith-moscow-list",
  "evolith-moscow-validate",
  "evolith-moscow-report",
  # sdlc status
  "evolith-sdlc-status",
  # phase advance — GT-379: NON-BINDING read-only proposal (evaluates exit
  # criteria without mutating canonical state), so it is `read`, not `write`
  # (GT-475 dual-engine parity with TOOL_CLASSIFICATION).
  "evolith-phase-advance",
  # metrics
  "evolith-dora-metrics",
  "evolith-metrics",
  # config get
  "evolith-config-get",
  # agents (reads)
  "evolith-agent-list",
  "evolith-agent-validate",
  # satellites (reads)
  "evolith-satellite-list",
  "evolith-satellite-status"
}

write_tools := {
  # primitives / legacy WRITE_TOOLS
  "evolith-write-file",
  "evolith-replace-file",
  "evolith-run-command",
  # moscow (mutations)
  "evolith-moscow-create",
  "evolith-moscow-update",
  "evolith-moscow-remove",
  # sdlc handoff
  "evolith-sdlc-handoff",
  # config set
  "evolith-config-set",
  # auto-fix
  "evolith-auto-fix",
  # agents (mutations)
  "evolith-agent-install",
  "evolith-agent-upgrade",
  "evolith-agent-remove",
  "evolith-agent-run",
  # satellites (mutations)
  "evolith-satellite-create",
  "evolith-satellite-adopt",
  # ADR catalog (mutations) — GT-602
  "evolith-adr-create",
  "evolith-adr-update",
  # scaffolding / generation: all of these write files into the working tree
  # — GT-602
  "evolith-docs-scaffold",
  "evolith-scaffold",
  "evolith-init-batch",
  "evolith-sdlc-generate",
  "evolith-fixtures",
  # upgrade application (mutates pinned versions) — GT-602
  "evolith-upgrade-apply"
}

deploy_tools := {
  "evolith-deploy",
  "evolith-merge-branch",
  "evolith-publish-release"
}

# ---------------------------------------------------------------------------
# Helper: check if the user holds at least one of the allowed roles
# ---------------------------------------------------------------------------
user_has_role(allowed_roles) if {
  role := input.user.roles[_]
  allowed_roles[role]
}

# ---------------------------------------------------------------------------
# ABAC decision rules
# ---------------------------------------------------------------------------

# Allow read tools for ALL authenticated users
allow if {
  read_tools[input.tool_name]
  count(input.user.roles) > 0
}

# Allow write tools for operator and architect roles
allow if {
  write_tools[input.tool_name]
  user_has_role(operator_roles | architect_roles)
}

# Allow write tools in non-production environments for developers
allow if {
  write_tools[input.tool_name]
  user_has_role(developer_roles)
  input.environment != "production"
}

# Allow deploy tools ONLY for architects and operators
allow if {
  deploy_tools[input.tool_name]
  user_has_role(architect_roles | operator_roles)
}

# Block ALL deploy tools in production unless user is architect
deny if {
  deploy_tools[input.tool_name]
  input.environment == "production"
  not user_has_role(architect_roles)
}

# ---------------------------------------------------------------------------
# Violations: deny overrides allow
# ---------------------------------------------------------------------------

violations contains {"id": "ABAC-01", "message": msg} if {
  deny
  msg := sprintf(
    "Tool '%v' explicitly denied for user '%v' with roles %v in environment '%v'",
    [input.tool_name, input.user.id, input.user.roles, input.environment]
  )
}

violations contains {"id": "ABAC-01", "message": msg} if {
  not allow
  msg := sprintf(
    "Tool '%v' not allowed for user '%v' with roles %v in environment '%v'",
    [input.tool_name, input.user.id, input.user.roles, input.environment]
  )
}

violations contains {"id": "ABAC-02", "message": "No roles present on user context; all tool calls denied"} if {
  count(input.user.roles) == 0
}

violations contains {"id": "ABAC-03", "message": "Unknown tool requested; not in any known classification"} if {
  not read_tools[input.tool_name]
  not write_tools[input.tool_name]
  not deploy_tools[input.tool_name]
}
