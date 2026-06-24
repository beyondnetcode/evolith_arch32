package evolith.multi_tenancy_test

import data.evolith.multi_tenancy

compliant_input := {"satellite": {"multiTenancy": {
  "applicationFiltering": true,
  "databaseEnforcement": true,
  "tenantContextPropagation": true,
  "crossTenantAccess": false,
  "schemaStrategyDefined": true,
  "apiTenantValidation": true,
}}}

test_compliant_multi_tenancy_has_no_violations {
  violations := multi_tenancy.violations with input as compliant_input
  count(violations) == 0
}

test_missing_application_filtering_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/applicationFiltering", "value": false}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-01"
}

test_missing_database_enforcement_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/databaseEnforcement", "value": false}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-02"
}

test_missing_tenant_context_propagation_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/tenantContextPropagation", "value": false}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-03"
}

test_cross_tenant_access_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/crossTenantAccess", "value": true}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-04"
}

test_missing_schema_strategy_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/schemaStrategyDefined", "value": false}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-05"
}

test_missing_api_tenant_validation_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/multiTenancy/apiTenantValidation", "value": false}])
  violations := multi_tenancy.violations with input as i
  violations[_].id == "MTN-08"
}
