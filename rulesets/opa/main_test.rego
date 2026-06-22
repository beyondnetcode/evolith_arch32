package evolith.main_test

import data.evolith.main

test_empty_violations {
	violations := main.violations with data.evolith.version_pinning.violations as {}
		with data.evolith.taxonomy.violations as {}
		with data.evolith.cli_readiness.violations as {}
		with data.evolith.evidence.violations as {}
		with data.evolith.mcp.violations as {}
		with data.evolith.ci_cd.violations as {}
		with data.evolith.governance.violations as {}

	count(violations) == 0
}

test_single_source_violations {
	violations := main.violations with data.evolith.version_pinning.violations as {{"id": "DEP-01", "message": "fail"}}
		with data.evolith.taxonomy.violations as {}
		with data.evolith.cli_readiness.violations as {}
		with data.evolith.evidence.violations as {}
		with data.evolith.mcp.violations as {}
		with data.evolith.ci_cd.violations as {}
		with data.evolith.governance.violations as {}

	count(violations) == 1
	violations[_].id == "DEP-01"
}

test_multi_source_violations {
	violations := main.violations with data.evolith.version_pinning.violations as {{"id": "DEP-01", "message": "fail1"}}
		with data.evolith.taxonomy.violations as {}
		with data.evolith.cli_readiness.violations as {}
		with data.evolith.evidence.violations as {}
		with data.evolith.mcp.violations as {}
		with data.evolith.ci_cd.violations as {{"id": "DEP-04", "message": "fail2"}}
		with data.evolith.governance.violations as {}

	count(violations) == 2
	violations[_].id == "DEP-01"
	violations[_].id == "DEP-04"
}
