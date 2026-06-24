package evolith.open_core_boundary

violations[{"id": "OCB-01", "message": "Core rulesets/schemas reference commercial license, paid feature flag, or enterprise-only dependency"}] {
    input.satellite.openCore.coreHasEnterpriseReferences
}

violations[{"id": "OCB-02", "message": "Enterprise-only artifact missing explicit 'availability: enterprise' metadata"}] {
    input.satellite.openCore.enterpriseArtifactNotMarked
}

violations[{"id": "OCB-03", "message": "ACL implementation code found in Core — must be in Enterprise layer only"}] {
    input.satellite.openCore.aclImplementationInCore
}

violations[{"id": "OCB-04", "message": "CLI/MCP implementation gated behind paid license — must remain fully open in Core"}] {
    input.satellite.openCore.cliMcpGated
}

violations[{"id": "OCB-05", "message": "Tracker-specific concepts found in Core rulesets — Tracker features cannot penetrate Core"}] {
    input.satellite.openCore.trackerConceptsInCore
}

violations[{"id": "OCB-06", "message": "Core reference corpus contains tiered access (premium/enterprise) — all standards must be equal"}] {
    input.satellite.openCore.tieredAccessInCore
}

violations[{"id": "OCB-08", "message": "Core rules require enterprise features to function — Core must be independently viable"}] {
    input.satellite.openCore.coreRequiresEnterprise
}
