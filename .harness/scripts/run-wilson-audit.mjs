import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

async function main() {
  const args = process.argv.slice(2);
  const language = args.includes('--es') ? 'es' : 'en';
  const mode = args.includes('--topology') ? 'topology' : args.includes('--bmad') ? 'bmad' : args.includes('--all') ? 'all' : 'architectural';

  // Direct executable modes
  if (mode === 'topology') {
    const topologyScript = path.join(rootDir, '.harness/playbooks/topology-compliance-audit.mjs');
    const extraArgs = args.filter(a => a !== '--topology');
    const result = spawnSync('node', [topologyScript, ...extraArgs], { stdio: 'inherit', cwd: rootDir });
    process.exit(result.status ?? 1);
  }

  const playbookFile = language === 'es' ? 'wilson-audit-playbook.es.md' : 'wilson-audit-playbook.md';
  const playbookPath = path.join(rootDir, '.harness', 'playbooks', playbookFile);

  try {
    const content = await fs.readFile(playbookPath, 'utf8');

    const architecturalMatch = content.match(/## The Audit Prompt\n\nTo execute an audit with Winston, provide the following prompt to your active LLM context \(e\.g\. MCP, IDE, or Smart CLI\):\n\n```markdown\n([\s\S]*?)```/);
    const bmadMatch = content.match(/## The BMAD Agent Evolution Prompt\n\nTo execute a BMAD agent evolution analysis, provide the following prompt to your active LLM context:\n\n```markdown\n([\s\S]*?)```/);

    const prompts = [];
    if ((mode === 'architectural' || mode === 'all') && architecturalMatch) {
      prompts.push({ label: 'ARQUITECTÓNICO', prompt: architecturalMatch[1].trim() });
    }
    if ((mode === 'bmad' || mode === 'all') && bmadMatch) {
      prompts.push({ label: 'BMAD AGENT EVOLUTION', prompt: bmadMatch[1].trim() });
    }

    if (prompts.length === 0) {
      console.error(`Error: Could not extract prompts for mode "${mode}" from the playbook.`);
      process.exit(1);
    }

    for (const { label, prompt } of prompts) {
      console.log('\n========================================================================');
      console.log(`🤖 WINSTON — ${label}`);
      console.log('========================================================================\n');
      console.log('Instructions: Copy the prompt below and paste it into your active LLM context');
      console.log('(e.g., Cursor, GitHub Copilot, Evolith Smart CLI, or MCP interface) to start');
      console.log('the analysis.\n');
      console.log('Usage:');
      console.log('  node .harness/scripts/run-wilson-audit.mjs                      # Architectural audit (EN)');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --es                 # Auditoría arquitectónica (ES)');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --bmad               # BMAD Agent Evolution (EN)');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --bmad --es          # Evolución BMAD (ES)');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --all                # Both prompts combined');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --topology           # Topology compliance audit (Markdown)');
      console.log('  node .harness/scripts/run-wilson-audit.mjs --topology --markdown# Topology compliance audit (JSON)');
      console.log('\n------------------------------------------------------------------------\n');
      console.log(prompt);
      console.log('\n------------------------------------------------------------------------');
      console.log('Note: Winston is instructed to update the existing tracking boards directly.');
    }
  } catch (error) {
    console.error(`Error reading playbook at ${playbookPath}:`, error.message);
    process.exit(1);
  }
}

main().catch(console.error);
