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
import data.evolith.topology_composition.violations as tpc_violations
import data.evolith.version_pinning.violations as vp_violations

# GT-693 — every aggregated violation carries the POLICY THAT EMITTED IT.
#
# Before this, `violations` was a flat set of `{id, message}` and the evaluator had
# to guess the source from the id: a hand-maintained prefix table in
# `opa-evaluator.ts` mapped four policies, and the other 27 fell through to exact-id
# matching, which can never match — a gate's `rules: ["rulesets/opa/<f>.rego"]`
# becomes `opa-<f>`, and no policy emits an id shaped like that. The violations were
# therefore DROPPED and the rule reported `passed`. Measured: a satellite with
# `lodash: ^4.17.21` produced `DEP-01` in this bundle and a verdict of `passed`.
#
# The tag is exactly the id `deriveRuleId` builds from the policy's path, so the
# evaluator compares two things that are equal by construction instead of by a list
# somebody has to remember to update.
#
# Written as literal object construction on purpose: only a handful of builtins are
# dispatchable in the compiled wasm (see guard 55), so `object.union` and friends are
# not available here. That makes the projection below EXHAUSTIVE by hand: any field
# an aggregated policy emits beyond `id` and `message` is dropped on the way out.
#
# Measured rather than asserted, by `opa-evaluator.spec.ts` ("the aggregated corpus
# is the shape this projection assumes · GT-693"), which recomputes both figures from
# these files on every run — the count below drifted silently once already:
#   - 266 violation literals across the 34 aggregated policies;
#   - 265 of them carry exactly `id` and `message`, and ONE does not — `TPC-01` in
#     `topology-composition.rego` also sets `severity`, `title` and `blocking`, which
#     this projection discards. Harmless today because `opa-evaluator.ts` reads only
#     `id`, `message` and `policy`; the spec fails if a SECOND policy starts carrying
#     fields, which is the point at which projecting by hand stops being defensible.

violations contains {"id": v.id, "message": v.message, "policy": "opa-version-pinning"} if {
	v := vp_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-taxonomy"} if {
	v := taxonomy_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-cli-readiness"} if {
	v := cli_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-evidence"} if {
	v := evidence_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-mcp"} if {
	v := mcp_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-ci-cd"} if {
	v := ci_cd_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-governance"} if {
	v := gov_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-abac-mcp-tool-access"} if {
	v := abac_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-capability-source-interface"} if {
	v := csi_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-anti-corruption-layer"} if {
	v := acl_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-cicd-quality-gates"} if {
	v := cicd_qg_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-cli-core-parity"} if {
	v := cli_cp_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-cli-release-readiness"} if {
	v := cli_rr_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-compliance-baseline"} if {
	v := cb_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-dod"} if {
	v := dod_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-engineering-manifesto"} if {
	v := em_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-executive-scorecards"} if {
	v := exec_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-gitflow-branching"} if {
	v := git_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-hexagonal-architecture"} if {
	v := hxa_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-knowledge-intake"} if {
	v := ki_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-multi-runtime"} if {
	v := runt_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-multi-tenancy"} if {
	v := mtn_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-open-core-boundary"} if {
	v := ocb_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-protocol-selection"} if {
	v := prot_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-repository-taxonomy"} if {
	v := repo_tax_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-satellite-contracts"} if {
	v := svc_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-testing-pyramid"} if {
	v := tpy_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-telemetry-evidence"} if {
	v := telemetry_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-infrastructure-helm-enforcement"} if {
	v := helm_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-infrastructure-opa-sidecar-bundle"} if {
	v := opa_sidecar_violations[_]
}

violations contains {"id": v.id, "message": v.message, "policy": "opa-phase-gates"} if {
	v := pg_violations[_]
}

# GT-580 — the exit-code taxonomy. Silent unless the caller declares
# `input.core.cli`, so a satellite evaluation is unaffected.
violations contains {"id": v.id, "message": v.message, "policy": "opa-cli-exit-code-taxonomy"} if {
	v := cli_exit_violations[_]
}

# GT-584 — PEA-01..04, whether a PROBABILISTIC quality signal may reach a blocking
# verdict. Aggregated HERE and not only shipped as a package, because
# `compile-opa-wasm.mjs` builds exactly two entrypoints (`evolith/main/violations`
# and `evolith/abac/violations`): a policy that is not reachable from one of them
# passes `opa test` and then decides nothing at runtime — a rule present in the
# native engine and absent from OPA, which is the R-25 defect GT-602 was registered
# for. Silent unless the caller declares `input.qualityEvidence`.
violations contains {"id": v.id, "message": v.message, "policy": "opa-probabilistic-evidence-admissibility"} if {
	v := pea_violations[_]
}

# GT-688 — TPC-01, the composition-aware half. Aggregated HERE and not only
# shipped as a package: `compile-opa-wasm.mjs` builds exactly two entrypoints, so
# a policy unreachable from one of them passes `opa test` and then decides
# nothing at runtime (the R-25 defect GT-602 was registered for). Silent unless
# the caller declares `input.context.topologyConfirmedRefs`.
violations contains {"id": v.id, "message": v.message, "policy": "opa-topology-composition"} if {
	v := tpc_violations[_]
}
