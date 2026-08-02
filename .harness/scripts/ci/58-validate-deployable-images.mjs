#!/usr/bin/env node
/**
 * GT-435 — every image a Helm chart asks for must be one this repository actually publishes.
 *
 * WHY, AND IT IS NOT HYPOTHETICAL. Nothing has ever run in production, so nothing has ever pulled
 * these images. Measured on 2026-08-02, all three Core charts named a tag that **no workflow in
 * this repository produces**: `evolith-core-api:0.0.2`, `evolith-mcp:1.1.0` and
 * `evolith-agent-runtime:0.1.0`, while `ci-cd.yml` publishes only `:latest` and `:<sha>` and
 * `docker-images.yml`, which would publish semver, has never run. A `helm install` with default
 * values would therefore have met `ImagePullBackOff` on every service — on day one, at the worst
 * possible moment, and for a reason nobody could have diagnosed from a green CI.
 *
 * The whole point is that this is checkable WITHOUT a cluster, a registry credential or a server.
 * The day the VPS exists is not the day to discover that the charts point at nothing.
 *
 * WHAT IT COMPARES. The image `repository` + `tag` each chart declares, against the set of
 * `<image>:<tag>` pairs the workflows in `.github/workflows` build and push. Third-party images
 * (`postgres`, `openpolicyagent/opa`) are not ours to publish and are allowlisted BY NAME with a
 * reason, never by a wildcard — a pattern that swallowed our own images would defeat the check.
 *
 * WHAT IT DOES NOT DO. It does not contact a registry. A guard that needs credentials runs in one
 * job and rots everywhere else, and the failure it exists to catch is a mismatch between two files
 * that are both right here.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = process.cwd();
const HELM_ROOT = 'product/infra/helm';
const WORKFLOWS = '.github/workflows';

/**
 * Images this repository does not build. Named individually: a prefix rule such as "anything
 * without our org" would also excuse a typo in one of our own repositories.
 */
const THIRD_PARTY = new Map([
  ['postgres', 'Upstream database image, pulled from Docker Hub.'],
  ['openpolicyagent/opa', 'Upstream OPA sidecar; the policy bundle we build is mounted into it.'],
  ['busybox', 'Upstream init/utility image.'],
]);

/** Minimal `key: value` reader — enough for `image:` blocks, and no YAML dependency. */
function readImageBlocks(text) {
  const found = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^(\s*)(\w[\w-]*)?:?\s*$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    let repository;
    let tag;
    for (let j = i + 1; j < lines.length; j += 1) {
      // Comments and blank lines are SKIPPED, not treated as the end of the block. Stopping at
      // the first `#` made the parser report "declares no tag" for a block that documents its
      // own tag choice — a guard defeated by the explanation of the thing it checks.
      if (/^\s*(#|$)/.test(lines[j])) continue;
      const child = /^(\s*)([\w-]+):\s*(.*)$/.exec(lines[j]);
      if (!child) break;
      if (child[1].length <= indent) break;
      const value = child[3].trim().replace(/^["']|["']$/g, '');
      if (child[2] === 'repository') repository = value;
      if (child[2] === 'tag') tag = value;
    }
    if (repository) found.push({ repository, tag: tag ?? '' });
  }
  return found;
}

/**
 * Every `<repo>:<tag>` any workflow pushes.
 *
 * The image name is usually `${{ matrix.image }}` rather than a literal, so the matrix has to be
 * resolved or this function finds nothing — and a guard that discovers zero published images would
 * report every chart as broken, which is right today by accident and wrong the moment somebody
 * fixes the tags. Its denominator is printed and asserted for exactly that reason.
 */
function publishedImages() {
  const published = new Set();
  if (!existsSync(join(ROOT, WORKFLOWS))) return published;

  for (const file of readdirSync(join(ROOT, WORKFLOWS)).filter((f) => /\.ya?ml$/.test(f))) {
    const raw = readFileSync(join(ROOT, WORKFLOWS, file), 'utf8');

    // Expressions are collapsed to space-free tokens FIRST. `${{ github.repository_owner }}`
    // contains spaces, so any `\S`-based pattern silently matches nothing — which is how a guard
    // ends up discovering zero published images and blaming every chart.
    const text = raw
      .replace(/\$\{\{\s*matrix\.(?:image|name)\s*\}\}/g, '@IMAGE@')
      .replace(/\$\{\{\s*github\.sha\s*\}\}/g, '@SHA@')
      .replace(/\$\{\{\s*github\.repository_owner\s*\}\}/g, '@OWNER@')
      .replace(/\$\{\{[^}]*\}\}/g, '@EXPR@');

    // Literal `image:`/`name:` entries of the build matrix, which the tag lines interpolate.
    const matrixImages = [
      ...text.matchAll(/^\s*-?\s*(?:image|name):\s*([a-z0-9][\w.-]*)\s*$/gm),
    ]
      .map((m) => m[1])
      .filter((n) => n.includes('-'));

    const expand = (name) => (name === '@IMAGE@' ? matrixImages : name.includes('@') ? [] : [name]);

    for (const m of text.matchAll(/ghcr\.io\/[\w.@-]+\/([\w.@-]+):([\w.@-]+)/g)) {
      const tag = m[2] === '@SHA@' ? '<sha>' : m[2] === '@EXPR@' ? '<templated>' : m[2];
      for (const name of expand(m[1])) published.add(`${name}:${tag}`);
    }

    // docker/metadata-action drives tags from `images:` plus a `tags:` pattern list.
    for (const m of text.matchAll(/images:\s*ghcr\.io\/[\w.@-]+\/([\w.@-]+)/g)) {
      for (const name of expand(m[1])) {
        if (/type=semver/.test(text)) published.add(`${name}:<semver>`);
        if (/type=raw,value=latest/.test(text)) published.add(`${name}:latest`);
      }
    }
  }
  return published;
}

function normaliseTag(tag, workflowText) {
  if (tag.includes('${{')) {
    if (/github\.sha/.test(tag)) return '<sha>';
    if (/steps\.meta/.test(tag) && /type=semver/.test(workflowText)) return '<semver>';
    return '<templated>';
  }
  return tag;
}

/** Git tags in this checkout, which is what a semver image build is driven from. */
function gitTags() {
  try {
    return new Set(execFileSync('git', ['tag', '--list'], { encoding: 'utf8' }).split('\n').map((t) => t.trim()));
  } catch {
    return new Set();
  }
}

/**
 * Whether some workflow could produce this exact image:tag.
 *
 * A `<semver>` publisher is driven by a GIT TAG, so declaring one is not enough: the tag has to
 * exist. `evolith-agent-runtime:0.1.0` was requested by a chart while no `v0.1.0` tag has ever
 * existed in this repository, which makes that image unproducible by any current path — a hard
 * defect, and one provable without touching a registry.
 */
function producibility(image, tag, published, tags) {
  if (published.has(`${image}:${tag}`)) return { ok: true, how: `published directly as :${tag}` };
  if (/^\d+\.\d+\.\d+/.test(tag) && published.has(`${image}:<semver>`)) {
    if (tags.has(`v${tag}`) || tags.has(tag)) {
      return { ok: true, how: `semver build from git tag v${tag}`, needsRegistryCheck: true };
    }
    return {
      ok: false,
      why:
        `a semver publisher exists but it is driven by a git tag, and neither \`v${tag}\` nor ` +
        `\`${tag}\` is a tag in this repository. No current path can produce this image.`,
    };
  }
  return {
    ok: false,
    why:
      `no workflow publishes it. Published for this image: ` +
      `${[...published].filter((p) => p.startsWith(`${image}:`)).join(', ') || '(nothing)'}`,
  };
}

function main() {
  const published = publishedImages();
  const tags = gitTags();
  const problems = [];
  const unverifiable = [];
  let checked = 0;

  const charts = existsSync(join(ROOT, HELM_ROOT))
    ? readdirSync(join(ROOT, HELM_ROOT)).filter((d) => existsSync(join(ROOT, HELM_ROOT, d, 'values.yaml')))
    : [];

  for (const chart of charts) {
    const values = readFileSync(join(ROOT, HELM_ROOT, chart, 'values.yaml'), 'utf8');
    for (const { repository, tag } of readImageBlocks(values)) {
      const bare = repository.replace(/^ghcr\.io\/[^/]+\//, '').replace(/^docker\.io\//, '');
      if (THIRD_PARTY.has(bare) || THIRD_PARTY.has(repository)) continue;
      checked += 1;

      if (!tag) {
        problems.push(`${chart}: \`${repository}\` declares no tag — a floating image is not a deployment`);
        continue;
      }
      // A tag a registry can never serve. `:local` only exists on the machine that built it.
      if (/^(local|dev|latest-local)$/.test(tag)) {
        problems.push(
          `${chart}: \`${repository}:${tag}\` is a LOCAL-ONLY tag. No registry can serve it, so this ` +
            `chart cannot deploy anywhere but the machine that built the image.`,
        );
        continue;
      }
      const verdict = producibility(bare, tag, published, tags);
      if (!verdict.ok) {
        problems.push(`${chart}: \`${repository}:${tag}\` — ${verdict.why}`);
      } else if (verdict.needsRegistryCheck) {
        // The boundary of a static check, stated instead of hidden: that a build COULD produce
        // this image is provable here; that it DID is a fact about a registry, and a guard that
        // needed a credential to say so would run in one job and rot everywhere else.
        unverifiable.push(`${chart}: \`${repository}:${tag}\` — ${verdict.how}. Whether that build ever RAN is not knowable from the repository.`);
      }
    }
  }

  console.log(
    `58-validate-deployable-images: ${checked} chart image(s) checked across ${charts.length} chart(s); ` +
      `${published.size} image:tag pair(s) discovered in ${WORKFLOWS}.`,
  );

  assertScanned(checked, {
    what: 'first-party images declared by Helm charts',
    where: [`${HELM_ROOT}/*/values.yaml`],
  });

  if (problems.length > 0) {
    console.error('\n❌ Charts request images this repository does not publish:\n');
    for (const p of problems) console.error(`  ✖ ${p}`);
    console.error(
      '\nNothing has ever run in production, so nothing has ever pulled these images and no green\n' +
        'CI could have revealed this. The day the server exists is not the day to discover that the\n' +
        'charts point at nothing: fix the tag, or publish the tag.\n',
    );
    process.exit(1);
  }

  if (unverifiable.length > 0) {
    console.log('\n  Producible, but not verifiable from here:');
    for (const u of unverifiable) console.log(`    · ${u}`);
  }
  console.log('\n✅ Every chart image is one this repository can produce.');
}

main();
