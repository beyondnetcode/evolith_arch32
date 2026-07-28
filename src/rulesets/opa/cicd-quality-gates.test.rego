package evolith.cicd_quality_gates_test

import rego.v1

import data.evolith.cicd_quality_gates

compliant_input := {"satellite": {
	"ci": {
		"hasCodeql": true,
		"hasDependencyAudit": true,
		"hasSecretDetection": true,
		"gatesRequiredBeforeMerge": true,
	},
	"findings": {"criticalAgeHours": 12, "highAgeHours": 48},
}}

test_compliant_ci_cd_gates_has_no_violations if {
	violations := cicd_quality_gates.violations with input as compliant_input
	count(violations) == 0
}

test_missing_codeql_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/ci/hasCodeql", "value": false}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-01"
}

test_missing_dependency_audit_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/ci/hasDependencyAudit", "value": false}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-02"
}

test_missing_secret_detection_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/ci/hasSecretDetection", "value": false}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-03"
}

test_gates_not_required_before_merge_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/ci/gatesRequiredBeforeMerge", "value": false}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-04"
}

test_critical_sla_breach_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/findings/criticalAgeHours", "value": 48}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-06"
}

test_high_sla_breach_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/findings/highAgeHours", "value": 100}])
	violations := cicd_quality_gates.violations with input as i
	violations[_].id == "CICD-07"
}
