package evolith.topologies.distributed_modules_test

import rego.v1

import data.evolith.topologies.distributed_modules

test_compliant_distributed_modules_has_no_violations if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	count(violations) == 0
}

test_single_module_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R01"
}

test_missing_independent_deployment_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": false, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R06"
}

test_missing_circuit_breaker_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": false, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R07"
}

test_missing_contracts_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": false, "hasAcl": true, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R02"
}

test_missing_acl_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": false, "hasEvents": true, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R03"
}

test_missing_events_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": false, "hasOtel": true, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R04"
}

test_missing_otel_is_rejected if {
	violations := distributed_modules.violations with input as {"satellite": {"workspacePackageJsons": ["a", "b"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasOtel": false, "hasIndependentDeployment": true, "hasCircuitBreaker": true, "hasExtractionReadiness": true}}
	violations[_].id == "DM-R05"
}
