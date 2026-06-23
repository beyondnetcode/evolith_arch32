package evolith.engineering_manifesto

violations[{"id": "EM-S-01", "message": msg}] {
    input.classLineCount > 200
    msg := sprintf("Class exceeds 200 lines (%d lines found)", [input.classLineCount])
}

violations[{"id": "EM-S-03", "message": msg}] {
    input.liskovViolations > 0
    msg := sprintf("Liskov Substitution violations detected (%d found)", [input.liskovViolations])
}

violations[{"id": "EM-S-05", "message": "Domain layer must not import Infrastructure layer"}] {
    input.domainImportsInfrastructure
}

violations[{"id": "EM-K-01", "message": msg}] {
    input.maxCyclomaticComplexity > 15
    msg := sprintf("Cyclomatic complexity exceeds 15 (found %d)", [input.maxCyclomaticComplexity])
}

violations[{"id": "AP-01", "message": msg}] {
    input.classLineCount > 500
    msg := sprintf("God class detected: %d lines exceeds 500-line threshold", [input.classLineCount])
}

violations[{"id": "AP-01", "message": msg}] {
    input.classMethodCount > 20
    msg := sprintf("God class detected: %d methods exceeds 20-method threshold", [input.classMethodCount])
}

violations[{"id": "AP-02", "message": "Circular dependency detected"}] {
    input.circularDependencies
}

violations[{"id": "AP-05", "message": msg}] {
    input.magicNumbersCount > 0
    msg := sprintf("Magic numbers detected (%d found)", [input.magicNumbersCount])
}
