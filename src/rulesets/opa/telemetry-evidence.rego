package evolith.telemetry_evidence

# ---------------------------------------------------------------------------
# Native counterpart: rulesets/observability/telemetry-evidence.rules.json
# ADR reference: ADR-0007 (Observability), ADR-0046 (Rollback Triggers)
# Dual-Engine Parity: R-25
#
# Checks structural evidence of observability instrumentation in the satellite.
# Runtime trace/log/metric content is verified by the Phase 5 gate evidence
# (Observability Validation artifact). These OPA checks verify that the
# required instrumentation packages are present in the satellite's dependencies.
# ---------------------------------------------------------------------------

import rego.v1

# ---------------------------------------------------------------------------
# Helpers: combined dependency map
# ---------------------------------------------------------------------------

# GT-347: define all_deps as a SET of dependency names. As a partial object
# (`all_deps[pkg] if`) it compiled to {dep: true}, so `some pkg in all_deps`
# iterated boolean values and broke startswith(pkg, ...). `contains` yields the
# name strings while `all_deps["x"]` membership checks still work.
all_deps contains pkg if {
	input.satellite.packageJson.dependencies[pkg]
}

all_deps contains pkg if {
	input.satellite.packageJson.devDependencies[pkg]
}

# ---------------------------------------------------------------------------
# OBS-EVD-01: Production paths must emit distributed trace context
# Satisfied by: @opentelemetry/* packages, DataDog (dd-trace), Elastic APM
# ---------------------------------------------------------------------------

has_tracing if {
	some pkg in all_deps
	startswith(pkg, "@opentelemetry/")
}

has_tracing if {
	all_deps["dd-trace"]
}

has_tracing if {
	all_deps["elastic-apm-node"]
}

violations contains {"id": "OBS-EVD-01", "message": "Production request paths must emit TraceId, SpanId, and CorrelationId. No distributed tracing package (@opentelemetry/*, dd-trace, elastic-apm-node) detected in satellite dependencies."} if {
	not has_tracing
}

# ---------------------------------------------------------------------------
# OBS-EVD-02: Structured logs must carry request correlation fields
# Satisfied by: pino, winston, bunyan, or @nestjs/common (Logger)
# ---------------------------------------------------------------------------

has_structured_logging if {
	all_deps.pino
}

has_structured_logging if {
	all_deps.winston
}

has_structured_logging if {
	all_deps.bunyan
}

has_structured_logging if {
	all_deps["@nestjs/common"]
}

violations contains {"id": "OBS-EVD-02", "message": "Structured logs must include request correlation fields and avoid raw PII. No structured logging package (pino, winston, bunyan, @nestjs/common) detected in satellite dependencies."} if {
	not has_structured_logging
}

# ---------------------------------------------------------------------------
# OBS-EVD-03: Service health metrics must be reported
# Satisfied by: prom-client or @opentelemetry/* (covers metrics API)
# ---------------------------------------------------------------------------

has_health_metrics if {
	all_deps["prom-client"]
}

has_health_metrics if {
	some pkg in all_deps
	startswith(pkg, "@opentelemetry/")
}

violations contains {"id": "OBS-EVD-03", "message": "Production services must report error rate, latency percentile, throughput, and availability metrics. No metrics package (prom-client, @opentelemetry/*) detected in satellite dependencies."} if {
	not has_health_metrics
}

# ---------------------------------------------------------------------------
# OBS-EVD-04: Phase 5 gate evidence SHOULD reference an observability dashboard
# Non-blocking — uses input.satellite.scorecards.observabilityOperational
# which is populated by the OPA input builder when observability evidence
# is present in the satellite's .harness/evidence directory.
# ---------------------------------------------------------------------------

violations contains {"id": "OBS-EVD-04", "message": "Phase 5 gate evidence SHOULD reference the dashboard or query used to verify nominal monitoring (observabilityOperational not declared in satellite scorecards)."} if {
	not input.satellite.scorecards.observabilityOperational
}
