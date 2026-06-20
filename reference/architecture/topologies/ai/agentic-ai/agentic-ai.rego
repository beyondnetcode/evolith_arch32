package evolith.architecture.agenticai

default allow := false

# AAI-R01: Agentic AI configuration
deny[{"id": "AAI-R01", "msg": "El satélite debe declarar la identidad y capacidades del agente (p. ej. .agent.yaml, agent.config.json o agents-registry.json)"}] {
    not input.satellite.hasAgentManifest
}

allow {
    count(deny) == 0
}
