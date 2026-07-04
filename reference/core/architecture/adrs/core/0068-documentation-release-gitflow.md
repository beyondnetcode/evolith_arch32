# ADR-0068: Documentation Release GitFlow

## Status
Proposed

## Date
2026-05-29

## Context
Evolith Arch32 and UMS both produce bilingual (EN/ES) technical documentation. Both repositories follow ADR-0050 (Gitflow Branching Strategy) for code, but documentation release workflows are undefined. Without a structured approach, documentation drifts from code releases, bilingual parity breaks, and critical fixes cannot be expedited independently from feature work.

## Decision

We will adopt **Documentation Release GitFlow** as the mandatory release workflow for both Evolith Arch32 and UMS repositories. This extends ADR-0050 with documentation-specific branch naming, quality gates, and release tagging conventions.

---

## 1. Branch Model for Documentation

### Branch Types

| Branch | Purpose | Lifetime | Base Branch | Merge Target |
|--------|---------|----------|-------------|--------------|
| `main` | Production-ready documentation snapshot | Permanent | — | — |
| `develop` | Integration branch for next release candidate | Permanent | — | `main` (via release) |
| `feature/docs-*` | New documentation content or major rewrites | Until PR merged | `develop` | `develop` |
| `release/docs-vX.Y.Z` | Release stabilization (bug fixes only) | 2-4 weeks | `develop` | `main` + `develop` |
| `hotfix/docs-*` | Critical production documentation fixes | Until PR merged | `main` | `main` + `develop` |

### When to Use Each Branch Type

#### `main`
- Contains the authoritative, production-visible documentation at all times
- Only updated via release branches or hotfix branches
- No direct commits allowed
- Every commit to `main` must be tagged

#### `develop`
- Default branch for all documentation work
- Contains work-in-progress content for the next release
- All `feature/docs-*` branches merge here first
- Triggers `docs-validate-all` CI on every push

#### `feature/docs-*`
Use for:
- Adding new documentation files (e.g., `feature/docs-add-api-v2-reference`)
- Major rewrites of existing documentation sections
- Bilingual translation updates (EN + ES must be in same PR)
- New ADR proposals

Do NOT use for:
- Fixing typos in production docs (use `hotfix/docs-*` from `main`)
- Adding single-file corrections (PR directly to `develop` allowed for minor fixes)

Naming: `feature/docs-<short-description>` (e.g., `feature/docs-add-observability-playbook`)

#### `release/docs-vX.Y.Z`
Use when:
- `develop` has reached feature freeze for a release
- Documentation is ready for production validation
- Only bug fixes, link corrections, and diagram fixes allowed here
- No new content or structural changes

Naming: `release/docs-v<major>.<minor>.<patch>` (e.g., `release/docs-v1.2.0`)

#### `hotfix/docs-*`
Use for:
- Fixing broken links in production documentation
- Correcting critical technical errors that mislead readers
- Fixing broken Mermaid diagrams
- Bilingual parity corrections (ES must match EN structure)
- ADR number conflict resolution

Naming: `hotfix/docs-<issue-description>` (e.g., `hotfix/docs-fix-broken-api-links`)

---

## 2. Pull Request Requirements

### Mandatory PR Workflow
Every documentation change MUST go through a Pull Request:

1. **Create PR** from `feature/docs-*` or `hotfix/docs-*` to target branch
2. **PR Description** must include:
   - Summary of changes
   - Affected files list
   - Bilingual impact assessment (are both EN/ES updated?)
   - Related ADR numbers if applicable
3. **CI Checks** must pass (see Section 4)
4. **Approvals** required (see Section 3)
5. **Merge** via squash merge to maintain clean history

### PR Size Limits
- Maximum 20 files per PR for documentation changes
- Larger changes must be split into multiple PRs
- Rationale: Smaller PRs are faster to review and reduce risk of bilingual parity breakage

### Bilingual PR Requirements
- If PR modifies an EN file that has an ES counterpart, ES must be updated in the same PR
- PR description must state: "Bilingual parity: maintained / broken / not applicable"
- If bilingual parity is broken, PR is blocked until ES counterpart is added

---

## 3. Required Approvals Before Merge

| Target Branch | Minimum Approvals | Special Requirements |
|---------------|-------------------|---------------------|
| `develop` | 1 | Reviewer must verify bilingual consistency if files have ES pairs |
| `release/docs-v*` | 2 | One must be a senior technical writer or architect |
| `main` | 2 | Both must be senior contributors; one must verify version log update |
| `hotfix/docs-*` | 1 | Must include justification for bypassing normal workflow |

### Approval Rotation
- Same person cannot be sole approver for consecutive PRs to `main`
- At least one approver must have write access to the target branch

---

## 4. Required GitHub Actions Checks Before Merge

### All Documentation PRs
```
 lint-staged (markdownlint, prettier)
 validate-docs.mjs (links, anchors, encoding, Mermaid syntax)
 check-bilingual-parity.mjs (## and ### header count match)
```

### PRs to `develop`
```
 bilingual-coverage.mjs (must not decrease overall coverage below threshold)
 doc-complexity-score.mjs (must not decrease avg complexity below baseline)
```

### PRs to `release/docs-*`
```
 validate-docs.mjs --render-mermaid (renders diagrams to verify correctness)
 bilingual-cross-ref.mjs (verifies all internal links resolve both EN/ES)
 broken-link-scan (external link verification)
 adr-number-check (ensures no ADR numbering conflicts)
```

### PRs to `main`
```
 All release branch checks
 version-log-update.mjs (must update DOCUMENTATION_VERSIONS.md)
 git-tag-create check (verifies tag format docs-vX.Y.Z)
 coverage-impact.yml bot comment (must show coverage change < 1%)
```

### Hotfix PRs
```
 validate-docs.mjs (links, anchors)
 check-bilingual-parity.mjs (fast track)
 hotfix-justification (inline comment explaining why normal workflow bypassed)
```

---

## 5. Release Candidate Flow: `develop` → `main`

### Normal Release Flow

```
develop (feature freeze declared)
  │
  ├─► Create release/docs-v1.2.0 from develop
  │
  ├─► Run stabilization: fix only what's necessary
  │
  ├─► CI validates on release branch
  │
  ├─► Approvals obtained (2 required)
  │
  ├─► Squash merge release/docs-v1.2.0 → main
  │
  ├─► Tag: docs-v1.2.0
  │
  ├─► GitHub Release created automatically
  │
  └─► Merge back to develop (automatic via GitFlow)
```

### Release Branch Decisions

| Scenario | Action |
|----------|--------|
| `develop` has all desired content | Create release branch |
| Bug found on release branch | Fix on release branch, merge to both |
| Major issue found on release branch | Abort release, fix in `develop`, restart |
| Hotfix needed during release | Hotfix from `main`, cherry-pick to release |

### Release Freeze Windows
- No new content allowed on release branch after feature freeze
- Release branch can receive fixes for 2 weeks maximum
- After 2 weeks without release, branch is abandoned and new release started

---

## 6. Version Tagging Convention

### Tag Format
```
docs-v<major>.<minor>.<patch>
```

### Version Number Rules

| Increment | When to Use | Example |
|-----------|-------------|---------|
| **Major** (`X.0.0`) | Breaking changes to documentation structure, renamed sections that break links, ADR renumbering | `docs-v2.0.0` |
| **Minor** (`X.Y.0`) | New documentation sections, new ADRs, new architecture areas | `docs-v1.3.0` |
| **Patch** (`X.Y.Z`) | Bug fixes, link corrections, diagram fixes, typo corrections | `docs-v1.2.1` |

### Tag Creation Process
1. Release branch merged to `main`
2. GitHub Actions automatically:
   - Creates tag `docs-vX.Y.Z` on the merge commit
   - Creates GitHub Release with auto-generated changelog
   - Updates `DOCUMENTATION_VERSIONS.md`

### Existing Tags
```
docs-v1.0.0  Initial production documentation
docs-v1.1.0  Added API standards and ADR-0030 through ADR-0040
docs-v1.1.1  Hotfix: Fixed broken links in architecture-communication-strategy
```

---

## 7. Documentation Version Log

### File: `DOCUMENTATION_VERSIONS.md`

Maintained at repository root. Updated automatically via CI on every release to `main`.

```markdown
# Documentation Version Log

## Production Releases

| Version | Date | Branch | Key Changes | Hotfixes |
|---------|------|--------|-------------|----------|
| docs-v1.2.0 | 2026-05-29 | release/docs-v1.2.0 | Added observability playbook, updated API standards | — |
| docs-v1.1.1 | 2026-05-15 | hotfix/docs-fix-api-links | Fixed broken API reference links | 3 |
| docs-v1.1.0 | 2026-05-01 | release/docs-v1.1.0 | Added contract testing guidelines | — |
| docs-v1.0.0 | 2026-04-15 | release/docs-v1.0.0 | Initial production release | 2 |

## Upcoming (from develop)

| Target Version | Planned Date | In Progress |
|----------------|--------------|-------------|
| docs-v1.3.0 | 2026-06-15 | feature/docs-add-security-section |

## Version Policy

- **Major**: Breaking structural changes, renamed sections, ADR renumbering
- **Minor**: New documentation sections, new ADRs, new architecture areas
- **Patch**: Bug fixes, link corrections, diagram fixes, typos

See [ADR-0068](./0068-documentation-release-gitflow.md) for full policy.
```

### CI Integration for Version Log
GitHub Actions workflow `.github/workflows/docs-release.yml` automatically:
1. Detects merge to `main` from release or hotfix branch
2. Extracts version from branch name
3. Appends entry to `DOCUMENTATION_VERSIONS.md`
4. Creates Git tag if not exists
5. Creates GitHub Release

---

## 8. Hotfix Policy for Critical Documentation Errors

### When to Use Hotfix Branch

| Issue Type | Use Hotfix? | Alternative |
|------------|-------------|-------------|
| Broken links in production docs | Yes | — |
| Wrong technical information misleading readers | Yes | — |
| Broken Mermaid diagram | Yes | — |
| ADR number conflict | Yes | — |
| Bilingual parity broken | Yes | — |
| Single typo correction | No | PR directly to `main` if critical |
| New documentation section | No | `feature/docs-*` to `develop` |

### Hotfix Workflow

```
Issue reported: "Broken links in ADR-0050"
  │
  ├─► Branch from main: hotfix/docs-fix-adr-0050-links
  │
  ├─► Fix: Update links, fix any ES parity issues
  │
  ├─► PR: hotfix/docs-fix-adr-0050-links → main
  │
  ├─► CI: validate-docs.mjs, check-bilingual-parity.mjs
  │
  ├─► Approval: 1 required (with justification)
  │
  ├─► Merge: Squash into main
  │
  ├─► Tag: docs-v1.2.1 (patch increment)
  │
  └─► Merge: hotfix branch → develop (automatic via GitFlow)
```

### Hotfix Justification Required
PR description must include:
```markdown
## Hotfix Justification

**Issue**: [Brief description of the problem]
**Impact**: [Who is affected and how]
**Why bypass normal workflow**: [Emergency rationale]
**Prevention**: [How to prevent this in the future]
```

### Hotfix SLA
- Hotfix PRs should be reviewed within 4 hours of submission
- Hotfixes should not stay open more than 24 hours

---

## 9. Evolith and UMS Documentation Alignment

### Aligned Elements

| Element | Evolith Arch32 | UMS |
|---------|----------------|-----|
| GitFlow Branch Model | [CHECKMARK] Same | [CHECKMARK] Same |
| Version Tag Format | `docs-vX.Y.Z` | `docs-vX.Y.Z` |
| Version Log File | `DOCUMENTATION_VERSIONS.md` | `DOCUMENTATION_VERSIONS.md` |
| CI Validation Scripts | `.harness/scripts/ci/01-validate-docs.mjs` | Inherited via child-repository |
| Bilingual Parity Check | `.harness/scripts/ci/04-check-bilingual-parity.mjs` | Inherited |
| PR Template | `.github/PULL_REQUEST_TEMPLATE/docs-template.md` | Inherited |
| Required Checks | Same | Same |
| Approval Requirements | Same | Same |

### Aligned via Inheritance
UMS (as a child repository per ADR-0025 and child-repository-inheritance-guide) inherits:
1. `.github/workflows/docs.yml` — CI pipeline
2. `.github/PULL_REQUEST_TEMPLATE/` — PR templates
3. `.harness/scripts/` — validation tooling
4. This ADR (as local copy in `reference/core/architecture/adrs/`)

### Version Synchronization
- When Evolith releases `docs-v1.3.0`, UMS should sync within 2 weeks
- UMS documentation lead is responsible for syncing Evolith changes
- UMS may have `docs-v1.3.0-UMS-extensions` suffix for UMS-specific docs beyond Evolith scope

### Conflict Resolution
- If UMS needs documentation changes not in Evolith, propose as ADR in Evolith first
- If Evolith rejects the proposal, UMS may maintain delta in `ums-specific/` subdirectory
- UMS-specific documentation must still follow GitFlow and bilingual parity rules

---

## 10. Mandatory vs. Adapted Per Repository

### Decision: **Mandatory with Maturity Adaptation**

| Repository | GitFlow Model | Adaptation Allowed |
|------------|---------------|-------------------|
| **Evolith Arch32** (corporate reference) | Full GitFlow | None — this is the source of truth |
| **UMS** (applied product) | Full GitFlow | Minor: release cadence may differ |
| **Future satellite repos** | Full GitFlow | Must follow exactly until maturity Level 3 |

### Maturity Adaptation Rules

**Level 1 (Initial) Repositories**:
- May skip `develop` branch if only one person contributing
- Must still use `main` for production
- Must still use `feature/docs-*` for new content
- Hotfix still required

**Level 2 (Growing) Repositories**:
- Must use `develop` branch
- Must have at least 1 approval
- CI checks still mandatory

**Level 3 (Mature) Repositories**:
- Full GitFlow required
- All quality gates active
- Synchronization with Evolith required

---

## 11. Branch Protection Rules

### `main` Protection
```
 Require pull request reviews before merging
  - Required reviewers: 2
  - Dismiss stale reviews: yes
  - Require review from code owners: yes

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required
  - docs-release.yml: required

 Require branches to be up to date before merging: yes

 Restrict who can push to main: maintainers only

 Allow force pushes: NO
```

### `develop` Protection
```
 Require pull request reviews before merging
  - Required reviewers: 1
  - Dismiss stale reviews: yes

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required

 Require branches to be up to date before merging: yes

 Allow force pushes: NO (except for rebasing feature branches)
```

### `release/docs-*` Protection
```
 Require pull request reviews before merging
  - Required reviewers: 2
  - One must be senior technical writer or architect

 Require status checks to pass before merging
  - All release checks required

 Require branches to be up to date before merging: yes

 Restrict who can create release branches: maintainers

 Allow force pushes: NO
```

### `hotfix/docs-*` Protection
```
 Require pull request reviews before merging
  - Required reviewers: 1
  - Must include hotfix justification

 Require status checks to pass before merging
  - validate-docs.mjs: required
  - check-bilingual-parity.mjs: required

 Allow force pushes: NO
```

---

## 12. Integration with Documentation QA Pipeline

### GitHub Actions Workflow: `.github/workflows/docs.yml`

```yaml
name: Documentation CI

on:
  push:
    branches: [main, develop, 'release/docs-*']
  pull_request:
    branches: [main, develop, 'release/docs-*', 'hotfix/docs-*']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Validate Documentation
        run: node .harness/scripts/ci/01-validate-docs.mjs
        
      - name: Check Bilingual Parity
        run: node .harness/scripts/ci/04-check-bilingual-parity.mjs
        
      - name: Bilingual Coverage
        if: github.ref == 'refs/heads/develop'
        run: node .harness/scripts/bilingual-coverage.mjs

  release-check:
    if: github.ref == 'refs/heads/main'
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - name: Verify Version Log Update
        run: node .harness/scripts/verify-version-log.mjs
        
      - name: Verify Git Tag
        run: node .harness/scripts/verify-git-tag.mjs
```

### Required Scripts in QA Pipeline

| Script | Purpose | Fails Build If |
|--------|---------|----------------|
| `validate-docs.mjs` | Links, anchors, encoding, Mermaid | Any broken element |
| `check-bilingual-parity.mjs` | EN/ES header structure match | Header count mismatch |
| `bilingual-coverage.mjs` | Coverage report | Coverage drops > 5% |
| `doc-complexity-score.mjs` | Complexity trending | Complexity drops > 10% |
| `bilingual-cross-ref.mjs` | Link reciprocity | Broken EN↔ES links |
| `verify-version-log.mjs` | Version log updated | Missing entry for release |
| `verify-git-tag.mjs` | Tag format correct | Invalid tag format |

---

## Consequences

### Positive
- Documentation releases become predictable and traceable
- Critical fixes can be expedited without blocking feature work
- Bilingual parity is structurally enforced through CI
- Version history is always aligned with Git tags
- Evolith and UMS stay synchronized

### Negative
- Additional branch management overhead
- Requires discipline to follow hotfix workflow
- CI pipeline takes longer to run all checks

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hotfix bypasses bilingual check | CI still runs on hotfix PR, cannot be skipped |
| Version log forgotten | Automated in CI, cannot merge without it |
| ADR numbering conflicts | `adr-number-check` in CI blocks merge |
| Release branch lives too long | 2-week maximum, abandoned if exceeded |

---

## References

- [ADR-0050: Gitflow Branching Strategy](./0050-gitflow-branching-strategy.md)
- [SDLC Documentation Best Practices](../../../sdlc/03-documentation/sdlc-documentation-best-practices.md)
- [Child Repository Inheritance Guide](../../../sdlc/standards/onboarding/child-repository-inheritance-guide.md)
- [Bilingual Terminology Glossary](../../../../.harness/scripts/bilingual-terminology-glossary.md)

---

## Glossary

| Term | Definition |
|------|------------|
| **Feature Freeze** | Point after which no new content may be added to a release branch |
| **Patch Release** | Bug fix only release (X.Y.Z increment) |
| **Minor Release** | New content addition release (X.Y.0 increment) |
| **Major Release** | Breaking structural change release (X.0.0 increment) |
| **Bilingual Parity** | EN and ES files have identical ## and ### header counts |





## Objective and Scope

Historical backfill: Address the architectural tension where evolith Arch32 and UMS both produce bilingual (EN/ES) technical documentation, establishing a standard boundary.

## Options Considered

- **Selected:** Documentation Release GitFlow
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0050: Gitflow Branching Strategy](./0050-gitflow-branching-strategy.md)
- [SDLC Documentation Best Practices](../../../sdlc/03-documentation/sdlc-documentation-best-practices.md)
- [Child Repository Inheritance Guide](../../../sdlc/standards/onboarding/child-repository-inheritance-guide.md)
- [Bilingual Terminology Glossary](../../../../.harness/scripts/bilingual-terminology-glossary.md)

---
[Back to Index](./README.md)
> **Agent Signature:** Architect Agent
