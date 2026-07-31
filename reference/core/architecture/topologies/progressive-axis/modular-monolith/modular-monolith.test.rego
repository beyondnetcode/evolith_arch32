package evolith.topologies.modular_monolith_test

import rego.v1

import data.evolith.topologies.modular_monolith

test_compliant_modular_monolith_has_no_violations if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	count(violations) == 0
}

test_missing_ports_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R03"
}

test_monorepo_workspace_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {"workspaces": ["packages/*"]}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R01"
}

test_less_than_two_modules_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R02"
}

test_missing_contracts_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": false, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R04"
}

test_missing_acl_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": false, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R05"
}

test_missing_events_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": false, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R06"
}

test_missing_extraction_readiness_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": false, "hasOtel": true, "sourceFiles": []}}
	violations[_].id == "MM-R07"
}

test_missing_otel_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": false, "sourceFiles": []}}
	violations[_].id == "MM-R08"
}

test_manual_instantiation_in_domain_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": [{"path": "src/domain/user.service.ts", "hasManualInstantiation": true}]}}
	violations[_].id == "MM-R09"
}

test_ui_import_in_application_layer_is_rejected if {
	violations := modular_monolith.violations with input as {"satellite": {"packageJson": {}, "directories": ["identity", "access", "ports"], "hasContracts": true, "hasAcl": true, "hasEvents": true, "hasExtractionReadiness": true, "hasOtel": true, "sourceFiles": [{"path": "src/application/use-cases/create-user.ts", "hasManualInstantiation": false, "hasUiImport": true}]}}
	violations[_].id == "MM-R11"
}
