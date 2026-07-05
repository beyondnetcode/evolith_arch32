package evolith.governance.architecture_planning

test_rejected_missing_technical_scope {
    sdlc_mode == "rejected" with input as {
        "scope": {
            "functional": "Add login"
        }
    }
}

test_rejected_missing_functional_scope {
    sdlc_mode == "rejected" with input as {
        "scope": {
            "technical": "Add DB table"
        }
    }
}

test_full_mode_high_criticality {
    sdlc_mode == "full" with input as {
        "scope": {
            "functional": "Add login",
            "technical": "Add DB table"
        },
        "risk_assessment": {
            "criticality": "high",
            "security_risks": []
        }
    }
    required_approvals == {"architecture_lead", "security_officer"} with input as {
        "scope": {
            "functional": "Add login",
            "technical": "Add DB table"
        },
        "risk_assessment": {
            "criticality": "high",
            "security_risks": []
        }
    }
}

test_full_mode_with_security_risks {
    sdlc_mode == "full" with input as {
        "scope": {
            "functional": "Add login",
            "technical": "Add DB table"
        },
        "risk_assessment": {
            "criticality": "low",
            "security_risks": ["Auth bypass risk"]
        }
    }
}

test_tailored_mode_medium_complexity {
    sdlc_mode == "tailored" with input as {
        "scope": {
            "functional": "Add login",
            "technical": "Add DB table"
        },
        "risk_assessment": {
            "criticality": "medium",
            "complexity": "medium",
            "security_risks": []
        }
    }
    required_approvals == {"architecture_lead"} with input as {
        "scope": {
            "functional": "Add login",
            "technical": "Add DB table"
        },
        "risk_assessment": {
            "criticality": "medium",
            "complexity": "medium",
            "security_risks": []
        }
    }
}

test_minimal_mode_low_complexity {
    sdlc_mode == "minimal" with input as {
        "scope": {
            "functional": "Fix typo",
            "technical": "Change text in UI"
        },
        "risk_assessment": {
            "criticality": "low",
            "complexity": "low",
            "security_risks": []
        }
    }
    count(required_approvals) == 0 with input as {
        "scope": {
            "functional": "Fix typo",
            "technical": "Change text in UI"
        },
        "risk_assessment": {
            "criticality": "low",
            "complexity": "low",
            "security_risks": []
        }
    }
}
