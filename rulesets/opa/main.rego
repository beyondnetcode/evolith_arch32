package evolith.main

import data.evolith.version_pinning.violations as vp_violations
import data.evolith.taxonomy.violations as taxonomy_violations
import data.evolith.cli_readiness.violations as cli_violations
import data.evolith.evidence.violations as evidence_violations
import data.evolith.mcp.violations as mcp_violations
import data.evolith.ci_cd.violations as ci_cd_violations
import data.evolith.governance.violations as gov_violations
violations[v] {
	v := vp_violations[_]
}

violations[v] {
	v := taxonomy_violations[_]
}

violations[v] {
	v := cli_violations[_]
}

violations[v] {
	v := evidence_violations[_]
}

violations[v] {
	v := mcp_violations[_]
}

violations[v] {
	v := ci_cd_violations[_]
}

violations[v] {
	v := gov_violations[_]
}
