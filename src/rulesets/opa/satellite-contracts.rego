package evolith.satellite_contracts

violations[{"id": "SVC-01", "message": "evolith.yaml not found at the satellite project root, or multiple evolith.yaml files found at the project root"}] {
    not input.satellite.contracts.hasEvolyamlAtProjectRoot
}

violations[{"id": "SVC-06", "message": "Workspace integrity violation — a discovered evolith.yaml is not declared in evolith.workspace.yaml, or a declared project is missing its evolith.yaml"}] {
    input.satellite.contracts.isWorkspace
    not input.satellite.contracts.workspaceIntegrityOk
}

violations[{"id": "SVC-03", "message": "F1 phase satellite must reference core/ADR-0047 in spec.compliance.adrRegistry"}] {
    input.satellite.contracts.phase == "F1"
    not input.satellite.contracts.hasAdr0047
}

violations[{"id": "SVC-04", "message": "F2/F3 satellite missing extraction readiness score documentation"}] {
    input.satellite.contracts.phase == "F2"
    not input.satellite.contracts.hasExtractionReadinessScore
}

violations[{"id": "SVC-04", "message": "F2/F3 satellite missing extraction readiness score documentation"}] {
    input.satellite.contracts.phase == "F3"
    not input.satellite.contracts.hasExtractionReadinessScore
}

violations[{"id": "SVC-05", "message": "Core version referenced does not exist in Evolith Core registry"}] {
    not input.satellite.contracts.coreVersionExists
}

violations[{"id": "SVC-02", "message": "Satellite name must be unique across all registered Evolith satellites — name conflict detected in registry"}] {
    not input.satellite.contracts.nameIsUnique
}

violations[{"id": "MIG-01", "message": "No documented upgrade path for satellite governance version — run 'evolith upgrade --target <version>' to document the upgrade procedure"}] {
    input.satellite.contracts.needsGovernanceUpgrade
    not input.satellite.contracts.upgradePathDocumented
}

violations[{"id": "MIG-02", "message": "Phase transition attempted without Architecture Board approval artifact"}] {
    input.satellite.contracts.phaseTransitionWithoutApproval
}

violations[{"id": "MIG-03", "message": "Satellite deprecated without marking status in evolith.yaml"}] {
    input.satellite.contracts.isDeprecated
    not input.satellite.contracts.deprecatedStatusMarked
}
