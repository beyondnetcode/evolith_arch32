/**
 * Least-privilege environment for spawned `.harness` capabilities (GT-607).
 *
 * A capability is a script the runtime EXECUTES. Handing it `...process.env`
 * hands it every credential the host happens to hold — `AGENT_RUNTIME_CORE_TOKEN`,
 * the Tracker token, `EVOLITH_RAG_PG_URL`, `EVOLITH_LLM_API_KEY` — which is the
 * concrete inverse of ADR-0081 (agentic sandbox isolation): the least trusted
 * code in the system inherits the most privileged secrets in the process.
 *
 * The child environment is therefore built by CONSTRUCTION, never by
 * subtraction:
 *
 *   1. ALLOWLIST — only names on the allowlist are copied from the parent. The
 *      default allowlist carries what a process needs in order to run at all
 *      (interpreter lookup, temp dir, locale), and nothing about Evolith.
 *   2. DENYLIST OVER THE ALLOWLIST — a name that looks like a credential or an
 *      endpoint is refused even when an operator allowlisted it explicitly, and
 *      even when the runtime itself injected it. This is the invariant a test
 *      can assert: no `*_TOKEN`, `*_KEY`, `*_SECRET`, `*_URL`, `*_URI` value
 *      ever reaches a capability, from any path in this module.
 *   3. EXPLICIT VALUES — a host that must pass something to capabilities passes
 *      it by value (`env`), which keeps it out of the ambient process
 *      environment and makes it reviewable at the call site.
 *
 * Refusals are returned, not swallowed: `denied` names the variables a caller
 * asked for and did not get, so a host can log the demotion instead of
 * debugging a silently missing variable.
 */

/**
 * Names copied from the parent environment when the caller does not say
 * otherwise. Deliberately OS-plumbing only: nothing here identifies a tenant,
 * an endpoint or a credential.
 */
export const DEFAULT_CAPABILITY_ENV_ALLOWLIST: readonly string[] = Object.freeze([
  // POSIX
  'PATH',
  'HOME',
  'SHELL',
  'LANG',
  'LANGUAGE',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'TMPDIR',
  'TERM',
  // Build-environment discriminator several `.harness` scripts branch on. Carries
  // no authority: it is a boolean about where the process runs.
  'CI',
  // Windows
  'TEMP',
  'TMP',
  'ComSpec',
  'PATHEXT',
  'SystemRoot',
  'SystemDrive',
  'windir',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'OS',
]);

/**
 * A name that may carry authority or an endpoint. Matched on WORD boundaries
 * (`_` separated segments) so `PATH` and `PATHEXT` survive while
 * `AGENT_RUNTIME_CORE_TOKEN`, `GEMINI_API_KEY` and `EVOLITH_RAG_PG_URL` do not.
 */
export const CREDENTIAL_ENV_NAME_PATTERN =
  /(^|_)(TOKEN|TOKENS|SECRET|SECRETS|PASSWORD|PASSWD|PASS|PWD|CREDENTIAL|CREDENTIALS|APIKEY|KEY|KEYS|AUTH|AUTHORIZATION|SESSION|COOKIE|SIGNATURE|SIGNING|CERT|CERTIFICATE|PRIVATE|DSN|URL|URI|ENDPOINT|CONNECTIONSTRING|CONN)($|_)/i;

/** True when a variable NAME may carry a credential or an endpoint. */
export function isCredentialEnvName(name: string): boolean {
  return CREDENTIAL_ENV_NAME_PATTERN.test(name);
}

export interface CapabilityEnvInput {
  /** The environment to draw allowlisted values FROM (normally `process.env`). */
  readonly parentEnv: Readonly<Record<string, string | undefined>>;
  /** Names copied from the parent. Defaults to {@link DEFAULT_CAPABILITY_ENV_ALLOWLIST}. */
  readonly allowlist?: readonly string[];
  /** Extra names appended to the default allowlist (instead of replacing it). */
  readonly extraAllowlist?: readonly string[];
  /** Values passed explicitly by the host, not read from the ambient environment. */
  readonly explicit?: Readonly<Record<string, string>>;
  /** Variables the runtime itself injects (the request payload). */
  readonly payload?: Readonly<Record<string, string>>;
}

export interface CapabilityEnvResult {
  /** The exact environment the child process receives. */
  readonly env: Record<string, string>;
  /** Names a caller asked for and did NOT get, because they look like credentials. */
  readonly denied: readonly string[];
}

/** Case-insensitive lookup — Windows environment names are not case sensitive. */
function lookup(
  parentEnv: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const direct = parentEnv[name];
  if (direct !== undefined) return direct;
  const upper = name.toUpperCase();
  for (const key of Object.keys(parentEnv)) {
    if (key.toUpperCase() === upper) return parentEnv[key];
  }
  return undefined;
}

/**
 * Build the environment a spawned capability receives.
 *
 * Invariant (asserted by `harness-capability-env.spec.ts`): for every key `k`
 * in the returned `env`, `isCredentialEnvName(k) === false` — regardless of what
 * the parent environment, the allowlist, the explicit values or the payload
 * contained.
 */
export function buildCapabilityEnv(input: CapabilityEnvInput): CapabilityEnvResult {
  const allowlist = input.allowlist ?? DEFAULT_CAPABILITY_ENV_ALLOWLIST;
  const names = [...allowlist, ...(input.extraAllowlist ?? [])];
  const env: Record<string, string> = {};
  const denied: string[] = [];

  const put = (name: string, value: string | undefined): void => {
    if (value === undefined) return;
    if (isCredentialEnvName(name)) {
      if (!denied.includes(name)) denied.push(name);
      return;
    }
    env[name] = value;
  };

  for (const name of names) put(name, lookup(input.parentEnv, name));
  for (const [name, value] of Object.entries(input.explicit ?? {})) put(name, value);
  for (const [name, value] of Object.entries(input.payload ?? {})) put(name, value);

  return { env, denied };
}
