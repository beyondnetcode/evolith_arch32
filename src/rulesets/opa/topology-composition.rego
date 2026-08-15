package evolith.topology_composition

import rego.v1

# GT-688 — the first policy that discriminates on the CONFIRMED COMPOSITION.
#
# `input.context.topologyConfirmedRefs` is projected by
# `evaluation-context.builder.ts:evaluationFactsFromContext` and merged verbatim
# into the OPA input by `opa-input-builder.ts`.
#
# Membership is expressed with `some … in` and equality ONLY. The wasm bundle
# host-dispatches exactly one builtin (`sprintf`) and the SDK implements six, so
# any other builtin compiles clean, passes `opa test`, and then THROWS at
# evaluation time — where `opa-evaluator.ts` maps the error onto EVERY rule in
# the run as "OPA engine error — enforcement blocked".

confirmed contains t if {
	some t in input.context.topologyConfirmedRefs
}

violations contains {
	"id": "TPC-01",
	"severity": "MUST",
	"title": "Event-driven composition requires a transactional outbox",
	"blocking": true,
	"message": "The confirmed composition includes 'event-driven' but the repository declares no transactional outbox (TPC-01).",
} if {
	confirmed["event-driven"]
	not input.satellite.eventDriven.hasOutbox
}
