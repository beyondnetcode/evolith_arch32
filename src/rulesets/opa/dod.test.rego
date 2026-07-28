package evolith.dod_test

import rego.v1

import data.evolith.dod

# GT-380 / L1c: DoD facts are read ONLY from the canonical input.context.dod
# (the legacy input.story root was removed; no Core rule depends on stories).

test_compliant_dod_has_no_violations if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 2, "coveragePercent": 90, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	count(violations) == 0
}

test_missing_code_review_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 0, "coveragePercent": 90, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-01"
}

test_low_coverage_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 60, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-02"
}

test_acceptance_criteria_not_verified_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": false,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-03"
}

test_documentation_not_updated_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": false, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-04"
}

test_observability_not_added_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": false, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-05"
}

test_security_gates_not_passed_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": false,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-06"
}

test_architectural_decision_without_adr_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": true, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-07"
}

test_architectural_decision_with_adr_is_not_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": true, "adrCreated": true,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": true,
	}}}
	count(violations) == 0
}

test_integration_tests_not_passing_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": false, "lintPassing": true, "ciGreen": true,
	}}}
	violations[_].id == "DOD-08"
}

test_lint_not_passing_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": false, "ciGreen": true,
	}}}
	violations[_].id == "DOD-09"
}

test_ci_not_green_is_violation if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 1, "coveragePercent": 85, "acceptanceCriteriaVerified": true,
		"documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": true, "lintPassing": true, "ciGreen": false,
	}}}
	violations[_].id == "DOD-10"
}

test_multiple_violations_detected if {
	violations := dod.violations with input as {"context": {"dod": {
		"reviewCount": 0, "coveragePercent": 50, "acceptanceCriteriaVerified": false,
		"documentationUpdated": false, "observabilityAdded": false, "securityGatesPassed": false,
		"architecturalDecisionMade": false, "adrCreated": false,
		"integrationTestsPassing": false, "lintPassing": false, "ciGreen": false,
	}}}
	count(violations) == 9
}

# GT-382: no DoD facts declared → no opinion (FS-path / no-context safety).
test_absent_dod_context_yields_no_violations if {
	violations := dod.violations with input as {}
	count(violations) == 0
}

test_context_without_dod_yields_no_violations if {
	violations := dod.violations with input as {"context": {"tenant": {"tenantId": "t1"}}}
	count(violations) == 0
}
