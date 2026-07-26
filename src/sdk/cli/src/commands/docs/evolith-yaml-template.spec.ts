/**
 * GT-453: the bundled `templates/evolith.yaml.example` MUST validate against the
 * CLI's own satellite contract schema (`evolith-yaml.schema.json`, apiVersion
 * `evolith.dev/v1`). This is a regression guard against the template drifting
 * back to the legacy `coreRef/governance/product/metadata` shape, which the
 * CLI's own `validate` command rejects.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.resolve(
  __dirname,
  '../../../../../rulesets/schema/evolith-yaml.schema.json',
);
const TEMPLATE_PATH = path.resolve(
  __dirname,
  '../../../templates/evolith.yaml.example',
);

function loadValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  return ajv.compile(schema);
}

describe('bundled evolith.yaml.example template (GT-453)', () => {
  it('validates against evolith-yaml.schema.json (v1 satellite contract)', () => {
    const validate = loadValidator();
    const manifest = yaml.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'));

    const ok = validate(manifest);
    if (!ok) {
      throw new Error(
        `templates/evolith.yaml.example failed schema validation: ${JSON.stringify(
          validate.errors,
          null,
          2,
        )}`,
      );
    }
    expect(ok).toBe(true);
  });

  it('declares the v1 apiVersion, Satellite kind and an integer SDLC phase', () => {
    const manifest = yaml.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8')) as {
      apiVersion?: string;
      kind?: string;
      spec?: { sdlc?: { currentPhase?: number } };
    };

    expect(manifest.apiVersion).toBe('evolith.dev/v1');
    expect(manifest.kind).toBe('Satellite');
    expect(Number.isInteger(manifest.spec?.sdlc?.currentPhase)).toBe(true);
  });
});
