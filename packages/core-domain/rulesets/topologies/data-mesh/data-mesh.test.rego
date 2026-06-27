package evolith.topologies.datamesh_test

import data.evolith.topologies.datamesh

# --- Baseline rules (DAM-R01–R03) ---

test_compliant_data_mesh_has_no_violations {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  count(violations) == 0
}

test_missing_data_product_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": false, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R01"
}

test_missing_data_contracts_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": false, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R02"
}

test_missing_federated_governance_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": false,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R03"
}

# --- New rules (DAM-R04–R09) ---

test_missing_lineage_tracking_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": false, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R04"
}

test_missing_retention_policy_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": false,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R05"
}

test_missing_consumption_contracts_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": false, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R06"
}

test_missing_data_quality_slo_is_flagged {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": false,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R07"
}

test_missing_backward_compatible_contracts_is_flagged {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": false, "hasDiscoveryRegistration": true
  }}}
  violations[_].id == "DAM-R08"
}

test_missing_discovery_registration_is_flagged {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {
    "isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true,
    "hasLineageTracking": true, "hasRetentionPolicy": true,
    "hasConsumptionContracts": true, "hasDataQualitySLO": true,
    "hasBackwardCompatibleContracts": true, "hasDiscoveryRegistration": false
  }}}
  violations[_].id == "DAM-R09"
}
