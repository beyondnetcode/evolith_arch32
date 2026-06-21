package evolith.topologies.serverless_test

import data.evolith.topologies.serverless

test_compliant_serverless_has_no_violations {
  violations := serverless.deny with input as {"topology": "serverless", "config": {"hasContract": true, "isStateless": true, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  count(violations) == 0
}

test_missing_contract_is_rejected {
  violations := serverless.deny with input as {"topology": "serverless", "config": {"hasContract": false, "isStateless": true, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  violations[_] == "SV-R01: serverless.config.json is required."
}

test_non_stateless_is_rejected {
  violations := serverless.deny with input as {"topology": "serverless", "config": {"hasContract": true, "isStateless": false, "hasBoundedPackage": true, "hasColdStartReadiness": true}}
  violations[_] == "SV-R02: Serverless execution must be stateless."
}
