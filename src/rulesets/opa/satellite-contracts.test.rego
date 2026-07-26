package evolith.satellite_contracts_test

import rego.v1

import data.evolith.satellite_contracts

compliant_f1_input := {"satellite": {"contracts": {
	"hasEvolyamlAtProjectRoot": true,
	"phase": "F1",
	"hasAdr0047": true,
	"hasExtractionReadinessScore": false,
	"coreVersionExists": true,
	"phaseTransitionWithoutApproval": false,
	"isDeprecated": false,
	"deprecatedStatusMarked": false,
	"nameIsUnique": true,
	"isWorkspace": false,
	"workspaceIntegrityOk": true,
}}}

test_compliant_f1_satellite_has_no_violations if {
	violations := satellite_contracts.violations with input as compliant_f1_input
	count(violations) == 0
}

test_missing_evolyaml_is_rejected if {
	i := json.patch(compliant_f1_input, [{"op": "replace", "path": "/satellite/contracts/hasEvolyamlAtProjectRoot", "value": false}])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-01"
}

test_workspace_integrity_violation_is_rejected if {
	i := json.patch(compliant_f1_input, [
		{"op": "replace", "path": "/satellite/contracts/isWorkspace", "value": true},
		{"op": "replace", "path": "/satellite/contracts/workspaceIntegrityOk", "value": false},
	])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-06"
}

test_single_project_satellite_is_exempt_from_workspace_integrity if {
	# isWorkspace=false → SVC-06 must not fire even if workspaceIntegrityOk is absent/false
	i := json.patch(compliant_f1_input, [{"op": "replace", "path": "/satellite/contracts/workspaceIntegrityOk", "value": false}])
	violations := satellite_contracts.violations with input as i
	count([v | v := violations[_]; v.id == "SVC-06"]) == 0
}

test_f1_missing_adr0047_is_rejected if {
	i := json.patch(compliant_f1_input, [{"op": "replace", "path": "/satellite/contracts/hasAdr0047", "value": false}])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-03"
}

test_f2_missing_extraction_readiness_is_rejected if {
	i := json.patch(compliant_f1_input, [
		{"op": "replace", "path": "/satellite/contracts/phase", "value": "F2"},
		{"op": "replace", "path": "/satellite/contracts/hasExtractionReadinessScore", "value": false},
	])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-04"
}

test_f3_missing_extraction_readiness_is_rejected if {
	i := json.patch(compliant_f1_input, [
		{"op": "replace", "path": "/satellite/contracts/phase", "value": "F3"},
		{"op": "replace", "path": "/satellite/contracts/hasExtractionReadinessScore", "value": false},
	])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-04"
}

test_core_version_not_found_is_rejected if {
	i := json.patch(compliant_f1_input, [{"op": "replace", "path": "/satellite/contracts/coreVersionExists", "value": false}])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "SVC-05"
}

test_phase_transition_without_approval_is_rejected if {
	i := json.patch(compliant_f1_input, [{"op": "replace", "path": "/satellite/contracts/phaseTransitionWithoutApproval", "value": true}])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "MIG-02"
}

test_deprecated_without_status_marked_is_rejected if {
	i := json.patch(compliant_f1_input, [
		{"op": "replace", "path": "/satellite/contracts/isDeprecated", "value": true},
		{"op": "replace", "path": "/satellite/contracts/deprecatedStatusMarked", "value": false},
	])
	violations := satellite_contracts.violations with input as i
	violations[_].id == "MIG-03"
}
