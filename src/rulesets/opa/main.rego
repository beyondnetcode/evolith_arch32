package evolith.main

import rego.v1

import data.evolith.abac.violations as abac_violations
import data.evolith.acl.violations as acl_violations
import data.evolith.capability_source_interface.violations as csi_violations
import data.evolith.ci_cd.violations as ci_cd_violations
import data.evolith.cicd_quality_gates.violations as cicd_qg_violations
import data.evolith.cli_core_parity.violations as cli_cp_violations
import data.evolith.cli_exit_code_taxonomy.violations as cli_exit_violations
import data.evolith.cli_readiness.violations as cli_violations
import data.evolith.cli_release_readiness.violations as cli_rr_violations
import data.evolith.compliance_baseline.violations as cb_violations
import data.evolith.dod.violations as dod_violations
import data.evolith.engineering_manifesto.violations as em_violations
import data.evolith.evidence.violations as evidence_violations
import data.evolith.executive_scorecards.violations as exec_violations
import data.evolith.gitflow_branching.violations as git_violations
import data.evolith.governance.violations as gov_violations
import data.evolith.hexagonal_architecture.violations as hxa_violations
import data.evolith.infrastructure.helm.violations as helm_violations
import data.evolith.infrastructure.opa_sidecar.violations as opa_sidecar_violations
import data.evolith.knowledge_intake.violations as ki_violations
import data.evolith.mcp.violations as mcp_violations
import data.evolith.multi_runtime.violations as runt_violations
import data.evolith.multi_tenancy.violations as mtn_violations
import data.evolith.open_core_boundary.violations as ocb_violations
import data.evolith.phase_gates.violations as pg_violations
import data.evolith.probabilistic_evidence_admissibility.violations as pea_violations
import data.evolith.protocol_selection.violations as prot_violations
import data.evolith.repository_taxonomy.violations as repo_tax_violations
import data.evolith.satellite_contracts.violations as svc_violations
import data.evolith.taxonomy.violations as taxonomy_violations
import data.evolith.telemetry_evidence.violations as telemetry_violations
import data.evolith.testing_pyramid.violations as tpy_violations
import data.evolith.version_pinning.violations as vp_violations

violations contains v if {
	v := vp_violations[_]
}

violations contains v if {
	v := taxonomy_violations[_]
}

violations contains v if {
	v := cli_violations[_]
}

violations contains v if {
	v := evidence_violations[_]
}

violations contains v if {
	v := mcp_violations[_]
}

violations contains v if {
	v := ci_cd_violations[_]
}

violations contains v if {
	v := gov_violations[_]
}

violations contains v if {
	v := abac_violations[_]
}

violations contains v if {
	v := csi_violations[_]
}

violations contains v if {
	v := acl_violations[_]
}

violations contains v if {
	v := cicd_qg_violations[_]
}

violations contains v if {
	v := cli_cp_violations[_]
}

violations contains v if {
	v := cli_rr_violations[_]
}

violations contains v if {
	v := cb_violations[_]
}

violations contains v if {
	v := dod_violations[_]
}

violations contains v if {
	v := em_violations[_]
}

violations contains v if {
	v := exec_violations[_]
}

violations contains v if {
	v := git_violations[_]
}

violations contains v if {
	v := hxa_violations[_]
}

violations contains v if {
	v := ki_violations[_]
}

violations contains v if {
	v := runt_violations[_]
}

violations contains v if {
	v := mtn_violations[_]
}

violations contains v if {
	v := ocb_violations[_]
}

violations contains v if {
	v := prot_violations[_]
}

violations contains v if {
	v := repo_tax_violations[_]
}

violations contains v if {
	v := svc_violations[_]
}

violations contains v if {
	v := tpy_violations[_]
}

violations contains v if {
	v := telemetry_violations[_]
}

violations contains v if {
	v := helm_violations[_]
}

violations contains v if {
	v := opa_sidecar_violations[_]
}

violations contains v if {
	v := pg_violations[_]
}

# GT-580 — the exit-code taxonomy. Silent unless the caller declares
# `input.core.cli`, so a satellite evaluation is unaffected.
violations contains v if {
	v := cli_exit_violations[_]
}

# GT-584 — PEA-01..04, whether a PROBABILISTIC quality signal may reach a blocking
# verdict. Aggregated HERE and not only shipped as a package, because
# `compile-opa-wasm.mjs` builds exactly two entrypoints (`evolith/main/violations`
# and `evolith/abac/violations`): a policy that is not reachable from one of them
# passes `opa test` and then decides nothing at runtime — a rule present in the
# native engine and absent from OPA, which is the R-25 defect GT-602 was registered
# for. Silent unless the caller declares `input.qualityEvidence`.
violations contains v if {
	v := pea_violations[_]
}
