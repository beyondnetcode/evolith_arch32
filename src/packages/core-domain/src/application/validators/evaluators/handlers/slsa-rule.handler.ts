import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/**
 * GT-665 — the SLSA Build track, evaluated from what a repository DECLARES.
 *
 * ## Why this one is native and ISO/IEC 5055 is not
 *
 * GT-662/GT-663 shipped ISO/IEC 5055 as an adapter over an external analyser,
 * because its 138 weaknesses are code-structure CWEs and a native handler is
 * given a filesystem with no parser — it cannot decide "this switch has no
 * default". SLSA is a different shape. Most of the Build track is a property of
 * the BUILD and of how the producer declares it: whether provenance is
 * generated, whether the publishing job can mint the identity that signs it,
 * whether the artifact was built by the run being attested, whether a route
 * exists that bypasses CI entirely. A workflow file and a package manifest
 * answer all four directly, so the honest engine for them is this one.
 *
 * What a filesystem genuinely cannot decide — Build L3's platform properties,
 * the predicate type the registry actually serves, whether a signature verifies —
 * is named in the ruleset's `notEvaluableHere` block instead of being guessed at.
 *
 * ## Reading CI as text, and the one thing that buys
 *
 * Like {@link import('./ssdf-rule.handler').SsdfRuleHandler} this reads workflow
 * YAML as TEXT: the questions are "does this step carry a flag" rather than
 * anything structural, and a YAML parser in the domain layer crosses the boundary
 * the architecture lint exists to defend.
 *
 * It does buy ONE structural thing, and it is bought deliberately: `SLSA-AUTH-L2`
 * splits the file into job blocks, because the question is whether the job that
 * PUBLISHES carries `id-token: write` — not whether the file mentions it
 * somewhere. GT-600 shipped that exact defect twice in the SSDF pack (`PS.3.2`
 * accepted any upload step anywhere, so it certified every release workflow ever
 * written; `RV.1.2` accepted any workflow MENTIONING CodeQL and named the wrong
 * file as the scanner). A file-level match here would certify a workflow that
 * grants the token to a job which does not publish.
 */

/**
 * A step that really ships something.
 *
 * `--dry-run` is excluded on purpose: it publishes nothing, so it distributes
 * nothing, and holding a rehearsal to a distribution requirement would report
 * `npm-release.yml` — whose dry run is its safety model — as a defect.
 */
const PUBLISHES = /\bnpm\s+publish\b(?![^\n]*--dry-run)/;

/** Building the artifact in the run that is about to publish it. */
const BUILDS = /npm\s+run\s+build|npm\s+run\s+prepublishOnly|\bnpx?\s+tsc\b|\btsc\s+-b\b|\bnest\s+build\b|npm\s+run\s+build\s+--workspace/;

/**
 * The permission without which no OIDC token, and therefore no signature, exists.
 *
 * The optional trailing comment is not cosmetic. `npm-release.yml` writes
 * `id-token: write # required for npm provenance`, and an end-anchored pattern
 * reported this repository's own release workflow as unable to sign — a false RED
 * on the one workflow that provably signs, since the registry serves its
 * attestation. Measured, not imagined: it was the first verdict this pack
 * returned.
 */
const ID_TOKEN = /^\s*id-token:\s*write\s*(?:#.*)?$/m;

/**
 * A line that only TALKS about a command is not that command.
 *
 * `npm-release.yml` explains its own design in a comment block that says
 * "`npm publish` would otherwise ship whatever happens to be in dist/". The first
 * run of this pack counted those two comment lines as publishing steps with no
 * provenance and reported the repository non-compliant — the SSDF pack's `RV.1.2`
 * defect exactly (a workflow MENTIONING CodeQL is not the workflow running it),
 * reproduced in a different pack because the lesson was recorded and not applied.
 * A trailing comment on a real step is untouched: only a line whose first
 * non-space character is `#` is dropped.
 */
function isComment(line: string): boolean {
  return /^\s*#/.test(line);
}

/** A line that really runs a publish, as opposed to describing one. */
function publishesOn(line: string): boolean {
  return !isComment(line) && PUBLISHES.test(line);
}

/** A line that really runs a build, as opposed to describing one. */
function buildsOn(line: string): boolean {
  return !isComment(line) && BUILDS.test(line);
}

/** One job of a workflow: its name, and the text between its header and the next job. */
interface JobBlock {
  readonly name: string;
  readonly text: string;
}

/**
 * Split a workflow into the header (everything before `jobs:`) and one block per
 * job.
 *
 * Jobs are the keys at two-space indent under `jobs:`. This is a text split and
 * not a parse: it is exact for the canonical shape GitHub documents and every
 * workflow in this repository uses, and a workflow written with a different
 * indent would come back as one block — which fails CLOSED, because a single
 * block containing the publish step still has to carry the permission.
 */
function splitJobs(text: string): { header: string; jobs: JobBlock[] } {
  const at = text.search(/^jobs:\s*$/m);
  if (at < 0) return { header: text, jobs: [] };

  const header = text.slice(0, at);
  const body = text.slice(at);
  const lines = body.split('\n');

  const jobs: JobBlock[] = [];
  let current: { name: string; lines: string[] } | undefined;
  for (const line of lines) {
    const start = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(line);
    if (start) {
      if (current) jobs.push({ name: current.name, text: current.lines.join('\n') });
      current = { name: start[1], lines: [line] };
      continue;
    }
    current?.lines.push(line);
  }
  if (current) jobs.push({ name: current.name, text: current.lines.join('\n') });

  return { header, jobs };
}

export class SlsaRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('SLSA-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'SLSA-PROV-L1': return this.everyPublishGeneratesProvenance(rule, ctx);
      case 'SLSA-BUILD-L1': return this.builtByTheRunThatPublishes(rule, ctx);
      case 'SLSA-AUTH-L2': return this.publishingJobCanSign(rule, ctx);
      case 'SLSA-HOSTED-L2': return this.noWorkstationPublishPath(rule, ctx);
      default:
        // A new SLSA-* id with no branch here is NOT a pass. Saying so keeps the
        // ruleset and the handler from drifting apart silently — the failure mode
        // where a rule is added, never implemented, and reads as satisfied
        // because nothing objected.
        return {
          rule,
          result: 'skipped',
          message: `${rule.id} is declared in the SLSA ruleset but no handler branch implements it.`,
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
      try {
        out.set(entry, await this.fs.readFile(path.join(dir, entry)));
      } catch {
        // An unreadable workflow is not an absent one. It is left out of the
        // evidence rather than counted as either passing or failing.
      }
    }
    return out;
  }

  /** Workflows containing at least one step that really publishes. */
  private async publishingWorkflows(root: string): Promise<[string, string][]> {
    return [...(await this.workflows(root)).entries()].filter(([, text]) =>
      text.split('\n').some(publishesOn),
    );
  }

  /**
   * The Build track has a subject only if something is published. A repository
   * that ships no artifact is not a repository failing a distribution
   * requirement — reporting it as a violation would be this pack's version of a
   * false block, and `SSDF-PW.6.1` already set the precedent for a rule that
   * does not apply rather than one that fails.
   */
  private notApplicable(rule: NormalizedRule, why: string): RuleEvaluationResult {
    return { rule, result: 'skipped', message: why, evaluability: 'documentation-only' };
  }

  private pass(rule: NormalizedRule, message: string, evidencePath?: string): RuleEvaluationResult {
    return { rule, result: 'passed', message, evidencePath };
  }

  private fail(rule: NormalizedRule, message: string, evidencePath?: string): RuleEvaluationResult {
    return { rule, result: 'failed', message, evidencePath };
  }

  // -------------------------------------------------------------------------
  // SLSA-PROV-L1 — every publishing path, not just the main one
  // -------------------------------------------------------------------------

  private async everyPublishGeneratesProvenance(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const publishing = await this.publishingWorkflows(ctx.satellitePath);
    if (publishing.length === 0) {
      return this.notApplicable(
        rule,
        'No workflow publishes an artifact, so the SLSA Build track has no subject here. NOT a pass: nothing was evaluated.',
      );
    }

    // Per STEP, not per file. A workflow whose main path carries the flag and
    // whose second path does not is the case this rule exists for.
    const bare: string[] = [];
    let withFlag = 0;
    for (const [name, text] of publishing) {
      for (const line of text.split('\n')) {
        if (!publishesOn(line)) continue;
        if (/--provenance\b/.test(line)) withFlag += 1;
        else bare.push(`${name}: ${line.trim()}`);
      }
    }

    return bare.length === 0
      ? this.pass(
          rule,
          `Build L1 — all ${withFlag} publishing step(s) generate provenance, across ${publishing.map(([f]) => f).join(', ')}.`,
          `.github/workflows/${publishing[0][0]}`,
        )
      : this.fail(
          rule,
          `Build L1 unmet — ${bare.length} publishing step(s) ship an artifact with no provenance while ${withFlag} other(s) do, so the repository looks compliant and distributes unattested artifacts anyway: ${bare.join('; ')}.`,
        );
  }

  // -------------------------------------------------------------------------
  // SLSA-BUILD-L1 — the run that publishes is the run that built
  // -------------------------------------------------------------------------

  private async builtByTheRunThatPublishes(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const publishing = await this.publishingWorkflows(ctx.satellitePath);
    if (publishing.length === 0) {
      return this.notApplicable(
        rule,
        'No workflow publishes an artifact, so there is no build process to hold to a consistent shape. NOT a pass: nothing was evaluated.',
      );
    }

    const unbuilt: string[] = [];
    for (const [name, text] of publishing) {
      const lines = text.split('\n');
      const firstPublish = lines.findIndex(publishesOn);
      const firstBuild = lines.findIndex(buildsOn);
      if (firstBuild < 0 || firstBuild > firstPublish) unbuilt.push(name);
    }

    return unbuilt.length === 0
      ? this.pass(
          rule,
          `Build L1 — every publishing workflow builds before it publishes (${publishing.map(([f]) => f).join(', ')}), so the provenance describes the run that produced the bytes.`,
          `.github/workflows/${publishing[0][0]}`,
        )
      : this.fail(
          rule,
          `Build L1 unmet — ${unbuilt.length} workflow(s) publish without building first, so the tarball is whatever the checkout already held and the provenance attests a run that did not produce it: ${unbuilt.join(', ')}. NOTE the stated scope: this compares text order within one file and does not resolve the \`needs:\` job graph.`,
        );
  }

  // -------------------------------------------------------------------------
  // SLSA-AUTH-L2 — the job that publishes is the job that must be able to sign
  // -------------------------------------------------------------------------

  private async publishingJobCanSign(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const publishing = await this.publishingWorkflows(ctx.satellitePath);
    if (publishing.length === 0) {
      return this.notApplicable(
        rule,
        'No workflow publishes an artifact, so no job needs an identity to sign provenance with. NOT a pass: nothing was evaluated.',
      );
    }

    const unsigned: string[] = [];
    const signed: string[] = [];
    for (const [file, text] of publishing) {
      const { header, jobs } = splitJobs(text);
      const grantedToAll = ID_TOKEN.test(header);

      const publishers = jobs.filter((j) => j.text.split('\n').some(publishesOn));
      if (publishers.length === 0) {
        // The publish line exists but sits outside any recognised job block.
        // Fail CLOSED against the whole file rather than silently drop it.
        (grantedToAll ? signed : unsigned).push(`${file} (publish step outside a recognised job block)`);
        continue;
      }

      for (const job of publishers) {
        (grantedToAll || ID_TOKEN.test(job.text) ? signed : unsigned).push(`${file}:${job.name}`);
      }
    }

    return unsigned.length === 0
      ? this.pass(
          rule,
          `Build L2 — every publishing job can mint the OIDC identity that signs its provenance: ${signed.join(', ')}.`,
          `.github/workflows/${publishing[0][0]}`,
        )
      : this.fail(
          rule,
          `Build L2 unmet — ${unsigned.length} publishing job(s) declare no \`id-token: write\`, at workflow level or their own, so the platform cannot sign what they publish: ${unsigned.join(', ')}. A --provenance flag without this permission produces no provenance, not weaker provenance.`,
        );
  }

  // -------------------------------------------------------------------------
  // SLSA-HOSTED-L2 — no route that bypasses the hosted platform
  // -------------------------------------------------------------------------

  private async noWorkstationPublishPath(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const root = ctx.satellitePath;
    const rootManifest = path.join(root, 'package.json');
    if (!(await this.fs.exists(rootManifest))) {
      return this.notApplicable(
        rule,
        'No package.json at the workspace root; this rule reads npm package manifests and does not apply. NOT a pass: nothing was evaluated.',
      );
    }

    type Manifest = { workspaces?: string[] | { packages?: string[] }; scripts?: Record<string, string> };
    const read = async (p: string): Promise<Manifest | undefined> => {
      try {
        return (await this.fs.readJson(p)) as Manifest;
      } catch {
        return undefined;
      }
    };

    const rootPkg = await read(rootManifest);
    const offenders: string[] = [];
    let inspected = 0;

    const inspect = (label: string, m: Manifest | undefined) => {
      if (!m) return;
      inspected += 1;
      for (const [name, body] of Object.entries(m.scripts ?? {})) {
        if (PUBLISHES.test(body)) offenders.push(`${label} → "${name}": ${body}`);
      }
    };

    inspect('package.json', rootPkg);

    // Workspace globs are resolved only for their LITERAL directory prefix — the
    // part before any `*`. That reaches every workspace this repository declares
    // and never invents a directory: a glob that expands to nothing here simply
    // contributes nothing, which is a smaller error than walking the tree.
    const declared = Array.isArray(rootPkg?.workspaces)
      ? rootPkg!.workspaces
      : (rootPkg?.workspaces as { packages?: string[] } | undefined)?.packages ?? [];

    for (const glob of declared) {
      const star = glob.indexOf('*');
      // The trailing separator is stripped BEFORE joining. `path.join` preserves
      // it — `path.join('/w', 'src/packages/')` is `/w/src/packages/` — and a
      // directory listing keyed on that prefix then matches nothing, so every
      // globbed workspace silently left the denominator while the rule still
      // reported a pass. Found by the fixture that counts how many manifests
      // were read, which is why the count is in the message rather than implied.
      const prefix = (star < 0 ? glob : glob.slice(0, star)).replace(/\/+$/, '');
      const dir = path.join(root, prefix);
      if (star < 0) {
        inspect(`${glob}/package.json`, await read(path.join(dir, 'package.json')));
        continue;
      }
      if (!(await this.fs.exists(dir))) continue;
      for (const entry of await this.fs.readdirNames(dir)) {
        const candidate = path.join(dir, entry, 'package.json');
        if (await this.fs.exists(candidate)) inspect(`${prefix}/${entry}/package.json`, await read(candidate));
      }
    }

    return offenders.length === 0
      ? this.pass(
          rule,
          `Build L2 — ${inspected} package manifest(s) inspected and none offers a script that publishes, so the only route to the registry is the hosted platform.`,
          'package.json',
        )
      : this.fail(
          rule,
          `Build L2 unmet — ${offenders.length} package script(s) publish directly, which is a route to the registry from an individual's workstation and it will be used: ${offenders.join('; ')}.`,
        );
  }
}
