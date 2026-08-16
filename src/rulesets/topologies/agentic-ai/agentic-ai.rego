package evolith.topologies.agentic_ai

import rego.v1

violations contains {"id": "AAI-R01", "severity": "MUST", "title": "Declared Agent Identity and Capabilities", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasIdentity
	message := "agent.config.json must declare agent.id and a non-empty capabilities array (AAI-R01)."
}

violations contains {"id": "AAI-R02", "severity": "MUST", "title": "Explicit Sandbox Boundary", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasIsolatedSandbox
	message := "agent.config.json must declare an isolated sandbox with deny or allowlist network and process access (AAI-R02)."
}

violations contains {"id": "AAI-R03", "severity": "MUST", "title": "Prompt and Implementation Separation", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasSeparatedPromptAndImplementation
	message := "agent.config.json must declare non-overlapping promptSources and implementationRoots (AAI-R03)."
}

violations contains {"id": "AAI-R04", "severity": "MUST", "title": "Approval for Mutative Tools", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.requiresApprovalForMutativeTools
	message := "agent.config.json must set toolPolicy.mutative to approval-required (AAI-R04)."
}

violations contains {"id": "AAI-R05", "severity": "MUST", "title": "Ephemeral Sandbox Resource Limits", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasEphemeralSandboxLimits
	message := "agent.config.json must require ephemeral execution with positive duration, memory, and CPU limits (AAI-R05)."
}

violations contains {"id": "AAI-R06", "severity": "MUST", "title": "Untrusted Context Is Data", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasTrustedContextPolicy
	message := "agent.config.json must treat untrusted context as data, require provenance, and validate tool output schemas (AAI-R06)."
}

violations contains {"id": "AAI-R07", "severity": "MUST", "title": "Capability-Scoped, Auditable Actions", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasAccountableActions
	message := "agent.config.json must require scoped-and-expiring capabilities and append-only correlated action evidence (AAI-R07)."
}

violations contains {"id": "AAI-R08", "severity": "MUST", "title": "Operational Budgets and Concurrency Limits", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasOperationalBudgets
	message := "agent.config.json must declare operationalBudgets with positive token, context window, and MCP concurrency limits plus a runbooksPath that exists (AAI-R08)."
}

violations contains {"id": "AAI-R09", "severity": "MUST", "title": "Satellite Credential Lifecycle", "blocking": true, "message": message} if {
	not input.satellite.agenticAi.hasCredentialLifecycle
	message := "agent.config.json must declare credentialLifecycle with positive delegation TTL, rotation cadence, and bounded incident revocation (AAI-R09)."
}

# GT-683 AC6 — AAI-R10, the rule that reads the code the descriptor points at.
#
# The other nine compare fields. This one fires when the descriptor CLAIMS a
# restricted boundary and the declared `implementationRoots` contain a raw socket
# or a child process inheriting the ambient environment — the literal inverse of
# what AAI-R02 and AAI-R05 ask for.
#
# OPA cannot read a directory, so `opa-input-builder` performs the scan and hands
# the result across as one boolean, exactly as it does for the other nine. When the
# descriptor makes no restriction claim the builder reports `true` and this stays
# silent: no claim, no contradiction, and AAI-R02 already owns that failure.
#
# ADVISORY (`blocking: false`) and the reason is our own honesty: this repository's
# `agent.config.json` marks AAI-R02 `partial` for process access, so shipping this
# blocking would turn our own CI red on day one and teach everyone to waive it.
violations contains {"id": "AAI-R10", "severity": "SHOULD", "title": "Observed Sandbox Boundary", "blocking": false, "message": message} if {
	input.satellite.agenticAi.hasNoSandboxBoundaryBreach == false
	message := "declared implementationRoots contain an outbound socket or an environment-inheriting child process while agent.config.json claims a restricted sandbox (AAI-R10)."
}
