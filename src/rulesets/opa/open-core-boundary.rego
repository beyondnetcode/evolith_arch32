package evolith.open_core_boundary

import rego.v1

violations contains {"id": "OCB-01", "message": "Core rulesets/schemas reference commercial license, paid feature flag, or enterprise-only dependency"} if {
	input.satellite.openCore.coreHasEnterpriseReferences
}

violations contains {"id": "OCB-02", "message": "Enterprise-only artifact missing explicit 'availability: enterprise' metadata"} if {
	input.satellite.openCore.enterpriseArtifactNotMarked
}

violations contains {"id": "OCB-03", "message": "ACL implementation code found in Core — must be in Enterprise layer only"} if {
	input.satellite.openCore.aclImplementationInCore
}

violations contains {"id": "OCB-04", "message": "CLI/MCP implementation gated behind paid license — must remain fully open in Core"} if {
	input.satellite.openCore.cliMcpGated
}

violations contains {"id": "OCB-05", "message": "Tracker-specific concepts found in Core rulesets — Tracker features cannot penetrate Core"} if {
	input.satellite.openCore.trackerConceptsInCore
}

violations contains {"id": "OCB-06", "message": "Core reference corpus contains tiered access (premium/enterprise) — all standards must be equal"} if {
	input.satellite.openCore.tieredAccessInCore
}

violations contains {"id": "OCB-07", "message": "Enterprise feature promoted to Core without Architecture Board approval — promotion requires formal review and accepted ADR before Core inclusion"} if {
	input.satellite.openCore.hasEnterprisePromotionWithoutApproval
}

violations contains {"id": "OCB-08", "message": "Core rules require enterprise features to function — Core must be independently viable"} if {
	input.satellite.openCore.coreRequiresEnterprise
}
