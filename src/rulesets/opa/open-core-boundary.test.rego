package evolith.open_core_boundary_test

import rego.v1

import data.evolith.open_core_boundary

compliant_input := {"satellite": {"openCore": {
	"coreHasEnterpriseReferences": false,
	"enterpriseArtifactNotMarked": false,
	"aclImplementationInCore": false,
	"cliMcpGated": false,
	"trackerConceptsInCore": false,
	"tieredAccessInCore": false,
	"coreRequiresEnterprise": false,
}}}

test_compliant_open_core_has_no_violations if {
	violations := open_core_boundary.violations with input as compliant_input
	count(violations) == 0
}

test_core_enterprise_references_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/coreHasEnterpriseReferences", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-01"
}

test_enterprise_artifact_not_marked_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/enterpriseArtifactNotMarked", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-02"
}

test_acl_in_core_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/aclImplementationInCore", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-03"
}

test_cli_mcp_gated_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/cliMcpGated", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-04"
}

test_tracker_concepts_in_core_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/trackerConceptsInCore", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-05"
}

test_tiered_access_in_core_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/tieredAccessInCore", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-06"
}

test_core_requires_enterprise_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/openCore/coreRequiresEnterprise", "value": true}])
	violations := open_core_boundary.violations with input as i
	violations[_].id == "OCB-08"
}
