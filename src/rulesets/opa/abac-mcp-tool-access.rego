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
  # GENERATED from AbacEvaluator.toolProjection() — do not edit by hand.
  # Regenerate: node .harness/scripts/generate-abac-tool-sets.mjs
  "evolith-adr-get",
  "evolith-adr-list",
  "evolith-adr-matrix",
  "evolith-agent-list",
  "evolith-agent-validate",
  "evolith-architecture-validate",
  "evolith-composable-validate",
  "evolith-config-get",
  "evolith-dora-metrics",
  "evolith-drift-detect",
  "evolith-echo",
  "evolith-evaluate",
  "evolith-gate-evaluate",
  "evolith-gate-status",
  "evolith-list-dir",
  "evolith-metrics",
  "evolith-moscow-list",
  "evolith-moscow-load",
  "evolith-moscow-report",
  "evolith-moscow-validate",
  "evolith-pattern-get",
  "evolith-pattern-list",
  "evolith-pattern-list-by-topology",
  "evolith-phase-advance",
  "evolith-phase-artifacts-evaluate",
  "evolith-ping",
  "evolith-read-file",
  "evolith-read-gap-tracking",
  "evolith-satellite-list",
  "evolith-satellite-status",
  "evolith-sdlc-status",
  "evolith-topology-get",
  "evolith-topology-list",
  "evolith-topology-recommend",
  "evolith-upgrade-plan",
  "evolith-validate",
  "read-tool"
}

write_tools := {
  # GENERATED from AbacEvaluator.toolProjection() — do not edit by hand.
  # Regenerate: node .harness/scripts/generate-abac-tool-sets.mjs
  "evolith-adr-create",
  "evolith-adr-update",
  "evolith-agent-install",
  "evolith-agent-remove",
  "evolith-agent-run",
  "evolith-agent-upgrade",
  "evolith-auto-fix",
  "evolith-config-set",
  "evolith-docs-scaffold",
  "evolith-fixtures",
  "evolith-init-batch",
  "evolith-moscow-create",
  "evolith-moscow-remove",
  "evolith-moscow-update",
  "evolith-replace-file",
  "evolith-run-command",
  "evolith-satellite-adopt",
  "evolith-satellite-create",
  "evolith-scaffold",
  "evolith-sdlc-generate",
  "evolith-sdlc-handoff",
  "evolith-upgrade-apply",
  "evolith-write-file",
  "write-tool"
}

deploy_tools := {
  # GENERATED from AbacEvaluator.toolProjection() — do not edit by hand.
  # Regenerate: node .harness/scripts/generate-abac-tool-sets.mjs
  # NOTE: classifyTool ALSO treats any name containing 'deploy', 'publish'
  # or `merge` as deploy. That heuristic is not enumerable and is NOT
  # mirrored here. Dispatch requires native AND opa, so a name only the
  # heuristic knows is denied by this policy — never granted by one side.
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
