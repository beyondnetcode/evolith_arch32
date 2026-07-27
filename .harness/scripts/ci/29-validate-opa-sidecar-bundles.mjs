import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { ensureOpa } from '../opa-runtime.mjs';

// GT-556: ROOT defaulted to '.', i.e. process.cwd(), and the chart path
// `reference/infrastructure/helm` had moved to `product/infra/helm`. The combination
// made this script crash outright — which is the least-bad failure mode of the six, but
// still not a check. Both are now resolved fail-closed from the repo root.
import { REPO_ROOT, resolve as resolveKey, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = REPO_ROOT;
const CHARTS = [
  {
    name: 'evolith-mcp',
    chartPath: relativeToRoot(resolveKey('helmCharts', 'evolith-mcp')),
  },
];
const REGO = 'src/rulesets/infrastructure/opa/opa-sidecar-bundle.rego';
const REGO_TEST = 'src/rulesets/infrastructure/opa/opa-sidecar-bundle.test.rego';
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const VALID_SIGNING_ALGORITHMS = new Set(['RS256', 'ES256', 'HS256']);

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(path.join(ROOT, filePath), 'utf8')) ?? {};
}

function renderChart(chart) {
  const rendered = execFileSync(
    'helm',
    ['template', `gt272-${chart.name}`, chart.chartPath],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return yaml.loadAll(rendered).filter(Boolean);
}

function findKind(docs, kind) {
  return docs.find((doc) => doc?.kind === kind);
}

function findContainer(deployment, name) {
  return deployment?.spec?.template?.spec?.containers?.find((container) => container.name === name);
}

function names(items = []) {
  return new Set(items.map((item) => item?.name).filter(Boolean));
}

function secretEnvNames(container) {
  return new Set(
    (container?.env ?? [])
      .filter((entry) => entry?.valueFrom?.secretKeyRef)
      .map((entry) => entry.name),
  );
}

function parseConfig(configMap) {
  return yaml.load(configMap?.data?.['config.yaml'] ?? '') ?? {};
}

function chartInput(chart) {
  const values = readYaml(path.join(chart.chartPath, 'values.yaml'));
  const docs = renderChart(chart);
  const deployment = findKind(docs, 'Deployment');
  const configMap = docs.find((doc) => doc?.kind === 'ConfigMap' && doc?.metadata?.name?.endsWith('-opa-config'));
  const opa = findContainer(deployment, 'opa');
  const args = opa?.args ?? [];
  const envNames = names(opa?.env);
  const secretNames = secretEnvNames(opa);
  const mountNames = names(opa?.volumeMounts);
  const podVolumes = names(deployment?.spec?.template?.spec?.volumes);
  const config = parseConfig(configMap);
  const bundle = values.opa?.bundle ?? {};
  const signing = bundle.signing ?? {};

  return {
    name: chart.name,
    bundle: {
      url: String(bundle.url ?? ''),
      resource: String(bundle.resource ?? ''),
      expectedSha256: String(bundle.expectedSha256 ?? ''),
      credentials: {
        existingSecretName: String(bundle.credentials?.existingSecretName ?? ''),
        accessKeyKey: String(bundle.credentials?.accessKeyKey ?? ''),
        secretKeyKey: String(bundle.credentials?.secretKeyKey ?? ''),
        regionKey: String(bundle.credentials?.regionKey ?? ''),
      },
      signing: {
        enabled: Boolean(signing.enabled),
        existingSecretName: String(signing.existingSecretName ?? ''),
        keyId: String(signing.keyId ?? ''),
        keySecretKey: String(signing.keySecretKey ?? ''),
        algorithm: String(signing.algorithm ?? ''),
        scope: String(signing.scope ?? ''),
      },
      tls: {
        caCertSecretName: String(bundle.tls?.caCertSecretName ?? ''),
        caCertKey: String(bundle.tls?.caCertKey ?? ''),
        skipVerify: Boolean(bundle.tls?.skipVerify),
      },
      readinessFailClosed: Boolean(bundle.readinessFailClosed),
    },
    rendered: {
      hasConfigMap: Boolean(configMap),
      hasConfigFileArg: args.includes('--config-file=/var/run/opa/config/config.yaml'),
      hasSigningKeyFileArg: args.includes(`--set-file=keys.${signing.keyId}.key=/var/run/opa/signing/key`),
      hasCredentialsEnv: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'].every((name) => secretNames.has(name)),
      hasDigestEnv: (opa?.env ?? []).some(
        (entry) => entry.name === 'EVOLITH_OPA_BUNDLE_SHA256' && entry.value === bundle.expectedSha256,
      ),
      hasCaCertEnv: (opa?.env ?? []).some(
        (entry) => entry.name === 'SSL_CERT_FILE' && entry.value === '/var/run/opa/ca/ca.crt',
      ),
      hasFailClosedReadiness: opa?.readinessProbe?.httpGet?.path === '/health?bundles',
      hasConfigVolume: mountNames.has('opa-config') && podVolumes.has('opa-config'),
      hasSigningVolume: mountNames.has('opa-signing-key') && podVolumes.has('opa-signing-key'),
      hasCaVolume: mountNames.has('opa-ca-cert') && podVolumes.has('opa-ca-cert'),
      config: {
        url: String(config?.services?.s3?.url ?? ''),
        resource: String(config?.bundles?.authz?.resource ?? ''),
        persist: Boolean(config?.bundles?.authz?.persist),
        credentialsFromEnvironment: Boolean(config?.services?.s3?.credentials?.s3_signing?.environment_credentials),
        signingKeyId: String(config?.bundles?.authz?.signing?.keyid ?? ''),
        signingScope: String(config?.bundles?.authz?.signing?.scope ?? ''),
      },
    },
  };
}

function validateNative(chart) {
  const errors = [];
  const { bundle, rendered, name } = chart;

  if (!bundle.url.startsWith('https://')) errors.push(`${name}: OPA bundle endpoint must use https://`);
  if (!bundle.resource || bundle.resource.startsWith('/')) errors.push(`${name}: OPA bundle resource must be relative`);
  if (!DIGEST_PATTERN.test(bundle.expectedSha256)) errors.push(`${name}: expectedSha256 must be sha256:<64 hex>`);
  if (!bundle.credentials.existingSecretName) errors.push(`${name}: credentials.existingSecretName is required`);
  if (!bundle.credentials.accessKeyKey || !bundle.credentials.secretKeyKey || !bundle.credentials.regionKey) {
    errors.push(`${name}: credentials must declare access, secret, and region keys`);
  }
  if (!bundle.signing.enabled) errors.push(`${name}: bundle signing must be enabled`);
  if (!bundle.signing.existingSecretName || !bundle.signing.keyId || !bundle.signing.keySecretKey) {
    errors.push(`${name}: signing secret, keyId, and keySecretKey are required`);
  }
  if (!VALID_SIGNING_ALGORITHMS.has(bundle.signing.algorithm)) {
    errors.push(`${name}: signing algorithm must be one of ${[...VALID_SIGNING_ALGORITHMS].join(', ')}`);
  }
  if (!bundle.signing.scope) errors.push(`${name}: signing scope is required`);
  if (!bundle.tls.caCertSecretName || !bundle.tls.caCertKey) errors.push(`${name}: TLS CA secret is required`);
  if (bundle.tls.skipVerify) errors.push(`${name}: TLS skipVerify must remain false`);
  if (!bundle.readinessFailClosed) errors.push(`${name}: readinessFailClosed must be true`);

  if (!rendered.hasConfigMap) errors.push(`${name}: OPA ConfigMap was not rendered`);
  if (!rendered.hasConfigFileArg) errors.push(`${name}: OPA sidecar must load --config-file`);
  if (!rendered.hasSigningKeyFileArg) errors.push(`${name}: OPA sidecar must load signing key with --set-file`);
  if (!rendered.hasCredentialsEnv) errors.push(`${name}: OPA sidecar must expose AWS credential env vars from secrets`);
  if (!rendered.hasDigestEnv) errors.push(`${name}: OPA sidecar must expose EVOLITH_OPA_BUNDLE_SHA256`);
  if (!rendered.hasCaCertEnv) errors.push(`${name}: OPA sidecar must set SSL_CERT_FILE for mounted CA`);
  if (!rendered.hasFailClosedReadiness) errors.push(`${name}: OPA sidecar must render /health?bundles readiness`);
  if (!rendered.hasConfigVolume || !rendered.hasSigningVolume || !rendered.hasCaVolume) {
    errors.push(`${name}: OPA sidecar must mount config, signing key, and CA volumes`);
  }
  if (rendered.config.url !== bundle.url) errors.push(`${name}: rendered OPA service URL does not match values`);
  if (rendered.config.resource !== bundle.resource) errors.push(`${name}: rendered OPA bundle resource does not match values`);
  if (!rendered.config.persist) errors.push(`${name}: rendered OPA bundle config must persist the last valid bundle`);
  if (!rendered.config.credentialsFromEnvironment) {
    errors.push(`${name}: rendered OPA config must enable s3_signing.environment_credentials`);
  }
  if (rendered.config.signingKeyId !== bundle.signing.keyId) {
    errors.push(`${name}: rendered signing keyid does not match values`);
  }
  if (rendered.config.signingScope !== bundle.signing.scope) {
    errors.push(`${name}: rendered signing scope does not match values`);
  }

  return errors;
}

async function validateWithOpa(input) {
  const { binary } = await ensureOpa(ROOT);
  execFileSync(binary, ['test', REGO, REGO_TEST], { cwd: ROOT, stdio: 'inherit' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-opa-sidecar-'));
  const inputFile = path.join(tmpDir, 'input.json');
  fs.writeFileSync(inputFile, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

  const output = execFileSync(
    binary,
    ['eval', '--format=json', '--data', REGO, '--input', inputFile, 'data.evolith.infrastructure.opa_sidecar_bundle.deny'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
  const result = JSON.parse(output);
  return result?.result?.[0]?.expressions?.[0]?.value ?? [];
}

export async function validateOpaSidecarBundles() {
  const charts = CHARTS.map(chartInput);
  const nativeErrors = charts.flatMap(validateNative);
  const opaErrors = await validateWithOpa({ charts });

  return {
    charts,
    errors: [
      ...nativeErrors.map((error) => `Native: ${error}`),
      ...opaErrors.map((error) => `OPA: ${error}`),
    ],
  };
}

async function run() {
  console.log('\nValidating OPA sidecar bundle integrity...');
  const result = await validateOpaSidecarBundles();
  // GT-578: every one of the ~20 assertions in `validateNative` runs per chart.
  // With `charts` empty — a renamed Helm directory, a values file that stopped
  // declaring `opa.bundle` — `errors` is empty too and the script prints
  // "✅ OPA sidecar bundle validation passed." having validated no bundle.
  assertScanned(result.charts.length, {
    what: 'Helm charts declaring an OPA sidecar bundle',
    where: 'product/infra/helm',
  });
  if (result.errors.length) {
    for (const error of result.errors) console.error(`❌ [ERROR] ${error}`);
    console.error('\n❌ OPA sidecar bundle validation failed.');
    process.exit(1);
  }

  for (const chart of result.charts) {
    console.log(`Validated ${chart.name}: ${chart.bundle.url}/${chart.bundle.resource}`);
  }
  console.log(`\n✅ OPA sidecar bundle validation passed (${result.charts.length} chart(s)).`);
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryPoint) run();
