package evolith.phase_gates

import rego.v1

# ---------------------------------------------------------------------------
# Phase Gate Evaluator
# Input schema:
#   input.gate        : { phase: int, mandatoryEvidence: [...], blockingCriteria: [...] }
#   input.evidence    : [{ artifact: string, status: string, approvalEvidence?: string, date?: string }]
#   input.waiver      : [{ criterion: string, status: string, expirationDate: string }]
#   input.tenantId    : string (optional — for audit trail)
# ---------------------------------------------------------------------------

# Gate passes only when ALL mandatory artifacts are present and no blocking criteria fire
default allow := false

allow if {
  count(missing_evidence) == 0
  count(active_blocks) == 0
}

# --- Evidence resolution ---------------------------------------------------

evidence_artifacts contains name if {
  some e in input.evidence
  name := e.artifact
}

missing_evidence contains artifact if {
  some req in input.gate.mandatoryEvidence
  artifact := req.artifact
  not evidence_artifacts[artifact]
}

# --- Blocking criteria resolution ------------------------------------------

active_blocks contains criterion if {
  some b in input.gate.blockingCriteria
  criterion := b.criterion
  not waived(criterion)
}

waived(criterion) if {
  some w in input.waiver
  w.criterion == criterion
  w.status == "active"
  not waiver_expired(w.expirationDate)
}

waiver_expired(exp_date) if {
  # Compare ISO-8601 dates lexicographically (YYYY-MM-DD format)
  exp_date < input.evaluationDate
}

# --- Structured result -----------------------------------------------------

result := {
  "allow": allow,
  "phase": input.gate.phase,
  "tenantId": object.get(input, "tenantId", "default"),
  "missingEvidence": missing_evidence,
  "activeBlocks": active_blocks,
  "evaluatedAt": object.get(input, "evaluationDate", "unknown"),
}

# --- Waiver validation -----------------------------------------------------
# A waiver is valid only if it covers a known blocking criterion

invalid_waivers contains w.criterion if {
  some w in input.waiver
  not criterion_exists(w.criterion)
}

criterion_exists(c) if {
  some b in input.gate.blockingCriteria
  b.criterion == c
}

# --- Aggregated violations (consumed by evolith.main) -----------------------
# Empty when `input.gate` is absent, so wiring this into main.rego is additive
# for inputs that carry no gate context (GT-380 / L1c).

violations contains v if {
  some artifact in missing_evidence
  v := {"id": "PG-EVIDENCE-MISSING", "message": sprintf("Mandatory artifact '%v' is missing for the gate", [artifact])}
}

violations contains v if {
  some criterion in active_blocks
  v := {"id": "PG-CRITERION-BLOCKING", "message": sprintf("Blocking criterion '%v' is active and not waived", [criterion])}
}

violations contains v if {
  some criterion in invalid_waivers
  v := {"id": "PG-WAIVER-INVALID", "message": sprintf("Waiver references unknown blocking criterion '%v'", [criterion])}
}
