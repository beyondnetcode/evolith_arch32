package evolith.gitflow_branching

import rego.v1

violations contains {"id": "GIT-01", "message": "Branch name does not follow pattern: type/ticket-id-description"} if {
	input.satellite.git.branchNameInvalid
}

violations contains {"id": "GIT-02", "message": "Direct push to protected branch detected — all changes must come through PRs"} if {
	input.satellite.git.directPushToProtectedBranch
}

violations contains {"id": "GIT-03", "message": "PR merged without minimum 1 approved review"} if {
	not input.satellite.git.prHasMinimumReview
}

violations contains {"id": "GIT-04", "message": "Release tag does not follow semver format v{major}.{minor}.{patch}"} if {
	input.satellite.git.releaseTagInvalid
}

violations contains {"id": "GIT-05", "message": "Feature branches must merge via squash or rebase — merge commits that clutter history with intermediary commits are not allowed on protected branches"} if {
	input.satellite.git.featureBranchMergeNotSquashOrRebase
}

violations contains {"id": "GIT-06", "message": "Hotfix branch not following expedited merge path — hotfix/* must merge directly to main and back-merge to develop within the release cycle"} if {
	input.satellite.git.hotfixNotExpeditedPath
}

violations contains {"id": "GIT-07", "message": "Stale branch not deleted after merge — branches merged more than 7 days ago must be removed from remote"} if {
	input.satellite.git.hasStaleBranchesAfterMerge
}

violations contains {"id": "GIT-08", "message": "Commit message does not follow Conventional Commits format"} if {
	input.satellite.git.commitMessageInvalid
}

violations contains {"id": "GIT-09", "message": "Environment promotion does not follow develop→qa→uat→main sequence"} if {
	input.satellite.git.promotionSequenceInvalid
}

violations contains {"id": "GIT-10", "message": "PR into qa/uat/main/release/hotfix without minimum 2 approvals"} if {
	not input.satellite.git.higherEnvPrHasTwoApprovals
}
