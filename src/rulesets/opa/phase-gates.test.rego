package evolith.phase_gates_test

import rego.v1

import data.evolith.phase_gates

# A gate with all mandatory evidence present and no blocking criteria → no violations.
test_complete_gate_has_no_violations if {
	violations := phase_gates.violations with input as {
		"gate": {"phase": 2, "mandatoryEvidence": [{"artifact": "prd.md"}], "blockingCriteria": []},
		"evidence": [{"artifact": "prd.md", "status": "approved"}],
	}
	count(violations) == 0
}

# A missing mandatory artifact → PG-EVIDENCE-MISSING.
test_missing_mandatory_artifact_is_flagged if {
	violations := phase_gates.violations with input as {
		"gate": {"phase": 2, "mandatoryEvidence": [{"artifact": "prd.md"}], "blockingCriteria": []},
		"evidence": [],
	}
	violations[_].id == "PG-EVIDENCE-MISSING"
}

# An active, un-waived blocking criterion → PG-CRITERION-BLOCKING.
test_active_blocking_criterion_is_flagged if {
	violations := phase_gates.violations with input as {
		"gate": {"phase": 2, "mandatoryEvidence": [], "blockingCriteria": [{"criterion": "security-review"}]},
		"evidence": [],
		"waiver": [],
	}
	violations[_].id == "PG-CRITERION-BLOCKING"
}

# A blocking criterion covered by an active, non-expired waiver → no blocking violation.
test_waived_criterion_is_not_blocking if {
	violations := phase_gates.violations with input as {
		"gate": {"phase": 2, "mandatoryEvidence": [], "blockingCriteria": [{"criterion": "security-review"}]},
		"evidence": [],
		"waiver": [{"criterion": "security-review", "status": "active", "expirationDate": "2099-01-01"}],
		"evaluationDate": "2026-06-28",
	}
	count({v | violations[v]; v.id == "PG-CRITERION-BLOCKING"}) == 0
}

# No gate context → no violations (additive aggregation is safe in evolith.main).
test_absent_gate_yields_no_violations if {
	violations := phase_gates.violations with input as {}
	count(violations) == 0
}
