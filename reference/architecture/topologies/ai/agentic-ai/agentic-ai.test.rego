package evolith.topologies.agentic_ai_test

import data.evolith.topologies.agentic_ai

test_compliant_agent_has_no_violations {
  violations := agentic_ai.violations with input as {"satellite": {"agenticAi": {"hasIdentity": true, "hasIsolatedSandbox": true, "hasSeparatedPromptAndImplementation": true, "requiresApprovalForMutativeTools": true, "hasEphemeralSandboxLimits": true, "hasTrustedContextPolicy": true, "hasAccountableActions": true}}}
  count(violations) == 0
}

test_missing_identity_is_rejected {
  violations := agentic_ai.violations with input as {"satellite": {"agenticAi": {"hasIdentity": false, "hasIsolatedSandbox": true, "hasSeparatedPromptAndImplementation": true, "requiresApprovalForMutativeTools": true, "hasEphemeralSandboxLimits": true, "hasTrustedContextPolicy": true, "hasAccountableActions": true}}}
  violations[_].id == "AAI-R01"
}
