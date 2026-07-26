package evolith.testing_pyramid_test

import rego.v1

import data.evolith.testing_pyramid

compliant_input := {"satellite": {"testing": {
	"unitTestPercentage": 70,
	"integrationTestPercentage": 20,
	"e2eTestPercentage": 10,
	"unitTestsExecuteIo": false,
	"businessLogicCoverage": 85,
	"domainCoverage": 96,
	"applicationCoverage": 88,
	"infrastructureCoverage": 65,
	"apiCoverage": 75,
	"unitTestsHaveIoOperations": false,
	"integrationUsesEphemeralContainers": true,
	"e2eCoversHttpRoutes": true,
}}}

test_compliant_testing_pyramid_has_no_violations if {
	violations := testing_pyramid.violations with input as compliant_input
	count(violations) == 0
}

test_low_unit_test_percentage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/unitTestPercentage", "value": 50}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-01"
}

test_low_integration_test_percentage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/integrationTestPercentage", "value": 10}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-01"
}

test_low_e2e_test_percentage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/e2eTestPercentage", "value": 2}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-01"
}

test_unit_tests_executing_io_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/unitTestsExecuteIo", "value": true}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-02"
}

test_low_business_logic_coverage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/businessLogicCoverage", "value": 70}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-05"
}

test_low_domain_coverage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/domainCoverage", "value": 80}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-06"
}

test_low_application_coverage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/applicationCoverage", "value": 70}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-06"
}

test_low_infrastructure_coverage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/infrastructureCoverage", "value": 40}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-06"
}

test_low_api_coverage_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/apiCoverage", "value": 50}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-06"
}

test_unit_tests_with_io_operations_is_rejected if {
	i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/testing/unitTestsHaveIoOperations", "value": true}])
	violations := testing_pyramid.violations with input as i
	violations[_].id == "TPY-07"
}
