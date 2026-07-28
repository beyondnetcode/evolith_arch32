/**
 * GT-623 — Conventional Commits, actually enforced.
 *
 * WHY THIS FILE EXISTS
 * The repository mandates Conventional Commits in three places (`CONTRIBUTING.md`,
 * `.github/pull_request_template.md`, and the `.husky/commit-msg` hook) and had a
 * hook wired to check it — but `commitlint` was in neither `dependencies` nor
 * `devDependencies` and no config existed, so the hook's `else` branch was the only
 * branch that ever ran: it printed "commitlint is not installed — skipping commit
 * message lint" and exited **zero**. Failing open is worse than having no hook,
 * because it manufactures the appearance of enforcement.
 *
 * WHAT THE HISTORY ACTUALLY LOOKS LIKE (measured, not assumed)
 * Over the last 200 non-merge commits every single message already carries a
 * `type(scope): subject` header. The type distribution is:
 *
 *     fix 65 · docs 46 · test 29 · feat 18 · chore 16 · refactor 12 · ci 12 · security 2
 *
 * Everything there is a Conventional Commits type except `security`. The convention
 * is followed in practice; it was simply never enforced. This config is therefore
 * calibrated to ratify existing practice and reject drift, not to relitigate 200
 * commits' worth of style.
 */

/**
 * The `security` type is REAL and DECLARED here on purpose.
 *
 * Two commits in the recent history announce themselves as security changes
 * (`security(fase-7): add Docker/K8s hardening checklist`,
 *  `security(fase-6): add executable security rulesets`). `security` is not a
 * Conventional Commits type, so a tool that derives releases from commit messages
 * does not recognise it — which is exactly how a security change can contribute
 * nothing to a version. See GT-623 and GT-624.
 *
 * The options were: reject the type, or declare it with an explicit meaning.
 * Rejecting it would push authors back to `fix(...)` and lose the signal that a
 * change is security-relevant, so it is declared, with the mapping below.
 *
 * INTENDED VERSION-BUMP MEANING
 *   security -> `patch`, identical to `fix`, and ALWAYS changelog-visible.
 * Under semver a security fix is a bug fix: it must ship and be visible, but it
 * does not by itself signal new API surface, so inflating it to `minor` would send
 * a false compatibility signal. `hidden: false` is the load-bearing half — the
 * failure mode GT-623 describes is a security change that reaches a release
 * *silently*, not one that under-bumps.
 *
 * STATUS OF THIS MAPPING — read before citing it
 * It is DECLARED but not yet CONSUMED. GT-623's evidence states that release-please
 * derives version bumps from these messages "wired into sdk-cli-release.yml and
 * sdk-cli-ci.yml"; that is stale. `release-please-config.json` and
 * `.release-please-manifest.json` were deleted in aed33ba9 ("versioning managed
 * manually") and the release gate in `.github/workflows/sdk-cli-release.yml:70-99`
 * now derives the release from an explicit `v*` tag or a dispatch input. So no tool
 * reads this table today. It is exported rather than left as prose so that whoever
 * re-introduces automated versioning imports a decision instead of re-deriving one.
 *
 * @type {Record<string, { bump: 'major' | 'minor' | 'patch' | 'none', section: string, hidden: boolean }>}
 */
export const versionBumpByType = {
  feat: { bump: 'minor', section: 'Features', hidden: false },
  fix: { bump: 'patch', section: 'Bug Fixes', hidden: false },
  security: { bump: 'patch', section: 'Security Fixes', hidden: false },
  perf: { bump: 'patch', section: 'Performance Improvements', hidden: false },
  revert: { bump: 'patch', section: 'Reverts', hidden: false },
  refactor: { bump: 'none', section: 'Code Refactoring', hidden: true },
  docs: { bump: 'none', section: 'Documentation', hidden: true },
  test: { bump: 'none', section: 'Tests', hidden: true },
  build: { bump: 'none', section: 'Build System', hidden: true },
  ci: { bump: 'none', section: 'Continuous Integration', hidden: true },
  chore: { bump: 'none', section: 'Miscellaneous', hidden: true },
  style: { bump: 'none', section: 'Styles', hidden: true },
};

/**
 * The accepted type list is derived from the bump table above rather than written
 * out twice, so a type can never be lintable-but-unmapped (or mapped-but-unlintable)
 * — that split is the precise shape of the `security` defect this file closes.
 */
export const types = Object.keys(versionBumpByType).sort();

export default {
  extends: ['@commitlint/config-conventional'],

  /**
   * `defaultIgnores` (inherited) already skips merge, revert, fixup and squash
   * autosquash messages, so `git merge` and `git rebase --autosquash` are not
   * broken by this hook. Left at its default deliberately.
   */
  rules: {
    'type-enum': [2, 'always', types],

    /**
     * Relaxed from the config-conventional default of 100, measured: 2 of the last
     * 200 non-merge subjects exceed 100 characters. A hook that fires on subject
     * length teaches authors to reach for `--no-verify`, and once that reflex
     * exists the type check — the part that actually feeds versioning — stops
     * running too. 120 rejects runaway subjects without taxing normal ones.
     */
    'header-max-length': [2, 'always', 120],

    /**
     * DISABLED, deliberately. This repository writes long, evidence-dense commit
     * bodies containing file:line references, URLs and pasted command output; 4 of
     * the last 60 non-merge commits carry body lines over 100 characters, and
     * hard-wrapping evidence damages it. Same reasoning as above: cosmetic rules
     * that block a commit are what get the whole hook bypassed.
     */
    'body-max-line-length': [0, 'always', Infinity],

    /**
     * DISABLED, and this one is measured rather than argued. Running
     * config-conventional unmodified over the last 200 non-merge commits rejects
     * 45 of them — 22.5% — and every single rejection is this one rule. The
     * rejected subjects are not sentence-cased prose; they lead with an acronym or
     * a repository identifier, which commitlint classifies at whole-subject
     * granularity and therefore reads as start-case/upper-case:
     *
     *     docs(board): GT-567 — el VPS de Coolify lleva dias caido...
     *     docs(adr): ADR-0118 — el hub Core tiene taxonomia propia
     *     feat(governance): UP-001 Amendment 1 — board column schema
     *     fix(mcp,cli): MCP alineado con la CLI...
     *     feat(core-domain): PatternCatalogService — one shared reader
     *     refactor(clean-code): Phase 3 — ISP violations fixed
     *     chore(deps): Bump cache-manager from 7.2.8 to 7.2.9 (#202)
     *
     * Naming a gap, an ADR or a class in the subject is this repository's house
     * style and is worth more than a casing convention; the last line is
     * Dependabot's own format, which nobody here controls. Keeping the rule would
     * reject a fifth of normal work for zero safety value, and a hook that does
     * that is a hook everyone learns to `--no-verify` past — at which point the
     * type check that GT-623 is actually about stops running too.
     */
    'subject-case': [0, 'never'],
  },
};
