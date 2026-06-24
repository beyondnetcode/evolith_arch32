package evolith.gitflow_branching

violations[{"id": "GIT-01", "message": "Branch name does not follow pattern: type/ticket-id-description"}] {
    input.satellite.git.branchNameInvalid
}

violations[{"id": "GIT-02", "message": "Direct push to protected branch detected — all changes must come through PRs"}] {
    input.satellite.git.directPushToProtectedBranch
}

violations[{"id": "GIT-03", "message": "PR merged without minimum 1 approved review"}] {
    not input.satellite.git.prHasMinimumReview
}

violations[{"id": "GIT-04", "message": "Release tag does not follow semver format v{major}.{minor}.{patch}"}] {
    input.satellite.git.releaseTagInvalid
}

violations[{"id": "GIT-08", "message": "Commit message does not follow Conventional Commits format"}] {
    input.satellite.git.commitMessageInvalid
}

violations[{"id": "GIT-09", "message": "Environment promotion does not follow develop→qa→uat→main sequence"}] {
    input.satellite.git.promotionSequenceInvalid
}

violations[{"id": "GIT-10", "message": "PR into qa/uat/main/release/hotfix without minimum 2 approvals"}] {
    not input.satellite.git.higherEnvPrHasTwoApprovals
}
