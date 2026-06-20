package evolith.topologies.agentic_ai

violations[{"id": "AAI-R01", "severity": "MUST", "title": "Declared Agent Identity and Capabilities", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasIdentity
    message := "agent.config.json must declare agent.id and a non-empty capabilities array (AAI-R01)."
}

violations[{"id": "AAI-R02", "severity": "MUST", "title": "Explicit Sandbox Boundary", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasIsolatedSandbox
    message := "agent.config.json must declare an isolated sandbox with deny or allowlist network and process access (AAI-R02)."
}

violations[{"id": "AAI-R03", "severity": "MUST", "title": "Prompt and Implementation Separation", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasSeparatedPromptAndImplementation
    message := "agent.config.json must declare non-overlapping promptSources and implementationRoots (AAI-R03)."
}

violations[{"id": "AAI-R04", "severity": "MUST", "title": "Approval for Mutative Tools", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.requiresApprovalForMutativeTools
    message := "agent.config.json must set toolPolicy.mutative to approval-required (AAI-R04)."
}

violations[{"id": "AAI-R05", "severity": "MUST", "title": "Ephemeral Sandbox Resource Limits", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasEphemeralSandboxLimits
    message := "agent.config.json must require ephemeral execution with positive duration, memory, and CPU limits (AAI-R05)."
}

violations[{"id": "AAI-R06", "severity": "MUST", "title": "Untrusted Context Is Data", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasTrustedContextPolicy
    message := "agent.config.json must treat untrusted context as data, require provenance, and validate tool output schemas (AAI-R06)."
}

violations[{"id": "AAI-R07", "severity": "MUST", "title": "Capability-Scoped, Auditable Actions", "blocking": true, "message": message}] {
    not input.satellite.agenticAi.hasAccountableActions
    message := "agent.config.json must require scoped-and-expiring capabilities and append-only correlated action evidence (AAI-R07)."
}
