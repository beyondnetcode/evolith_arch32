package evolith.multi_tenancy

import rego.v1

violations contains {"id": "MTN-01", "message": "Application-layer tenant filtering not applied — all queries must include tenant_id filter"} if {
	not input.satellite.multiTenancy.applicationFiltering
}

violations contains {"id": "MTN-02", "message": "Database-native tenant enforcement (RLS) not enabled as secondary failsafe"} if {
	not input.satellite.multiTenancy.databaseEnforcement
}

violations contains {"id": "MTN-03", "message": "Tenant context not propagated through all layers"} if {
	not input.satellite.multiTenancy.tenantContextPropagation
}

violations contains {"id": "MTN-04", "message": "Cross-tenant data access detected — strictly prohibited"} if {
	input.satellite.multiTenancy.crossTenantAccess
}

violations contains {"id": "MTN-05", "message": "Multi-tenant schema strategy not defined in evolith.yaml"} if {
	not input.satellite.multiTenancy.schemaStrategyDefined
}

violations contains {"id": "MTN-06", "message": "Tenant-scoped audit trail not maintained — all tenant data mutations must be logged with tenant context and actor"} if {
	not input.satellite.multiTenancy.tenantAuditTrailEnabled
}

violations contains {"id": "MTN-07", "message": "Tenant migration path not defined — schema changes affecting tenant isolation must have a documented migration path"} if {
	not input.satellite.multiTenancy.tenantMigrationPathDefined
}

violations contains {"id": "MTN-08", "message": "External APIs do not validate tenant context on every request"} if {
	not input.satellite.multiTenancy.apiTenantValidation
}
