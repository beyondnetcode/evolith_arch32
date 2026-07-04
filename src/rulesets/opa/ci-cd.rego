package evolith.ci_cd

violations[{"id": "DEP-04", "message": "package-lock.json not found at project or workspace root"}] {
    not input.satellite.hasPackageLock
    not input.core.hasPackageLock
}

workflows_with_ci := [name | content := input.satellite.workflows[name]; contains(content, "npm ci")]
violations[{"id": "DEP-05", "message": "No .github/workflows directory found"}] {
    count(input.satellite.workflows) == 0
}

violations[{"id": "DEP-05", "message": "CI workflow does not use \"npm ci\""}] {
    count(input.satellite.workflows) > 0
    count(workflows_with_ci) == 0
}

workflows_with_audit := [name | content := input.satellite.workflows[name]; contains(content, "npm audit")]
violations[{"id": "DEP-06", "message": "No .github/workflows directory found"}] {
    count(input.satellite.workflows) == 0
}

violations[{"id": "DEP-06", "message": "CI workflow does not run \"npm audit\""}] {
    count(input.satellite.workflows) > 0
    count(workflows_with_audit) == 0
}

violations[{"id": "DEP-07", "message": "No .github/workflows directory found"}] {
    count(input.satellite.workflows) == 0
}

violations[{"id": "DEP-07", "message": "CI workflow does not run \"npm audit\""}] {
    count(input.satellite.workflows) > 0
    count(workflows_with_audit) == 0
}

violations[{"id": "DEP-09", "message": "No .github/dependabot.yml or .renovaterc.json found"}] {
    not input.satellite.hasDependabot
    not input.satellite.hasRenovate
    not input.core.hasDependabot
}
