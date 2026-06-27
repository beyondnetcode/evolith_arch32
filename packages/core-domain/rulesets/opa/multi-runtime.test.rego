package evolith.multi_runtime_test

import data.evolith.multi_runtime

compliant_input := {"satellite": {"runtime": {
  "selectionDocumented": true,
  "webApisNotNodeJs": false,
  "highComputeNotDotNet": false,
  "hasDirectRuntimeDependency": false,
  "syncInteropNotGrpc": false,
  "contractsCentralized": true,
}}}

test_compliant_multi_runtime_has_no_violations {
  violations := multi_runtime.violations with input as compliant_input
  count(violations) == 0
}

test_runtime_selection_not_documented_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/selectionDocumented", "value": false}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-01"
}

test_web_apis_not_nodejs_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/webApisNotNodeJs", "value": true}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-02"
}

test_high_compute_not_dotnet_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/highComputeNotDotNet", "value": true}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-03"
}

test_direct_runtime_dependency_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/hasDirectRuntimeDependency", "value": true}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-05"
}

test_sync_interop_not_grpc_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/syncInteropNotGrpc", "value": true}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-06"
}

test_contracts_not_centralized_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/runtime/contractsCentralized", "value": false}])
  violations := multi_runtime.violations with input as i
  violations[_].id == "RUNT-08"
}
