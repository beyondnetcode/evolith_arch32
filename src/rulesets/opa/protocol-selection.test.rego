package evolith.protocol_selection_test

import rego.v1

import data.evolith.protocol_selection

compliant_input := {"satellite": {"protocol": {
	"internalServiceCallsNotGrpc": false,
	"publicApiNotRest": false,
	"graphqlInDomainLayer": false,
	"protoCentralized": true,
	"breakingChangesWithoutVersionBump": false,
}}}

test_compliant_protocol_selection_has_no_violations if {
	violations := protocol_selection.violations with input as compliant_input
	count(violations) == 0
}

test_internal_not_grpc_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/protocol/internalServiceCallsNotGrpc", "value": true}])
	violations := protocol_selection.violations with input as i
	violations[_].id == "PROT-01"
}

test_public_api_not_rest_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/protocol/publicApiNotRest", "value": true}])
	violations := protocol_selection.violations with input as i
	violations[_].id == "PROT-02"
}

test_graphql_in_domain_layer_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/protocol/graphqlInDomainLayer", "value": true}])
	violations := protocol_selection.violations with input as i
	violations[_].id == "PROT-04"
}

test_proto_not_centralized_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/protocol/protoCentralized", "value": false}])
	violations := protocol_selection.violations with input as i
	violations[_].id == "PROT-05"
}

test_breaking_changes_without_version_bump_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/protocol/breakingChangesWithoutVersionBump", "value": true}])
	violations := protocol_selection.violations with input as i
	violations[_].id == "PROT-07"
}
