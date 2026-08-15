# GT-688 — TPC-01 must DISCRIMINATE on the composition, not merely exist.
#
# The two cases below hold `input.satellite` byte-identical (no transactional
# outbox declared) and differ in exactly ONE thing: whether the confirmed
# composition names `event-driven`. If the policy fired on both, it would be
# judging the satellite and not the composition; if it fired on neither, the
# arity would have reached the policy and changed nothing — the defect GT-688
# exists to close.
package evolith.topology_composition_test

import rego.v1

import data.evolith.topology_composition as tpc

# Identical in both cases: the repository declares NO transactional outbox.
satellite_without_outbox := {"eventDriven": {"hasOutbox": false}}

test_tpc01_fires_when_event_driven_confirmed if {
	v := tpc.violations with input as {
		"context": {"topologyConfirmedRefs": ["modular-monolith", "event-driven"]},
		"satellite": satellite_without_outbox,
	}
	count(v) == 1
	some viol in v
	viol.id == "TPC-01"
	viol.blocking == true
}

test_tpc01_silent_without_event_driven if {
	v := tpc.violations with input as {
		"context": {"topologyConfirmedRefs": ["modular-monolith", "agentic-ai"]},
		"satellite": satellite_without_outbox,
	}
	count(v) == 0
}

# A composition that DOES confirm event-driven and DOES declare the outbox is
# silent too — otherwise TPC-01 would be unsatisfiable rather than a rule.
test_tpc01_silent_when_outbox_declared if {
	v := tpc.violations with input as {
		"context": {"topologyConfirmedRefs": ["event-driven"]},
		"satellite": {"eventDriven": {"hasOutbox": true}},
	}
	count(v) == 0
}

# A pre-GT-688 caller that declares no composition at all reaches nothing.
test_tpc01_silent_without_any_composition if {
	v := tpc.violations with input as {"satellite": satellite_without_outbox}
	count(v) == 0
}
