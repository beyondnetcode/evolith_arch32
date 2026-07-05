package evolith.topologies.serverless_test

import data.evolith.topologies.serverless

test_compliant_serverless_has_no_violations {
  violations := serverless.violations with input as {"topology": "serverless", "config": {"networkSecurity": {"mtlsEnabled": true}, "hasContract": true, "isStateless": true, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  count(violations) == 0
}

test_missing_contract_is_rejected {
  violations := serverless.violations with input as {"topology": "serverless", "config": {"networkSecurity": {"mtlsEnabled": true}, "hasContract": false, "isStateless": true, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  violations[_].id == "SV-R01"
}

test_non_stateless_is_rejected {
  violations := serverless.violations with input as {"topology": "serverless", "config": {"networkSecurity": {"mtlsEnabled": true}, "hasContract": true, "isStateless": false, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  violations[_].id == "SV-R02"
}

test_missing_package_bound_is_rejected {
  violations := serverless.violations with input as {"topology": "serverless", "config": {"networkSecurity": {"mtlsEnabled": true}, "hasContract": true, "isStateless": true, "hasBoundedPackage": false, "hasColdStartReadiness": true}}
  violations[_].id == "SV-R03"
}

test_missing_cold_start_readiness_is_rejected {
  violations := serverless.violations with input as {"topology": "serverless", "config": {"networkSecurity": {"mtlsEnabled": true}, "hasContract": true, "isStateless": true, "hasBoundedPackage": true, "hasColdStartReadiness": false}}
  violations[_].id == "SV-R04"
}
