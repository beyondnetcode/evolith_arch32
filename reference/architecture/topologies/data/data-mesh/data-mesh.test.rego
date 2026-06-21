package evolith.topologies.datamesh_test

import data.evolith.topologies.datamesh

test_compliant_data_mesh_has_no_violations {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {"isDataProduct": true, "hasDataContracts": true, "federatedGovernance": true}}}
  count(violations) == 0
}

test_missing_data_product_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {"isDataProduct": false, "hasDataContracts": true, "federatedGovernance": true}}}
  violations[_].id == "DAM-R01"
}

test_missing_data_contracts_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {"isDataProduct": true, "hasDataContracts": false, "federatedGovernance": true}}}
  violations[_].id == "DAM-R02"
}

test_missing_federated_governance_is_rejected {
  violations := datamesh.violations with input as {"satellite": {"dataMesh": {"isDataProduct": true, "hasDataContracts": true, "federatedGovernance": false}}}
  violations[_].id == "DAM-R03"
}
