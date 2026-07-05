package evolith.architecture.progressive_axis

import rego.v1

# ---------------------------------------------------------------------------
# Progressive-Axis Architecture Compliance (ARCH-01..ARCH-05)
# Validates cross-cutting eligibility rules for F1→F2→F3 topology transitions.
# Topology-specific rules live co-located with each topology manifest.
# ---------------------------------------------------------------------------

valid_topologies := {"modular-monolith", "distributed-modules", "microservices"}

upgrade_path := {
	"modular-monolith": "distributed-modules",
	"distributed-modules": "microservices",
}

violations contains {"id": "ARCH-01", "message": "evolith.yaml must declare a topology field matching a valid progressive-axis topology (modular-monolith, distributed-modules, microservices)"} if {
	not valid_topologies[input.satellite.topology]
}

violations contains {"id": "ARCH-02", "message": msg} if {
	from := input.satellite.previousTopology
	to := input.satellite.topology
	from != to
	valid_topologies[from]
	valid_topologies[to]
	upgrade_path[from] != to
	msg := sprintf("Topology transition from '%v' to '%v' is not allowed — must follow the progressive axis upgrade path (modular-monolith → distributed-modules → microservices)", [from, to])
}

violations contains {"id": "ARCH-03", "message": "An ADR must exist and be in accepted state before topology selection is finalised"} if {
	not input.satellite.topologyAdrAccepted
}

violations contains {"id": "ARCH-04", "message": "topology.manifest.json must be present and declare the active topology"} if {
	not input.satellite.hasTopologyManifest
}

violations contains {"id": "ARCH-05", "message": msg} if {
	level := input.satellite.archLevel
	topology := input.satellite.topology
	expected := {
		"F1": "modular-monolith",
		"F2": "distributed-modules",
		"F3": "microservices",
	}
	expected[level] != topology
	msg := sprintf("Architecture compatibility alias '%v' does not match declared topology '%v' (expected: '%v')", [level, topology, expected[level]])
}
