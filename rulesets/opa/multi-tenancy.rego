package evolith.multi_tenancy

violations[{"id": "MTN-01", "message": "Application-layer tenant filtering not applied — all queries must include tenant_id filter"}] {
    not input.satellite.multiTenancy.applicationFiltering
}

violations[{"id": "MTN-02", "message": "Database-native tenant enforcement (RLS) not enabled as secondary failsafe"}] {
    not input.satellite.multiTenancy.databaseEnforcement
}

violations[{"id": "MTN-03", "message": "Tenant context not propagated through all layers"}] {
    not input.satellite.multiTenancy.tenantContextPropagation
}

violations[{"id": "MTN-04", "message": "Cross-tenant data access detected — strictly prohibited"}] {
    input.satellite.multiTenancy.crossTenantAccess
}

violations[{"id": "MTN-05", "message": "Multi-tenant schema strategy not defined in evolith.yaml"}] {
    not input.satellite.multiTenancy.schemaStrategyDefined
}

violations[{"id": "MTN-08", "message": "External APIs do not validate tenant context on every request"}] {
    not input.satellite.multiTenancy.apiTenantValidation
}
