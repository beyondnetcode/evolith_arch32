import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(process.env.EVOLITH_TRACKING_ROOT || '.');
const MEMORY_DIR = path.join(ROOT, '.harness', 'memory');
const SCHEMA_PATH = path.join(ROOT, '.harness', 'schemas', 'progress-audit.schema.json');

function run() {
  if (!fs.existsSync(MEMORY_DIR)) {
    console.log(`✅ [OK] Agent memory directory does not exist, skipping validation.`);
    process.exit(0);
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.jsonl'));
  if (files.length === 0) {
    console.log(`✅ [OK] No agent memory jsonl files found, skipping validation.`);
    process.exit(0);
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

  console.log(`✅ [OK] Validated ${files.length} agent memory log(s) successfully.`);
}

run();
