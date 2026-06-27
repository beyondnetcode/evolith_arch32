package evolith.engineering_manifesto_test

import data.evolith.engineering_manifesto

test_compliant_code_has_no_violations {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    count(violations) == 0
}

test_class_exceeding_200_lines_is_violation {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 250,
        "classMethodCount": 10,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "EM-S-01"
}

test_liskov_violations_detected {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 2,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "EM-S-03"
}

test_domain_imports_infrastructure_is_violation {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 0,
        "domainImportsInfrastructure": true,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "EM-S-05"
}

test_cyclomatic_complexity_exceeds_threshold {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 20,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "EM-K-01"
}

test_god_class_by_line_count {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 600,
        "classMethodCount": 10,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "AP-01"
}

test_god_class_by_method_count {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 300,
        "classMethodCount": 25,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 0
    }
    violations[_].id == "AP-01"
}

test_circular_dependencies_detected {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": true,
        "magicNumbersCount": 0
    }
    violations[_].id == "AP-02"
}

test_magic_numbers_detected {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 100,
        "classMethodCount": 8,
        "liskovViolations": 0,
        "domainImportsInfrastructure": false,
        "maxCyclomaticComplexity": 10,
        "circularDependencies": false,
        "magicNumbersCount": 5
    }
    violations[_].id == "AP-05"
}

test_all_violations_detected {
    violations := engineering_manifesto.violations with input as {
        "classLineCount": 600,
        "classMethodCount": 25,
        "liskovViolations": 3,
        "domainImportsInfrastructure": true,
        "maxCyclomaticComplexity": 25,
        "circularDependencies": true,
        "magicNumbersCount": 10
    }
    count(violations) >= 5
}
