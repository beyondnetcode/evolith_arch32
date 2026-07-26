package evolith.acl

import rego.v1

violations contains {"id": "ACL-01", "message": "Adapter must pass schema validation before ingestion"} if {
	not input.adapter.schemaValidated
}

violations contains {"id": "ACL-02", "message": "Adapter transformations must be traceable to original source"} if {
	not input.adapter.transformationTraceable
}

violations contains {"id": "ACL-03", "message": "Adapter must not perform silent normalization of external data"} if {
	input.adapter.silentNormalization
}

violations contains {"id": "ACL-04", "message": "Adapter must declare coreCompatibilityVersion"} if {
	not input.adapter.coreCompatibilityVersion
}

violations contains {"id": "ACL-04", "message": "Adapter coreCompatibilityVersion must be a non-empty string"} if {
	val := input.adapter.coreCompatibilityVersion
	not is_string(val)
}

violations contains {"id": "ACL-04", "message": "Adapter coreCompatibilityVersion must be a non-empty string"} if {
	val := input.adapter.coreCompatibilityVersion
	is_string(val)
	count(val) == 0
}

violations contains {"id": "ACL-05", "message": "Adapter must not expose raw external domain objects to Core — all external types must be mapped to Core domain types before crossing the boundary"} if {
	input.adapter.exposesRawExternalTypes
}

violations contains {"id": "ACL-06", "message": "ACL adapter must be located in 'adapter' or 'infrastructure' path, not domain"} if {
	loc := lower(input.adapter.location)
	not contains(loc, "/adapter")
	not contains(loc, "/adapters")
	not contains(loc, "/infrastructure")
}
