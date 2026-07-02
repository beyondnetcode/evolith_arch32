package evolith.main

import data.evolith.version_pinning.violations as vp_violations
import data.evolith.taxonomy.violations as taxonomy_violations
import data.evolith.cli_readiness.violations as cli_violations
import data.evolith.evidence.violations as evidence_violations
import data.evolith.mcp.violations as mcp_violations
import data.evolith.ci_cd.violations as ci_cd_violations
import data.evolith.governance.violations as gov_violations
import data.evolith.abac.violations as abac_violations
import data.evolith.capability_source_interface.violations as csi_violations
import data.evolith.acl.violations as acl_violations
import data.evolith.cicd_quality_gates.violations as cicd_qg_violations
import data.evolith.cli_core_parity.violations as cli_cp_violations
import data.evolith.cli_release_readiness.violations as cli_rr_violations
import data.evolith.compliance_baseline.violations as cb_violations
import data.evolith.dod.violations as dod_violations
import data.evolith.engineering_manifesto.violations as em_violations
import data.evolith.executive_scorecards.violations as exec_violations
import data.evolith.gitflow_branching.violations as git_violations
import data.evolith.hexagonal_architecture.violations as hxa_violations
import data.evolith.knowledge_intake.violations as ki_violations
import data.evolith.multi_runtime.violations as runt_violations
import data.evolith.multi_tenancy.violations as mtn_violations
import data.evolith.open_core_boundary.violations as ocb_violations
import data.evolith.protocol_selection.violations as prot_violations
import data.evolith.repository_taxonomy.violations as repo_tax_violations
import data.evolith.satellite_contracts.violations as svc_violations
import data.evolith.testing_pyramid.violations as tpy_violations
import data.evolith.telemetry_evidence.violations as telemetry_violations
import data.evolith.infrastructure.helm.violations as helm_violations
import data.evolith.infrastructure.opa_sidecar.violations as opa_sidecar_violations
import data.evolith.phase_gates.violations as pg_violations

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

violations[v] {
	v := abac_violations[_]
}

violations[v] {
	v := csi_violations[_]
}

violations[v] {
	v := acl_violations[_]
}

violations[v] {
	v := cicd_qg_violations[_]
}

violations[v] {
	v := cli_cp_violations[_]
}

violations[v] {
	v := cli_rr_violations[_]
}

violations[v] {
	v := cb_violations[_]
}

violations[v] {
	v := dod_violations[_]
}

violations[v] {
	v := em_violations[_]
}

violations[v] {
	v := exec_violations[_]
}

violations[v] {
	v := git_violations[_]
}

violations[v] {
	v := hxa_violations[_]
}

violations[v] {
	v := ki_violations[_]
}

violations[v] {
	v := runt_violations[_]
}

violations[v] {
	v := mtn_violations[_]
}

violations[v] {
	v := ocb_violations[_]
}

violations[v] {
	v := prot_violations[_]
}

violations[v] {
	v := repo_tax_violations[_]
}

violations[v] {
	v := svc_violations[_]
}

violations[v] {
	v := tpy_violations[_]
}

violations[v] {
	v := telemetry_violations[_]
}

violations[v] {
	v := helm_violations[_]
}

violations[v] {
	v := opa_sidecar_violations[_]
}

violations[v] {
	v := pg_violations[_]
}
