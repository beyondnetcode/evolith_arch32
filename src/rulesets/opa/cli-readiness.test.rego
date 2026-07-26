package evolith.cli_readiness_test

import rego.v1

import data.evolith.cli_readiness

test_cli_ready_has_no_violations if {
	violations := cli_readiness.violations with input as {"core": {"cli": {"hasMainJs": true, "hasTests": true, "hasPackageLock": true, "hasReadme": true, "hasArchitectureMd": true}, "hasPackageLock": true, "evidence": {"mcp-smoke.json": {"status": "passed"}}}}
	count(violations) == 0
}

test_missing_main_js_is_rejected if {
	violations := cli_readiness.violations with input as {"core": {"cli": {"hasMainJs": false, "hasTests": false, "hasPackageLock": false, "hasReadme": false, "hasArchitectureMd": false}, "hasPackageLock": false, "evidence": {}}}
	violations[_].id == "CLI-RR-01"
}

test_missing_mcp_evidence_is_rejected if {
	violations := cli_readiness.violations with input as {"core": {"cli": {"hasMainJs": true, "hasTests": true, "hasPackageLock": true, "hasReadme": true, "hasArchitectureMd": true}, "hasPackageLock": true, "evidence": {}}}
	violations[_].id == "CLI-RR-04"
}

test_missing_readme_is_rejected if {
	violations := cli_readiness.violations with input as {"core": {"cli": {"hasMainJs": true, "hasTests": true, "hasPackageLock": true, "hasReadme": false, "hasArchitectureMd": false}, "hasPackageLock": true, "evidence": {"mcp-smoke.json": {"status": "passed"}}}}
	violations[_].id == "CLI-RR-05"
}
