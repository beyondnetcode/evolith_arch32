import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { assertScanned } from '../lib/coverage.mjs';

const ROOT = path.resolve(process.env.EVOLITH_TRACKING_ROOT || '.');
const MEMORY_DIR = path.join(ROOT, '.harness', 'memory');
const SCHEMA_PATH = path.join(ROOT, '.harness', 'schemas', 'progress-audit.schema.json');

function run() {
  // GT-578: both early exits below printed a green `✅ [OK] ... skipping
  // validation.` and exited 0. `.harness/memory/` has never existed in this
  // repository — `git log -- .harness/memory` is empty — so this gate has never
  // validated a single record while contributing a ✅ to every governance run.
  //
  // The honest fix is not to turn it red: creating or retiring the agent-memory
  // corpus is a decision outside this script. It is to stop claiming a pass.
  // An inert gate must announce that it is inert, every run, in the words a
  // reader would need to act on it.
  const INERT = (where, why) => {
    console.warn(
      `⚠ [INERT] Agent memory validation did not run: ${why}\n` +
      `  Looked in: ${where}\n` +
      `  This is NOT a pass. Nothing was validated. Exiting 0 because the corpus is\n` +
      `  optional and its absence is not this script's to fix — either populate\n` +
      `  .harness/memory/*.jsonl, or retire this gate. A ✅ here would be a lie.`,
    );
    process.exit(0);
  };

  if (!fs.existsSync(MEMORY_DIR)) {
    INERT(MEMORY_DIR, 'the agent memory directory does not exist');
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.jsonl'));
  assertScanned(files.length, {
    what: 'agent memory logs (*.jsonl)',
    where: MEMORY_DIR,
    allowEmpty: true,
    reason: 'the corpus is optional; an empty one is reported as INERT rather than as a pass, so it cannot be mistaken for a check that ran.',
  });
  if (files.length === 0) {
    INERT(MEMORY_DIR, 'the directory exists but holds zero .jsonl logs');
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ [ERROR] Missing schema: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  
  const validate = ajv.compile(schema);
  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(MEMORY_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    lines.forEach((line, index) => {
      let record;
      try {
        record = JSON.parse(line);
      } catch (err) {
        console.error(`❌ [ERROR] File ${file}:${index + 1} is not valid JSON`);
        hasErrors = true;
        return;
      }
      
      const valid = validate(record);
      if (!valid) {
        console.error(`❌ [ERROR] File ${file}:${index + 1} validation failed:`);
        for (const error of validate.errors) {
          console.error(`   - ${error.instancePath} ${error.message}`);
        }
        hasErrors = true;
      }
    });
  }

  if (hasErrors) {
    console.error(`\n❌ Agent memory validation failed.`);
    process.exit(1);
  }

  console.log(`✅ [OK] Validated ${files.length} agent memory log(s) under ${MEMORY_DIR}.`);
}

run();
