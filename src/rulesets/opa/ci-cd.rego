package evolith.ci_cd

import rego.v1

violations contains {"id": "DEP-04", "message": "package-lock.json not found at project or workspace root"} if {
	not input.satellite.hasPackageLock
	not input.core.hasPackageLock
}

workflows_with_ci := [name | content := input.satellite.workflows[name]; contains(content, "npm ci")]

violations contains {"id": "DEP-05", "message": "No .github/workflows directory found"} if {
	count(input.satellite.workflows) == 0
}

violations contains {"id": "DEP-05", "message": "CI workflow does not use \"npm ci\""} if {
	count(input.satellite.workflows) > 0
	count(workflows_with_ci) == 0
}

workflows_with_audit := [name | content := input.satellite.workflows[name]; contains(content, "npm audit")]

violations contains {"id": "DEP-06", "message": "No .github/workflows directory found"} if {
	count(input.satellite.workflows) == 0
}

violations contains {"id": "DEP-06", "message": "CI workflow does not run \"npm audit\""} if {
	count(input.satellite.workflows) > 0
	count(workflows_with_audit) == 0
}

violations contains {"id": "DEP-07", "message": "No .github/workflows directory found"} if {
	count(input.satellite.workflows) == 0
}

violations contains {"id": "DEP-07", "message": "CI workflow does not run \"npm audit\""} if {
	count(input.satellite.workflows) > 0
	count(workflows_with_audit) == 0
}

violations contains {"id": "DEP-09", "message": "No .github/dependabot.yml or .renovaterc.json found"} if {
	not input.satellite.hasDependabot
	not input.satellite.hasRenovate
	not input.core.hasDependabot
}
