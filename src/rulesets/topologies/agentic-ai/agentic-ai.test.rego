package evolith.topologies.agentic_ai_test

import rego.v1

import data.evolith.topologies.agentic_ai

compliant_input := {"satellite": {"agenticAi": {
	"hasIdentity": true,
	"hasIsolatedSandbox": true,
	"hasSeparatedPromptAndImplementation": true,
	"requiresApprovalForMutativeTools": true,
	"hasEphemeralSandboxLimits": true,
	"hasTrustedContextPolicy": true,
	"hasAccountableActions": true,
	"hasOperationalBudgets": true,
	"hasCredentialLifecycle": true,
}}}

test_compliant_agent_has_no_violations if {
	violations := agentic_ai.violations with input as compliant_input
	count(violations) == 0
}

test_missing_identity_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasIdentity", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R01"
}

test_missing_operational_budgets_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasOperationalBudgets", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R08"
}

test_missing_credential_lifecycle_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasCredentialLifecycle", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R09"
}

test_missing_isolated_sandbox_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasIsolatedSandbox", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R02"
}

test_missing_prompt_separation_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasSeparatedPromptAndImplementation", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R03"
}

test_missing_mutative_approval_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/requiresApprovalForMutativeTools", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R04"
}

test_missing_ephemeral_limits_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasEphemeralSandboxLimits", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R05"
}

test_missing_trusted_context_policy_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/agenticAi/hasTrustedContextPolicy", "value": false}])
	violations := agentic_ai.violations with input as i
	violations[_].id == "AAI-R06"
}
