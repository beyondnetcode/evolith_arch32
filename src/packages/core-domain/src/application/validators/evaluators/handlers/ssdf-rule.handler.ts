import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/**
 * A workflow that RUNS static analysis, not one that mentions it.
 *
 * The distinction cost a false positive: `openssf-scorecard.yml` names CodeQL
 * while `sdk-cli-ci.yml` is the workflow that actually invokes the analyser, and
 * a /codeql/ match reported the wrong file as the repository's scanner.
 */
const RUNS_ANALYSIS = /codeql-action\/analyze|semgrep\s+(ci|scan)|sonarsource\/|snyk\/actions\/(node|code)/i;

/**
 * Does this workflow actually carry the SBOM it produced somewhere a consumer
 * can reach?
 *
 * The generated FILENAME is the link. A workflow writes `--output-file sbom.json`
 * and must then name that same file in a step that uploads, attaches or releases
 * it; an upload of something ELSE from another job is not the SBOM being shared.
 *
 * This replaced a file-level match that asked only whether the workflow contained
 * an upload step anywhere. That passed `sdk-cli-release.yml`, which generates
 * `sbom.json` on one line and uploads binaries from a different job on another —
 * and every release workflow ever written contains the word `publish`, so the
 * check certified all of them. The hand-verified mapping had this right and the
 * rule had it wrong, which is exactly why the two are kept side by side.
 */
function sbomIsCarried(text: string): boolean {
  const names = new Set<string>();
  for (const m of text.matchAll(/--output-file[= ]+(\S+)/gi)) names.add(m[1].replace(/['"]/g, ''));
  for (const m of text.matchAll(/\b([\w./-]*sbom[\w./-]*\.(?:json|xml|spdx))\b/gi)) names.add(m[1]);
  // No recoverable filename: unanswerable from text, so it is not counted as carried.
  if (names.size === 0) return false;

  const carriers = text
    .split(/\n/)
    .filter((line) =>
      /upload-artifact|upload-sarif|gh\s+release\s+upload|action-gh-release|attach|publish|path:/i.test(line),
    );

  return [...names].some((name) => carriers.some((line) => line.includes(name)));
}


/**
 * GT-600 — the first international standard the engine EVALUATES rather than
 * one a human reads off a table.
 *
 * ## Why a handler and not just a ruleset
 *
 * A ruleset without a handler is not a check. GT-585 measured what that produces
 * here: of 96 blocking outcomes on this repository, 78 were rules declared
 * `blocking: true` that could not execute — the engine reporting that it could
 * not look, in a shape indistinguishable from a finding. Shipping SSDF as JSON
 * alone would have added eight more of those and called it standards coverage.
 *
 * ## The boundary, stated rather than discovered
 *
 * This handler is given a filesystem. It is NOT given a GitHub client, so a
 * practice whose evidence is a repository SETTING — branch protection, required
 * reviews, the required-check set, `dependabot_security_updates` — cannot be
 * decided here at all. Those are mapped and verified by `gh api` in
 * `supply-chain-posture.md`, and the ruleset names them under `notEvaluableHere`
 * so their absence reads as a declared limit instead of as coverage. A handler
 * that guessed at them from files would return green about a control nobody
 * checked, which is worse than returning nothing.
 *
 * ## Reading the workflow directory
 *
 * Several practices are decided by what CI does, and CI is YAML. This reads that
 * YAML as TEXT on purpose — a parser buys nothing here, because the questions are
 * "does any workflow run a secret scanner" rather than anything structural, and a
 * dependency on a YAML parser inside the domain layer would cross a boundary the
 * architecture lint exists to defend. Where the text answer would be ambiguous the
 * rule is not claimed at all; see `SSDF-RV.1.2`, which reads one trigger block and
 * says so.
 */
export class SsdfRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('SSDF-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'SSDF-PO.3.1': return this.toolchainIsCode(rule, ctx);
      case 'SSDF-PW.4.1': return this.pinnedInstalls(rule, ctx);
      case 'SSDF-PW.4.4': return this.continuousVerification(rule, ctx);
      case 'SSDF-PW.6.1': return this.strictBuild(rule, ctx);
      case 'SSDF-PW.7.2': return this.twoScanners(rule, ctx);
      case 'SSDF-PS.3.2': return this.sbomIsShared(rule, ctx);
      case 'SSDF-RV.1.2': return this.scannerSeesEverything(rule, ctx);
      case 'SSDF-RV.1.3': return this.disclosurePolicy(rule, ctx);
      default:
        // A new SSDF-* id with no branch here is NOT a pass. Saying so keeps the
        // ruleset and the handler from drifting apart silently, which is the
        // failure mode where a rule is added, never implemented, and reads as
        // satisfied because nothing objected.
        return {
          rule,
          result: 'skipped',
          message: `${rule.id} is declared in the SSDF ruleset but no handler branch implements it.`,
          evaluability: 'unimplemented-native',
        };
    }
  }

  // -------------------------------------------------------------------------
  // Workspace reading helpers
  // -------------------------------------------------------------------------

  /** Every workflow file's text, keyed by filename. Empty when CI does not exist. */
  private async workflows(root: string): Promise<Map<string, string>> {
    const dir = path.join(root, '.github', 'workflows');
    const out = new Map<string, string>();
    if (!(await this.fs.exists(dir))) return out;

    for (const entry of await this.fs.readdirNames(dir)) {
      if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
      const full = path.join(dir, entry);
      try {
        out.set(entry, await this.fs.readFile(full));
      } catch {
        // An unreadable workflow is not an absent one. It is left out of the
        // evidence rather than counted as either passing or failing.
      }
    }
    return out;
  }

  private pass(rule: NormalizedRule, message: string, evidencePath?: string): RuleEvaluationResult {
    return { rule, result: 'passed', message, evidencePath };
  }

  private fail(rule: NormalizedRule, message: string, evidencePath?: string): RuleEvaluationResult {
    return { rule, result: 'failed', message, evidencePath };
  }

  // -------------------------------------------------------------------------
  // PO.3.1 — the toolchain is code
  // -------------------------------------------------------------------------

  private async toolchainIsCode(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const root = ctx.satellitePath;
    const flows = await this.workflows(root);
    const guardDir = path.join(root, '.harness', 'scripts', 'ci');
    const guards = (await this.fs.exists(guardDir))
      ? (await this.fs.readdirNames(guardDir)).filter((f) => /^\d{2}-.*\.mjs$/.test(f) && !f.includes('.test.'))
      : [];
    const manifest = path.join(root, '.harness', 'manifest.yaml');
    const hasManifest = await this.fs.exists(manifest);

    const missing: string[] = [];
    if (flows.size === 0) missing.push('no workflow under .github/workflows');
    if (guards.length === 0) missing.push('no numbered guard under .harness/scripts/ci');
    if (!hasManifest) missing.push('no .harness/manifest.yaml');

    return missing.length === 0
      ? this.pass(rule, `Toolchain is code: ${flows.size} workflow(s), ${guards.length} guard(s), manifest present.`)
      : this.fail(rule, `PO.3.1 unmet — ${missing.join('; ')}.`);
  }

  // -------------------------------------------------------------------------
  // PW.4.1 — pinned installs
  // -------------------------------------------------------------------------

  private async pinnedInstalls(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const lock = path.join(ctx.satellitePath, 'package-lock.json');
    if (!(await this.fs.exists(lock))) {
      return this.fail(rule, 'PW.4.1 unmet — no package-lock.json, so CI cannot resolve to pinned versions.');
    }

    const flows = await this.workflows(ctx.satellitePath);
    // `npm install` NOT followed by a flag that makes it lockfile-faithful.
    const loose = [...flows.entries()].filter(([, text]) => /\bnpm\s+install\b(?!\s+--package-lock-only)/.test(text));

    return loose.length === 0
      ? this.pass(rule, `package-lock.json is committed and ${flows.size} workflow(s) install from it.`, 'package-lock.json')
      : this.fail(
          rule,
          `PW.4.1 unmet — ${loose.length} workflow(s) run bare \`npm install\`, which resolves whatever the registry serves: ${loose.map(([f]) => f).join(', ')}.`,
        );
  }

  // -------------------------------------------------------------------------
  // PW.4.4 — verification over the life cycle
  // -------------------------------------------------------------------------

  private async continuousVerification(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const dependabot = path.join(ctx.satellitePath, '.github', 'dependabot.yml');
    const hasUpdates = await this.fs.exists(dependabot);
    const flows = await this.workflows(ctx.satellitePath);
    const audit = [...flows.entries()].find(([, t]) => /npm\s+audit|audit-gate|osv-scanner|trivy/i.test(t));

    const missing: string[] = [];
    if (!hasUpdates) missing.push('no .github/dependabot.yml');
    if (!audit) missing.push('no workflow runs a vulnerability audit');

    return missing.length === 0
      ? this.pass(rule, `Updates configured and audited in CI (${audit?.[0]}).`, '.github/dependabot.yml')
      : this.fail(rule, `PW.4.4 unmet — ${missing.join('; ')}.`);
  }

  // -------------------------------------------------------------------------
  // PW.6.1 — strict build
  // -------------------------------------------------------------------------

  private async strictBuild(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    for (const candidate of ['tsconfig.base.json', 'tsconfig.json']) {
      const p = path.join(ctx.satellitePath, candidate);
      if (!(await this.fs.exists(p))) continue;
      const cfg = (await this.fs.readJson(p)) as { compilerOptions?: { strict?: boolean } };
      if (cfg?.compilerOptions?.strict === true) {
        return this.pass(rule, `${candidate} declares compilerOptions.strict.`, candidate);
      }
      return this.fail(rule, `PW.6.1 unmet — ${candidate} does not declare compilerOptions.strict.`, candidate);
    }
    // No TypeScript config is not a TypeScript project failing the practice.
    return {
      rule,
      result: 'skipped',
      message: 'No tsconfig found; this rule asserts a TypeScript build setting and does not apply.',
      evaluability: 'documentation-only',
    };
  }

  // -------------------------------------------------------------------------
  // PW.7.2 — two different instruments
  // -------------------------------------------------------------------------

  private async twoScanners(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const flows = await this.workflows(ctx.satellitePath);
    const sast = [...flows.entries()].find(([, t]) => RUNS_ANALYSIS.test(t));
    const secrets = [...flows.entries()].find(([, t]) => /gitleaks|trufflehog|detect-secrets/i.test(t));

    const missing: string[] = [];
    if (!sast) missing.push('no static analysis');
    if (!secrets) missing.push('no secret scanner');

    return missing.length === 0
      ? this.pass(rule, `Static analysis in ${sast?.[0]}, secret scanning in ${secrets?.[0]}.`)
      : this.fail(
          rule,
          `PW.7.2 unmet — ${missing.join('; ')}. These find different defect classes; one does not cover the other.`,
        );
  }

  // -------------------------------------------------------------------------
  // PS.3.2 — an SBOM that nobody can obtain
  // -------------------------------------------------------------------------

  private async sbomIsShared(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const flows = await this.workflows(ctx.satellitePath);
    const generators = [...flows.entries()].filter(([, t]) => /sbom|cyclonedx|spdx/i.test(t));

    if (generators.length === 0) {
      return this.fail(rule, 'PS.3.2 unmet — no workflow generates an SBOM at all.');
    }

    // Generated is the cheap half. The practice says SHARED — and "shared" has to
    // mean THIS artifact, not any artifact.
    //
    // The first version asked whether the workflow contained an upload step
    // anywhere, and passed `sdk-cli-release.yml`, which generates `sbom.json` on
    // one line and uploads BINARIES from a different job on another. A release
    // workflow always contains the word `publish`; a file-level match therefore
    // certifies every release workflow ever written. The hand-verified mapping in
    // supply-chain-posture.md had this right and the rule had it wrong, which is
    // the whole reason the two are kept side by side.
    const orphaned = generators.filter(([, text]) => !sbomIsCarried(text));

    return orphaned.length === 0
      ? this.pass(rule, `SBOM generated and published in ${generators.map(([f]) => f).join(', ')}.`)
      : this.fail(
          rule,
          `PS.3.2 unmet — ${orphaned.length} workflow(s) generate an SBOM and never upload, attach or publish it, so it is discarded when the job ends: ${orphaned.map(([f]) => f).join(', ')}. Generating an artifact nobody can obtain satisfies nothing.`,
        );
  }

  // -------------------------------------------------------------------------
  // RV.1.2 — the scanner sees the whole change
  // -------------------------------------------------------------------------

  private async scannerSeesEverything(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const flows = await this.workflows(ctx.satellitePath);
    const analysers = [...flows.entries()].filter(([, t]) => RUNS_ANALYSIS.test(t));
    if (analysers.length === 0) {
      return this.fail(rule, 'RV.1.2 unmet — no workflow runs static analysis, so nothing looks for undetected vulnerabilities.');
    }

    // ALL analysers are considered, and one that satisfies the practice satisfies
    // it. The first version took the first match and reported the repository
    // unmet because a DIFFERENT workflow — one that uploads SARIF on a schedule —
    // matched the analyser pattern first. A rule that picks an arbitrary member of
    // a set and generalises from it is a false positive generator, and a false
    // positive inside a standards pack is worse than a missing rule: it spends the
    // reader's trust on a defect that is not there.
    const verdicts = analysers.map(([name, text]) => {
      const trigger = /on:[\s\S]*?(?=\njobs:)/.exec(text)?.[0] ?? '';
      const prBlock = /pull_request:[\s\S]*?(?=\n\s{0,2}\w+:|$)/.exec(trigger)?.[0] ?? '';
      if (!prBlock) return { name, ok: false, why: 'does not run on pull_request' };
      if (/\bpaths:/.test(prBlock)) return { name, ok: false, why: 'filters its pull_request trigger with `paths:`' };
      return { name, ok: true, why: 'analyses every pull request with no path filter' };
    });

    const satisfying = verdicts.find((v) => v.ok);
    if (satisfying) {
      return this.pass(
        rule,
        `${satisfying.name} ${satisfying.why}.`,
        `.github/workflows/${satisfying.name}`,
      );
    }
    return this.fail(
      rule,
      `RV.1.2 unmet — every workflow running static analysis leaves part of a change unanalysed: ${verdicts
        .map((v) => `${v.name} ${v.why}`)
        .join('; ')}.`,
    );
  }

  // -------------------------------------------------------------------------
  // RV.1.3 — a policy that names a channel
  // -------------------------------------------------------------------------

  private async disclosurePolicy(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    for (const candidate of ['SECURITY.md', path.join('.github', 'SECURITY.md')]) {
      const p = path.join(ctx.satellitePath, candidate);
      if (!(await this.fs.exists(p))) continue;
      const text = await this.fs.readFile(p);
      const namesChannel = /security\/advisories|mailto:|[\w.+-]+@[\w-]+\.[\w.]+/i.test(text);
      return namesChannel
        ? this.pass(rule, `${candidate} names a reporting channel.`, candidate)
        : this.fail(
            rule,
            `RV.1.3 unmet — ${candidate} exists but names no advisory URL or address, so a reporter has nowhere to go. A document is not a policy.`,
            candidate,
          );
    }
    return this.fail(rule, 'RV.1.3 unmet — no SECURITY.md at the root or under .github/.');
  }
}
