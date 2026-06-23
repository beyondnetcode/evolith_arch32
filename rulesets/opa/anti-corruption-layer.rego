package evolith.acl

violations[{"id": "ACL-01", "message": "Adapter must pass schema validation before ingestion"}] {
    not input.adapter.schemaValidated
}

violations[{"id": "ACL-02", "message": "Adapter transformations must be traceable to original source"}] {
    not input.adapter.transformationTraceable
}

violations[{"id": "ACL-03", "message": "Adapter must not perform silent normalization of external data"}] {
    input.adapter.silentNormalization
}

violations[{"id": "ACL-04", "message": "Adapter must declare coreCompatibilityVersion"}] {
    not input.adapter.coreCompatibilityVersion
}

violations[{"id": "ACL-04", "message": "Adapter coreCompatibilityVersion must be a non-empty string"}] {
    val := input.adapter.coreCompatibilityVersion
    not is_string(val)
}

violations[{"id": "ACL-04", "message": "Adapter coreCompatibilityVersion must be a non-empty string"}] {
    val := input.adapter.coreCompatibilityVersion
    is_string(val)
    count(val) == 0
}

violations[{"id": "ACL-06", "message": "ACL adapter must be located in 'adapter' or 'infrastructure' path, not domain"}] {
    loc := lower(input.adapter.location)
    not contains(loc, "/adapter")
    not contains(loc, "/adapters")
    not contains(loc, "/infrastructure")
}
