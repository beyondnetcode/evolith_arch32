package evolith.repository_taxonomy_test

import rego.v1

import data.evolith.repository_taxonomy

test_core_with_required_dirs_has_no_violations if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["reference", "product", "src"],
		"adrs": ["reference/architecture/adrs/core/0001-monorepo-orchestration.md", "reference/architecture/adrs/core/0001-monorepo-orchestration.es.md"],
	}}
	count(violations) == 0
}

test_core_missing_reference_dir_is_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["sdk", "rulesets"],
		"adrs": [],
	}}
	violations[_].id == "TAX-05"
}

test_satellite_with_required_dirs_has_no_violations if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "satellite",
		"directories": ["src", "tests", "docs"],
		"adrs": [],
	}}
	count(violations) == 0
}

test_satellite_missing_dirs_is_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "satellite",
		"directories": ["src"],
		"adrs": [],
	}}
	violations[_].id == "TAX-06"
}

test_adr_with_valid_name_has_no_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["reference", "product", "src"],
		"adrs": ["reference/architecture/adrs/core/0002-clean-architecture.md", "reference/architecture/adrs/core/0002-clean-architecture.es.md"],
	}}
	count(violations) == 0
}

test_adr_invalid_name_is_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["reference", "product", "src"],
		"adrs": ["reference/architecture/adrs/core/invalid-adr-name.md"],
	}}
	violations[_].id == "TAX-07"
}

test_adr_missing_bilingual_pair_is_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["reference", "product", "src"],
		"adrs": ["reference/architecture/adrs/core/0001-feature.md"],
	}}
	violations[_].id == "TAX-08"
}

test_root_topologies_dir_is_violation if {
	violations := repository_taxonomy.violations with input as {"repository": {
		"type": "core",
		"directories": ["reference", "sdk", "rulesets", "topologies"],
		"adrs": [],
	}}
	violations[_].id == "TAX-11"
}
