package evolith.satellite_contracts

import rego.v1

violations contains {"id": "SVC-01", "message": "evolith.yaml not found at the satellite project root, or multiple evolith.yaml files found at the project root"} if {
	not input.satellite.contracts.hasEvolyamlAtProjectRoot
}

violations contains {"id": "SVC-06", "message": "Workspace integrity violation — a discovered evolith.yaml is not declared in evolith.workspace.yaml, or a declared project is missing its evolith.yaml"} if {
	input.satellite.contracts.isWorkspace
	not input.satellite.contracts.workspaceIntegrityOk
}

violations contains {"id": "SVC-03", "message": "F1 phase satellite must reference core/ADR-0047 in spec.compliance.adrRegistry"} if {
	input.satellite.contracts.phase == "F1"
	not input.satellite.contracts.hasAdr0047
}

violations contains {"id": "SVC-04", "message": "F2/F3 satellite missing extraction readiness score documentation"} if {
	input.satellite.contracts.phase == "F2"
	not input.satellite.contracts.hasExtractionReadinessScore
}

violations contains {"id": "SVC-04", "message": "F2/F3 satellite missing extraction readiness score documentation"} if {
	input.satellite.contracts.phase == "F3"
	not input.satellite.contracts.hasExtractionReadinessScore
}

violations contains {"id": "SVC-05", "message": "Core version referenced does not exist in Evolith Core registry"} if {
	not input.satellite.contracts.coreVersionExists
}

violations contains {"id": "SVC-02", "message": "Satellite name must be unique across all registered Evolith satellites — name conflict detected in registry"} if {
	not input.satellite.contracts.nameIsUnique
}

violations contains {"id": "MIG-01", "message": "No documented upgrade path for satellite governance version — run 'evolith upgrade --target <version>' to document the upgrade procedure"} if {
	input.satellite.contracts.needsGovernanceUpgrade
	not input.satellite.contracts.upgradePathDocumented
}

violations contains {"id": "MIG-02", "message": "Phase transition attempted without Architecture Board approval artifact"} if {
	input.satellite.contracts.phaseTransitionWithoutApproval
}

violations contains {"id": "MIG-03", "message": "Satellite deprecated without marking status in evolith.yaml"} if {
	input.satellite.contracts.isDeprecated
	not input.satellite.contracts.deprecatedStatusMarked
}
