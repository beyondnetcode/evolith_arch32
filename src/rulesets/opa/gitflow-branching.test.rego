package evolith.gitflow_branching_test

import data.evolith.gitflow_branching

compliant_input := {"satellite": {"git": {
  "branchNameInvalid": false,
  "directPushToProtectedBranch": false,
  "prHasMinimumReview": true,
  "releaseTagInvalid": false,
  "commitMessageInvalid": false,
  "promotionSequenceInvalid": false,
  "higherEnvPrHasTwoApprovals": true,
}}}

test_compliant_gitflow_has_no_violations {
  violations := gitflow_branching.violations with input as compliant_input
  count(violations) == 0
}

test_invalid_branch_name_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/branchNameInvalid", "value": true}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-01"
}

test_direct_push_to_protected_branch_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/directPushToProtectedBranch", "value": true}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-02"
}

test_pr_without_review_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/prHasMinimumReview", "value": false}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-03"
}

test_invalid_release_tag_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/releaseTagInvalid", "value": true}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-04"
}

test_invalid_commit_message_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/commitMessageInvalid", "value": true}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-08"
}

test_invalid_promotion_sequence_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/promotionSequenceInvalid", "value": true}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-09"
}

test_higher_env_pr_without_two_approvals_is_rejected {
  i := json.patch(compliant_input, [{"op": "replace", "path": "/satellite/git/higherEnvPrHasTwoApprovals", "value": false}])
  violations := gitflow_branching.violations with input as i
  violations[_].id == "GIT-10"
}
