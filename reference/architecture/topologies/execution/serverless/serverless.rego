package evolith.topologies.serverless

import rego.v1
import data.evolith.topologies.execution.common as common_exec

deny contains msg if {
    some msg in common_exec.deny
}

deny contains msg if {
    input.topology == "serverless"
    not input.config.hasContract
    msg := "SV-R01: serverless.config.json is required."
}

deny contains msg if {
    input.topology == "serverless"
    not input.config.isStateless
    msg := "SV-R02: Serverless execution must be stateless."
}

deny contains msg if {
    input.topology == "serverless"
    not input.config.hasBoundedPackage
    msg := "SV-R03: Package size must be positive and no greater than 50 MB."
}

deny contains msg if {
    input.topology == "serverless"
    not input.config.hasColdStartReadiness
    msg := "SV-R04: Cold-start limits and lazy initialization are required."
}
