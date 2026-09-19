import * as path from 'path';
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { IFileSystem } from '../../domain/interfaces';
import { describeRulesetsResolutionFailure, probeRulesetsLocation } from '../paths/rulesets-location';
import type { RuleOverridesDocument, RuleOverridesInput } from './rule-overrides';

/**
 * GT-678 — the satellite's override document, read and checked before anything runs.
 *
 * Raised for every way the document can be wrong: `evolith.yaml` names a path
 * that does not exist, escapes the satellite, is not JSON, or fails
 * `rule-overrides.schema.json`. It is a fault in the CALLER'S input, so the
 * surfaces map it to `SCHEMA_INVALID` (CLI exit 3, `invalid input`; REST 422)
 * — never to a warning, and never to a silently unchanged run, which is the
 * shape of the defect this row records.
 *
 * Matched by NAME at the surfaces (like `RulesetsNotFoundError`) so none of
 * them needs a cross-package `instanceof`.
 */
export class RuleOverridesInvalidError extends Error {
  readonly code = 'SCHEMA_INVALID';
  constructor(message: string) {
    super(message);
    this.name = 'RuleOverridesInvalidError';
  }
}

export const RULE_OVERRIDES_SCHEMA_FILE = 'rule-overrides.schema.json';

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Where a parsed `evolith.yaml` names its override document.
 *
 * Two manifest shapes are live (see `readSatelliteDeclaration`): the canonical
 * contract keeps it at `spec.rulesets.overrides`; the shape `evolith init`
 * writes has no `spec`, so a top-level `rulesets.overrides` is read there.
 * `undefined` means "none named", which is the clean-run default.
 */
export function readRuleOverridesRef(doc: unknown): string | undefined {
  const root = record(doc);
  if (!root) return undefined;
  const fromSpec = record(record(root['spec'])?.['rulesets'])?.['overrides'];
  const fromRoot = record(root['rulesets'])?.['overrides'];
  const ref = fromSpec ?? fromRoot;
  return typeof ref === 'string' && ref.trim() !== '' ? ref.trim() : undefined;
}

/**
 * Ajv's text for `additionalProperties` is «must NOT have additional
 * properties» — true and useless when the whole point of the closed schema is
 * to tell the author WHICH key is misspelt. Name it.
 */
function describeErrors(errors: readonly ErrorObject[]): string {
  return errors
    .map((e) => {
      const where = `document${e.instancePath}`;
      if (e.keyword === 'additionalProperties') {
        const key = String((e.params as { additionalProperty?: unknown }).additionalProperty);
        return `${where}: unknown key "${key}" (the override keys are enabled, severity, blocking, rationale, approvedBy, expiresOn)`;
      }
      return `${where} ${e.message ?? 'is invalid'}`;
    })
    .join('; ');
}

/**
 * Reads and validates the document. One compiled schema per corpus, cached, so
 * a long-running server pays for Ajv once.
 */
export class RuleOverridesLoader {
  private readonly ajv: Ajv;
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(private readonly fs: IFileSystem) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * @param satellitePath root of the repository under evaluation
   * @param ref           `spec.rulesets.overrides`, relative to that root
   * @param corePath      where the corpus — and its `schema/` — lives
   */
  async load(satellitePath: string, ref: string, corePath: string): Promise<RuleOverridesInput> {
    const root = path.resolve(satellitePath);
    const resolved = path.resolve(root, ref);
    // Contained in the satellite, or refused: an override document is the
    // tenant's own configuration, and reading one from outside the tree under
    // evaluation would let a path in `evolith.yaml` reach anywhere the process
    // can (the CWE-22 class this repository has already closed once).
    const relative = path.relative(root, resolved);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new RuleOverridesInvalidError(
        `spec.rulesets.overrides "${ref}" resolves outside the satellite (${root}); ` +
          'the override document must live inside the repository it configures.',
      );
    }
    const source = relative.split(path.sep).join('/');

    if (!(await this.fs.exists(resolved))) {
      throw new RuleOverridesInvalidError(
        `spec.rulesets.overrides names "${ref}" but no file exists at ${resolved}. ` +
          'Create the document (see rule-overrides.schema.json) or remove the reference; ' +
          'a named document that is missing is never silently skipped.',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await this.fs.readFile(resolved));
    } catch (err: unknown) {
      throw new RuleOverridesInvalidError(
        `${source} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const validate = await this.validatorFor(corePath);
    if (!validate(parsed)) {
      throw new RuleOverridesInvalidError(
        `${source} does not satisfy ${RULE_OVERRIDES_SCHEMA_FILE}: ${describeErrors(validate.errors ?? [])}`,
      );
    }

    return { document: parsed as RuleOverridesDocument, source };
  }

  private async validatorFor(corePath: string): Promise<ValidateFunction> {
    const cached = this.validators.get(corePath);
    if (cached) return cached;

    const { rulesetsRoot, probes } = await probeRulesetsLocation(
      corePath,
      { exists: (p) => this.fs.exists(p), readdirNames: (p) => this.fs.readdirNames(p) },
      path.sep,
    );
    if (!rulesetsRoot) {
      // Fail closed with the probe trail rather than guessing a layout: a
      // hand-built `<core>/rulesets` fallback is the dead-path family GT-566
      // closed, and a document nobody could validate would be applied on faith.
      throw new RuleOverridesInvalidError(
        `Cannot validate an override document: ${describeRulesetsResolutionFailure(corePath, probes)}`,
      );
    }
    const schemaPath = path.join(rulesetsRoot, 'schema', RULE_OVERRIDES_SCHEMA_FILE);

    let schema: unknown;
    try {
      schema = JSON.parse(await this.fs.readFile(schemaPath));
    } catch (err: unknown) {
      // Not the tenant's fault, but not something to proceed past either: a
      // document nobody could validate would be applied on faith.
      throw new RuleOverridesInvalidError(
        `Cannot validate an override document: ${RULE_OVERRIDES_SCHEMA_FILE} was not readable at ` +
          `${schemaPath} (${err instanceof Error ? err.message : String(err)}). The corpus at ` +
          `${corePath} must ship its schema/ directory.`,
      );
    }

    const compiled = this.ajv.compile(schema as Record<string, unknown>);
    this.validators.set(corePath, compiled);
    return compiled;
  }
}
