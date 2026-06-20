package evolith.topologies.edge_computing

import rego.v1
import data.evolith.topologies.execution.common as common_exec

deny contains msg if {
    some msg in common_exec.deny
}

# EC-R01: Mandatory Synchronization Strategy
deny contains msg if {
    input.topology == "edge-computing"
    not input.config.syncStrategy
    msg := "EC-R01: Edge computing components MUST define a 'syncStrategy' (e.g. offline-first, eventual, real-time-fallback)."
}

deny contains msg if {
    input.topology == "edge-computing"
    input.config.syncStrategy
    not input.config.syncStrategy in ["offline-first", "eventual", "real-time-fallback"]
    msg := sprintf("EC-R01: 'syncStrategy' must be 'offline-first', 'eventual', or 'real-time-fallback', found '%v'.", [input.config.syncStrategy])
}

# EC-R02: Edge Node Isolation
deny contains msg if {
    input.topology == "edge-computing"
    not input.config.edgeIsolation
    msg := "EC-R02: Edge computing components MUST declare 'edgeIsolation' to ensure autonomous operation during network partitions."
}

deny contains msg if {
    input.topology == "edge-computing"
    input.config.edgeIsolation != true
    msg := "EC-R02: 'edgeIsolation' MUST be true."
}

# EC-R03: Conflict Resolution Strategy
deny contains msg if {
    input.topology == "edge-computing"
    not input.config.conflictResolution
    msg := "EC-R03: Edge computing components MUST declare a 'conflictResolution' strategy."
}

deny contains msg if {
    input.topology == "edge-computing"
    input.config.conflictResolution
    not input.config.conflictResolution in ["last-write-wins", "merge", "manual"]
    msg := sprintf("EC-R03: 'conflictResolution' must be 'last-write-wins', 'merge', or 'manual', found '%v'.", [input.config.conflictResolution])
}
