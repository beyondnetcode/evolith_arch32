import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureOpa } from '../opa-runtime.mjs';

const ROOT = process.cwd();
const INTAKE_DIR = 'reference/knowledge/intake';
const SCHEMA = 'rulesets/schema/knowledge-intake.schema.json';
const OPA_POLICY = 'rulesets/opa/knowledge-intake.rego';
const OPA_TEST = 'rulesets/opa/knowledge-intake.test.rego';

export function validateKnowledgeIntake(root = ROOT) {
  const errors = [];
  const schemaPath = path.join(root, SCHEMA);
  const intakePath = path.join(root, INTAKE_DIR);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaPath, 'utf8')));
  const files = fs.existsSync(intakePath) ? fs.readdirSync(intakePath).filter((file) => /^KI-[A-Z0-9-]+\.ya?ml$/.test(file)).sort() : [];
  if (!files.length) errors.push(`${INTAKE_DIR} must contain at least one KI-*.yaml candidate`);
  for (const file of files) {
    const relative = `${INTAKE_DIR}/${file}`;
    let candidate;
    try { candidate = yaml.load(fs.readFileSync(path.join(intakePath, file), 'utf8')); }
    catch (error) { errors.push(`${relative}: invalid YAML (${error.message})`); continue; }
    if (!validate(candidate)) errors.push(`${relative}: ${ajv.errorsText(validate.errors, { separator: '; ' })}`);
    if (candidate?.promotion?.status === 'executable' && candidate?.source?.rights_status === 'citation-and-synthesis-only') {
      errors.push(`${relative}: executable promotion cannot retain a citation-and-synthesis-only source as its sole evidence`);
    }
  }
  return { files, errors };
}

async function run() {
  const result = validateKnowledgeIntake();
  const opa = await ensureOpa(ROOT);
  try { execFileSync(opa.binary, ['test', '--format=json', OPA_POLICY, OPA_TEST], { cwd: ROOT, encoding: 'utf8' }); }
  catch (error) { result.errors.push(`OPA policy tests failed: ${error.stderr || error.message}`); }
  if (result.errors.length) {
    console.error(`❌ Knowledge intake validation failed:\n- ${result.errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`✅ Knowledge intake validation passed for ${result.files.length} candidate(s); Native and OPA controls verified.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
