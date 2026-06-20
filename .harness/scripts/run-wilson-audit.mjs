import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

async function main() {
  const language = process.argv[2] === '--es' ? 'es' : 'en';
  const playbookFile = language === 'es' ? 'wilson-audit-playbook.es.md' : 'wilson-audit-playbook.md';
  const playbookPath = path.join(rootDir, '.harness', 'playbooks', playbookFile);

  try {
    const content = await fs.readFile(playbookPath, 'utf8');
    const promptMatch = content.match(/```markdown\n([\s\S]*?)```/);
    
    if (promptMatch && promptMatch[1]) {
      console.log('\n========================================================================');
      console.log('🤖 WILSON AUDIT PROMPT (PRINCIPAL ARCHITECT)');
      console.log('========================================================================\n');
      console.log('Instructions: Copy the prompt below and paste it into your active LLM context');
      console.log('(e.g., Cursor, GitHub Copilot, Evolith Smart CLI, or MCP interface) to start');
      console.log('the deep architectural audit of Evolith Core.\n');
      console.log('------------------------------------------------------------------------\n');
      console.log(promptMatch[1].trim());
      console.log('\n------------------------------------------------------------------------');
      console.log('Note: Wilson is instructed to update the existing tracking boards directly.');
    } else {
      console.error('Error: Could not extract the prompt from the playbook.');
    }
  } catch (error) {
    console.error(`Error reading playbook at ${playbookPath}:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
