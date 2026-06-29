package evolith.dod_test

import data.evolith.dod

test_compliant_story_has_no_violations {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 2,
            "coveragePercent": 90,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    count(violations) == 0
}

test_missing_code_review_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 0,
            "coveragePercent": 90,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-01"
}

test_low_coverage_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 60,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-02"
}

test_acceptance_criteria_not_verified_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": false,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-03"
}

test_documentation_not_updated_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": false,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-04"
}

test_observability_not_added_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": false,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-05"
}

# --- GT-380 / L1c: canonical input.context.dod path -------------------------

test_canonical_context_compliant_has_no_violations {
    violations := dod.violations with input as {
        "context": {"dod": {
            "reviewCount": 2, "coveragePercent": 90, "acceptanceCriteriaVerified": true,
            "documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
            "architecturalDecisionMade": false, "adrCreated": false,
            "integrationTestsPassing": true, "lintPassing": true, "ciGreen": true
        }}
    }
    count(violations) == 0
}

test_canonical_context_low_coverage_is_violation {
    violations := dod.violations with input as {
        "context": {"dod": {
            "reviewCount": 2, "coveragePercent": 60, "acceptanceCriteriaVerified": true,
            "documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
            "architecturalDecisionMade": false, "adrCreated": false,
            "integrationTestsPassing": true, "lintPassing": true, "ciGreen": true
        }}
    }
    violations[_].id == "DOD-02"
}

# input.context.dod takes precedence over the legacy input.story.
test_context_takes_precedence_over_legacy_story {
    violations := dod.violations with input as {
        "context": {"dod": {
            "reviewCount": 2, "coveragePercent": 90, "acceptanceCriteriaVerified": true,
            "documentationUpdated": true, "observabilityAdded": true, "securityGatesPassed": true,
            "architecturalDecisionMade": false, "adrCreated": false,
            "integrationTestsPassing": true, "lintPassing": true, "ciGreen": true
        }},
        "story": {"reviewCount": 0, "coveragePercent": 10}
    }
    count(violations) == 0
}

test_security_gates_not_passed_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": false,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-06"
}

test_architectural_decision_without_adr_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": true,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-07"
}

test_architectural_decision_with_adr_is_not_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": true,
            "adrCreated": true,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    count(violations) == 0
}

test_integration_tests_not_passing_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": false,
            "lintPassing": true,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-08"
}

test_lint_not_passing_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": false,
            "ciGreen": true
        }
    }
    violations[_].id == "DOD-09"
}

test_ci_not_green_is_violation {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 1,
            "coveragePercent": 85,
            "acceptanceCriteriaVerified": true,
            "documentationUpdated": true,
            "observabilityAdded": true,
            "securityGatesPassed": true,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": true,
            "lintPassing": true,
            "ciGreen": false
        }
    }
    violations[_].id == "DOD-10"
}

test_multiple_violations_detected {
    violations := dod.violations with input as {
        "story": {
            "reviewCount": 0,
            "coveragePercent": 50,
            "acceptanceCriteriaVerified": false,
            "documentationUpdated": false,
            "observabilityAdded": false,
            "securityGatesPassed": false,
            "architecturalDecisionMade": false,
            "adrCreated": false,
            "integrationTestsPassing": false,
            "lintPassing": false,
            "ciGreen": false
        }
    }
    count(violations) == 9
}
