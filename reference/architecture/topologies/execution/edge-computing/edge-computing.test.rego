package evolith.topologies.edge_computing_test

import data.evolith.topologies.edge_computing

test_compliant_edge_has_no_violations {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"syncStrategy": "offline-first", "edgeIsolation": true, "conflictResolution": "last-write-wins"}}
  count(violations) == 0
}

test_missing_sync_strategy_is_rejected {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"edgeIsolation": true, "conflictResolution": "last-write-wins"}}
  violations[_] == "EC-R01: Edge computing components MUST define a 'syncStrategy' (e.g. offline-first, eventual, real-time-fallback)."
}

test_invalid_sync_strategy_is_rejected {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"syncStrategy": "invalid", "edgeIsolation": true, "conflictResolution": "last-write-wins"}}
  violations[_] == "EC-R01: 'syncStrategy' must be 'offline-first', 'eventual', or 'real-time-fallback', found 'invalid'."
}

test_missing_edge_isolation_is_rejected {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"syncStrategy": "offline-first", "edgeIsolation": false, "conflictResolution": "last-write-wins"}}
  violations[_] == "EC-R02: 'edgeIsolation' MUST be true."
}

test_missing_conflict_resolution_is_rejected {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"syncStrategy": "offline-first", "edgeIsolation": true}}
  violations[_] == "EC-R03: Edge computing components MUST declare a 'conflictResolution' strategy."
}

test_invalid_conflict_resolution_is_rejected {
  violations := edge_computing.deny with input as {"topology": "edge-computing", "config": {"syncStrategy": "offline-first", "edgeIsolation": true, "conflictResolution": "bad"}}
  violations[_] == "EC-R03: 'conflictResolution' must be 'last-write-wins', 'merge', or 'manual', found 'bad'."
}
