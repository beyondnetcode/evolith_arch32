package evolith.capability_source_interface

import rego.v1

# Mirrors the Agent Runtime native GovernancePosture.allowedSourceInterfaces
# guard. The policy is additive: capabilities with no explicit allowlist, or
# requests with no source interface, keep the legacy allow behavior.

default allow := true

allow := false if {
	violations[_]
}

capability := value if {
	value := object.get(input, "capability", {})
}

allowed_source_interfaces := value if {
	value := object.get(capability, "allowedSourceInterfaces", [])
}

source_interface := value if {
	context := object.get(input, "context", {})
	value := object.get(context, "sourceInterface", object.get(input, "sourceInterface", ""))
}

capability_id := value if {
	value := object.get(capability, "id", object.get(input, "tool", "unknown"))
}

source_allowed(source) if {
	allowed_source_interfaces[_] == source
}

violations contains {"id": "CSI-01", "message": msg} if {
	count(allowed_source_interfaces) > 0
	source_interface != ""
	not source_allowed(source_interface)
	msg := sprintf("Capability '%v' is not allowed to be executed from interface '%v'", [capability_id, source_interface])
}
