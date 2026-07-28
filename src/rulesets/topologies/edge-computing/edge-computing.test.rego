package evolith.topologies.edge_computing_test

import rego.v1

import data.evolith.topologies.edge_computing

test_compliant_edge_has_no_violations if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "syncStrategy": "offline-first", "edgeIsolation": true, "conflictResolution": "last-write-wins"}}
	count(violations) == 0
}

test_missing_sync_strategy_is_rejected if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "edgeIsolation": true, "conflictResolution": "last-write-wins"}}
	violations[_].id == "EC-R01"
}

test_invalid_sync_strategy_is_rejected if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "syncStrategy": "invalid", "edgeIsolation": true, "conflictResolution": "last-write-wins"}}
	violations[_].id == "EC-R01"
}

test_missing_edge_isolation_is_rejected if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "syncStrategy": "offline-first", "conflictResolution": "last-write-wins"}}
	violations[_].id == "EC-R02"
}

test_missing_conflict_resolution_is_rejected if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "syncStrategy": "offline-first", "edgeIsolation": true}}
	violations[_].id == "EC-R03"
}

test_invalid_conflict_resolution_is_rejected if {
	violations := edge_computing.violations with input as {"topology": "edge-computing", "config": {"networkSecurity": {"mtlsEnabled": true}, "syncStrategy": "offline-first", "edgeIsolation": true, "conflictResolution": "bad"}}
	violations[_].id == "EC-R03"
}
