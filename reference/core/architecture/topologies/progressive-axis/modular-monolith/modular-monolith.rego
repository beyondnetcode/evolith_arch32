package evolith.topologies.modular_monolith

import rego.v1

import data.evolith.utils

# ---------------------------------------------------------------------------
# Evolith Architecture Validation Rules
# Phase: Modular Monolith (Modular Monolith)
# ---------------------------------------------------------------------------

violations contains {"id": "MM-R01", "severity": "MUST", "title": "Single Deployment Unit", "blocking": true, "msg": msg} if {
	input.satellite.packageJson.workspaces
	msg := "Monorepo workspace detected. All modules MUST compile into a single assembly/container image (MM-R01)."
}

violations contains {"id": "MM-R02", "severity": "MUST", "title": "Explicit Bounded Context Boundaries", "blocking": true, "msg": msg} if {
	count(input.satellite.directories) < 2
	msg := "Found less than 2 modules in src/ (MM-R02)."
}

violations contains {"id": "MM-R03", "severity": "MUST", "title": "Ports and Adapters Boundary", "blocking": true, "msg": msg} if {
	# Logic would verify domain layer dependencies - simplified via dir check as in Native
	not has_ports_dir(input.satellite.directories)
	msg := "No ports directory found (expected: src/ports or src/application/ports) (MM-R03)."
}

has_ports_dir(dirs) if {
	dirs[_] == "ports"
}

has_ports_dir(dirs) if {
	dirs[_] == "Ports"
}

violations contains {"id": "MM-R04", "severity": "MUST", "title": "Inter-Context Communication via Ports", "blocking": true, "msg": msg} if {
	input.satellite.hasContracts == false
	msg := "No contracts/ directory found for inter-module contracts (MM-R04)."
}

violations contains {"id": "MM-R05", "severity": "MUST", "title": "No Shared Database Across Bounded Contexts", "blocking": true, "msg": msg} if {
	input.satellite.hasAcl == false
	msg := "No acl/ directory found (should contain one subdirectory per bounded context) (MM-R05)."
}

violations contains {"id": "MM-R06", "severity": "MUST", "title": "Async Events Use Domain Events", "blocking": false, "msg": msg} if {
	input.satellite.hasEvents == false
	msg := "No events directory found (MM-R06)."
}

violations contains {"id": "MM-R07", "severity": "MUST", "title": "Maintain Extraction Readiness Score", "blocking": false, "msg": msg} if {
	# Logic would verify core/ADR-0045 score documentation
	# We skip full doc check in Rego, Native does it better, but for parity:
	not input.satellite.hasExtractionReadiness
	msg := "No extraction-readiness.md found in docs/ (MM-R07)."
}

violations contains {"id": "MM-R08", "severity": "MUST", "title": "Observability Instrumentation", "blocking": false, "msg": msg} if {
	not input.satellite.hasOtel
	msg := "No OpenTelemetry instrumentation found (MM-R08)."
}

# ---------------------------------------------------------------------------
# New Architectural Harness Rules (CLI Refactoring Standards)
# ---------------------------------------------------------------------------

# MM-R09: Strict Dependency Inversion Principle (DIP)
violations contains {"id": "MM-R09", "severity": "MUST", "title": "Strict Dependency Inversion Principle (DIP)", "blocking": true, "msg": msg} if {
	some i
	file := input.satellite.sourceFiles[i]

	# Exclude DI container setup files or tests
	not contains(file.path, ".spec.ts")
	not contains(file.path, ".test.ts")
	not contains(file.path, "app.module.ts")
	not contains(file.path, "registry.ts")

	# Use AST metadata provided by OpaInputBuilder
	file.hasManualInstantiation == true

	msg := sprintf("Manual instantiation of services detected in %s. Use Dependency Injection instead (MM-R09).", [file.path])
}

# MM-R10: AST-Based Code Analysis Mandatory
violations contains {"id": "MM-R10", "severity": "MUST", "title": "AST-Based Code Analysis Mandatory", "blocking": true, "msg": msg} if {
	some i
	file := input.satellite.sourceFiles[i]

	# If the file is part of an analyzer or validator
	contains(file.path, "analyzer")
	not contains(file.path, ".spec.ts")

	# Check metadata provided by OpaInputBuilder
	file.hasAstImport == false
	file.usesRegexForCode == true

	msg := sprintf("Static analysis tool %s appears to use Regex instead of an AST parser like 'typescript' (MM-R10).", [file.path])
}

# MM-R11: Strict UI and Logic Isolation (SoC)
violations contains {"id": "MM-R11", "severity": "MUST", "title": "Strict UI and Logic Isolation (SoC)", "blocking": true, "msg": msg} if {
	some i
	file := input.satellite.sourceFiles[i]

	# Ensure domain and application layers do not import UI or CLI tools
	is_logic_layer(file.path)

	file.hasUiImport == true

	msg := sprintf("UI/CLI library imported in application or domain logic layer %s (MM-R11).", [file.path])
}

is_logic_layer(path) if {
	contains(path, "/domain/")
}

is_logic_layer(path) if {
	contains(path, "/application/")
}

is_logic_layer(path) if {
	contains(path, "/use-cases/")
}

# MM-R12: Pure Domain Model (Data Mapper Enforcement) - Recommendation
violations contains {"id": "MM-R12", "severity": "SHOULD", "title": "Pure Domain Model (Data Mapper Enforcement)", "blocking": false, "msg": msg} if {
	some i
	file := input.satellite.sourceFiles[i]

	contains(file.path, "/domain/")
	not contains(file.path, ".spec.ts")
	not contains(file.path, ".test.ts")

	file.hasPersistenceImport == true

	msg := sprintf("[RECOMMENDATION] Persistence import detected in domain file %s. Consider using Data Mapper (MM-R12).", [file.path])
}
