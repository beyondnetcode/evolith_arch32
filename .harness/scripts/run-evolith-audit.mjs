#!/usr/bin/env node

/**
 * run-evolith-audit — Winston architectural audit prompt printer.
 *
 * Handles the prompt-based modes (architectural, BMAD) that require an LLM
 * context. Does NOT handle executable audits (topology, deep) — those have
 * their own entry points.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

async function main() {
  const args = process.argv.slice(2);
  const language = args.includes('--es') ? 'es' : 'en';
  const mode = args.includes('--bmad') ? 'bmad' : args.includes('--all') ? 'all' : 'architectural';

  const playbookFile = language === 'es' ? 'winston-audit-playbook.es.md' : 'winston-audit-playbook.md';
  const playbookPath = path.join(rootDir, '.harness', 'playbooks', playbookFile);

  try {
    const content = await fs.readFile(playbookPath, 'utf8');

    const architecturalMatch = content.match(/## The Audit Prompt\n\nTo execute an audit with Winston, provide the following prompt to your active LLM context \(e\.g\. MCP, IDE, or Evolith CLI\):\n\n```markdown\n([\s\S]*?)```/);
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
      console.log('(e.g., Cursor, GitHub Copilot, Evolith CLI, or MCP interface) to start');
      console.log('the analysis.\n');
      console.log('Usage:');
      console.log('  node .harness/scripts/run-evolith-audit.mjs                  # Architectural audit (EN)');
      console.log('  node .harness/scripts/run-evolith-audit.mjs --es             # Auditoría arquitectónica (ES)');
      console.log('  node .harness/scripts/run-evolith-audit.mjs --bmad           # BMAD Agent Evolution (EN)');
      console.log('  node .harness/scripts/run-evolith-audit.mjs --bmad --es      # Evolución BMAD (ES)');
      console.log('  node .harness/scripts/run-evolith-audit.mjs --all            # Both prompts combined');
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
