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
		with data.evolith.abac.violations as {}
		with data.evolith.acl.violations as {}
		with data.evolith.cicd_quality_gates.violations as {}
		with data.evolith.cli_core_parity.violations as {}
		with data.evolith.cli_release_readiness.violations as {}
		with data.evolith.compliance_baseline.violations as {}
		with data.evolith.dod.violations as {}
		with data.evolith.engineering_manifesto.violations as {}
		with data.evolith.executive_scorecards.violations as {}
		with data.evolith.gitflow_branching.violations as {}
		with data.evolith.hexagonal_architecture.violations as {}
		with data.evolith.knowledge_intake.violations as {}
		with data.evolith.multi_runtime.violations as {}
		with data.evolith.multi_tenancy.violations as {}
		with data.evolith.open_core_boundary.violations as {}
		with data.evolith.protocol_selection.violations as {}
		with data.evolith.repository_taxonomy.violations as {}
		with data.evolith.satellite_contracts.violations as {}
		with data.evolith.testing_pyramid.violations as {}

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
		with data.evolith.abac.violations as {}
		with data.evolith.acl.violations as {}
		with data.evolith.cicd_quality_gates.violations as {}
		with data.evolith.cli_core_parity.violations as {}
		with data.evolith.cli_release_readiness.violations as {}
		with data.evolith.compliance_baseline.violations as {}
		with data.evolith.dod.violations as {}
		with data.evolith.engineering_manifesto.violations as {}
		with data.evolith.executive_scorecards.violations as {}
		with data.evolith.gitflow_branching.violations as {}
		with data.evolith.hexagonal_architecture.violations as {}
		with data.evolith.knowledge_intake.violations as {}
		with data.evolith.multi_runtime.violations as {}
		with data.evolith.multi_tenancy.violations as {}
		with data.evolith.open_core_boundary.violations as {}
		with data.evolith.protocol_selection.violations as {}
		with data.evolith.repository_taxonomy.violations as {}
		with data.evolith.satellite_contracts.violations as {}
		with data.evolith.testing_pyramid.violations as {}

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
		with data.evolith.abac.violations as {}
		with data.evolith.acl.violations as {}
		with data.evolith.cicd_quality_gates.violations as {}
		with data.evolith.cli_core_parity.violations as {}
		with data.evolith.cli_release_readiness.violations as {}
		with data.evolith.compliance_baseline.violations as {}
		with data.evolith.dod.violations as {}
		with data.evolith.engineering_manifesto.violations as {}
		with data.evolith.executive_scorecards.violations as {}
		with data.evolith.gitflow_branching.violations as {}
		with data.evolith.hexagonal_architecture.violations as {}
		with data.evolith.knowledge_intake.violations as {}
		with data.evolith.multi_runtime.violations as {}
		with data.evolith.multi_tenancy.violations as {}
		with data.evolith.open_core_boundary.violations as {}
		with data.evolith.protocol_selection.violations as {}
		with data.evolith.repository_taxonomy.violations as {}
		with data.evolith.satellite_contracts.violations as {}
		with data.evolith.testing_pyramid.violations as {}

	count(violations) == 2
	violations[_].id == "DEP-01"
	violations[_].id == "DEP-04"
}

test_new_policy_violations {
	violations := main.violations with data.evolith.version_pinning.violations as {}
		with data.evolith.taxonomy.violations as {}
		with data.evolith.cli_readiness.violations as {}
		with data.evolith.evidence.violations as {}
		with data.evolith.mcp.violations as {}
		with data.evolith.ci_cd.violations as {}
		with data.evolith.governance.violations as {}
		with data.evolith.abac.violations as {{"id": "ABAC-01", "message": "abac fail"}}
		with data.evolith.acl.violations as {{"id": "ACL-01", "message": "acl fail"}}
		with data.evolith.cicd_quality_gates.violations as {{"id": "CICD-01", "message": "cicd fail"}}
		with data.evolith.cli_core_parity.violations as {{"id": "CLI-PAR-01", "message": "parity fail"}}
		with data.evolith.cli_release_readiness.violations as {{"id": "CLI-RR-01", "message": "release fail"}}
		with data.evolith.compliance_baseline.violations as {{"id": "CB-VAL-01", "message": "compliance fail"}}
		with data.evolith.dod.violations as {{"id": "DOD-01", "message": "dod fail"}}
		with data.evolith.engineering_manifesto.violations as {{"id": "EM-S-01", "message": "manifesto fail"}}
		with data.evolith.executive_scorecards.violations as {{"id": "DORA-01", "message": "dora fail"}}
		with data.evolith.gitflow_branching.violations as {{"id": "GIT-01", "message": "gitflow fail"}}
		with data.evolith.hexagonal_architecture.violations as {{"id": "HXA-01", "message": "hexagonal fail"}}
		with data.evolith.knowledge_intake.violations as {{"id": "KI-R01", "message": "ki fail"}}
		with data.evolith.multi_runtime.violations as {{"id": "RUNT-01", "message": "runtime fail"}}
		with data.evolith.multi_tenancy.violations as {{"id": "MTN-01", "message": "tenancy fail"}}
		with data.evolith.open_core_boundary.violations as {{"id": "OCB-01", "message": "ocb fail"}}
		with data.evolith.protocol_selection.violations as {{"id": "PROT-01", "message": "protocol fail"}}
		with data.evolith.repository_taxonomy.violations as {{"id": "TAX-05", "message": "taxonomy fail"}}
		with data.evolith.satellite_contracts.violations as {{"id": "SVC-01", "message": "satellite fail"}}
		with data.evolith.testing_pyramid.violations as {{"id": "TPY-01", "message": "testing fail"}}

	count(violations) == 19
	violations[_].id == "ABAC-01"
	violations[_].id == "ACL-01"
	violations[_].id == "CICD-01"
	violations[_].id == "CLI-PAR-01"
	violations[_].id == "CLI-RR-01"
	violations[_].id == "CB-VAL-01"
	violations[_].id == "DOD-01"
	violations[_].id == "EM-S-01"
	violations[_].id == "DORA-01"
	violations[_].id == "GIT-01"
	violations[_].id == "HXA-01"
	violations[_].id == "KI-R01"
	violations[_].id == "RUNT-01"
	violations[_].id == "MTN-01"
	violations[_].id == "OCB-01"
	violations[_].id == "PROT-01"
	violations[_].id == "TAX-05"
	violations[_].id == "SVC-01"
	violations[_].id == "TPY-01"
}
