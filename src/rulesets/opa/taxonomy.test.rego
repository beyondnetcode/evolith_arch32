package evolith.taxonomy_test

import data.evolith.taxonomy

test_core_with_all_required_dirs_has_no_violations {
  violations := taxonomy.violations with input as {"core": {"directories": ["reference", "rulesets", "sdk", ".harness"], "adrs": ["0001-monorepo-orchestration-principle.md", "0001-monorepo-orchestration-principle.es.md"]}, "satellitePath": "/core", "satellite": {"directories": ["src", "tests", "docs"], "files": [], "packageJson": {}}}
  count(violations) == 0
}

test_missing_top_level_dirs_is_rejected {
  violations := taxonomy.violations with input as {"core": {"directories": ["reference", "sdk"], "adrs": []}, "satellitePath": "/core", "satellite": {"directories": [], "files": [], "packageJson": null}}
  violations[_].id == "TAX-05"
}

test_satellite_missing_standard_dirs_is_rejected {
  violations := taxonomy.violations with input as {"core": {"directories": ["reference", "rulesets", "sdk", ".harness"], "adrs": []}, "satellitePath": "/satellite", "corePath": "/core", "satellite": {"directories": ["src"], "files": [], "packageJson": {}}}
  violations[_].id == "TAX-06"
}

test_root_topologies_dir_is_rejected {
  violations := taxonomy.violations with input as {"core": {"directories": ["reference", "rulesets", "sdk", ".harness", "topologies"], "adrs": []}, "satellitePath": "/core", "satellite": {"directories": [], "files": [], "packageJson": null}}
  violations[_].id == "TAX-11"
}

test_adr_missing_bilingual_pair_is_rejected {
  violations := taxonomy.violations with input as {"core": {"directories": ["reference", "rulesets", "sdk", ".harness"], "adrs": ["0001-monorepo-orchestration-principle.md", "reference/architecture/adrs/core/0079-multi-topology-reference-corpus.md"]}, "satellitePath": "/core", "satellite": {"directories": [], "files": [], "packageJson": null}}
  violations[_].id == "TAX-08"
}
