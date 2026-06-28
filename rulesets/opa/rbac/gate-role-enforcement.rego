package evolith.rbac.gate

import future.keywords.if
import future.keywords.contains
import future.keywords.in

# ---------------------------------------------------------------------------
# GT-320 — Gate role enforcement
#
# Input schema:
#   input.actor.roles         array of role strings (e.g. ["product_owner"])
#   input.gate.accountableRole  string | null  — required role to approve
#   input.gate.waiverAuthority  string | null  — required role to waive
#   input.action              "approve" | "waive"
#
# Role hierarchy (mirrors ROLE_HIERARCHY in role.ts)
# ---------------------------------------------------------------------------

# admin and cto supersede every gate role
superseding_roles := {"admin", "cto"}

# Hierarchy expressed as: implied_by[required_role] = set of roles that satisfy it
implied_by := {
  "product_owner":    {"admin", "cto"},
  "architect":        {"admin", "cto"},
  "tech_lead":        {"admin", "cto", "architect"},
  "qa_lead":          {"admin", "cto"},
  "devops_lead":      {"admin", "cto"},
  "developer":        {"admin", "cto", "architect", "tech_lead"},
  "qa_engineer":      {"admin", "cto", "qa_lead"},
  "devops_engineer":  {"admin", "cto", "devops_lead"},
  "security_engineer": {"admin", "cto"},
}

# Map human-readable gate labels to canonical role values (mirrors GATE_ROLE_MAP)
gate_role_map := {
  "Product Owner":      "product_owner",
  "Software Architect": "architect",
  "Tech Lead":          "tech_lead",
  "QA Lead":            "qa_lead",
  "DevOps Lead":        "devops_lead",
}

# Resolve a gate label (or already-canonical string) to a canonical role string
canonical_role(label) := role if {
  role := gate_role_map[label]
} else := label

# Returns true when actor_role satisfies required_role (direct or via hierarchy)
role_satisfies(actor_role, required) if { actor_role == required }
role_satisfies(actor_role, required) if { actor_role in implied_by[required] }

# ---------------------------------------------------------------------------
# default deny
# ---------------------------------------------------------------------------

default allow := false

# ---------------------------------------------------------------------------
# approve
# ---------------------------------------------------------------------------

# Open gate — no accountableRole set
allow if {
  input.action == "approve"
  not input.gate.accountableRole
}

allow if {
  input.action == "approve"
  input.gate.accountableRole != null
  required := canonical_role(input.gate.accountableRole)
  some actor_role in input.actor.roles
  role_satisfies(actor_role, required)
}

# ---------------------------------------------------------------------------
# waive
# ---------------------------------------------------------------------------

# Open gate — no waiverAuthority set
allow if {
  input.action == "waive"
  not input.gate.waiverAuthority
}

allow if {
  input.action == "waive"
  input.gate.waiverAuthority != null
  required := canonical_role(input.gate.waiverAuthority)
  some actor_role in input.actor.roles
  role_satisfies(actor_role, required)
}

# ---------------------------------------------------------------------------
# Violation detail (used by tests / audit logs)
# ---------------------------------------------------------------------------

deny_reason := reason if {
  not allow
  input.action == "approve"
  reason := sprintf(
    "actor roles [%s] do not satisfy accountableRole '%s' for action 'approve'",
    [concat(", ", input.actor.roles), input.gate.accountableRole],
  )
} else := reason if {
  not allow
  input.action == "waive"
  reason := sprintf(
    "actor roles [%s] do not satisfy waiverAuthority '%s' for action 'waive'",
    [concat(", ", input.actor.roles), input.gate.waiverAuthority],
  )
}
