#!/usr/bin/env node
/**
 * @file knowledge-wilson-review.mjs
 * @description Prepare a Wilson review prompt for a KI candidate.
 *
 * Reads a KI file, extracts the relevant fields, and outputs a structured
 * review prompt suitable for Winston (@winston) to evaluate.
 *
 * Usage:
 *   node .harness/scripts/knowledge-wilson-review.mjs <ki-file>
 *
 * Can be run manually or triggered via CI comment command:
 *   /wilson-review <ki-file>
 *
 * Exit codes:
 *   0 — prompt generated successfully
 *   1 — error (file not found, invalid YAML, etc.)
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function loadKiFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`KI file not found: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return yaml.load(content);
  } catch (error) {
    fail(`Invalid YAML in ${filePath}: ${error.message}`);
  }
}

function loadSourceRegistry(kiDoc) {
  if (!kiDoc.source_registry_id) return null;
  const srcPath = path.join(ROOT, 'reference', 'knowledge', 'intake', `${kiDoc.source_registry_id}.yaml`);
  if (!fs.existsSync(srcPath)) return null;
  try {
    return yaml.load(fs.readFileSync(srcPath, 'utf8'));
  } catch {
    return null;
  }
}

function buildReviewPrompt(kiDoc, srcDoc, kiFilePath) {
  const knowledgeId = kiDoc.knowledge_id;
  const currentStatus = kiDoc.promotion?.status || 'candidate';
  const topologies = kiDoc.assessment?.topologies || [];
  const maturity = kiDoc.assessment?.maturity || 'unknown';
  const trustLevel = kiDoc.assessment?.trust_level || 'unknown';

  return `# PROMPT: KNOWLEDGE INTAKE REVIEW — ${knowledgeId}

Act as **Winston** (\`@winston\`), the Principal Architect reviewing a knowledge intake candidate.

## Knowledge Candidate Under Review

- **ID:** ${knowledgeId}
- **Current Status:** ${currentStatus}
- **Source File:** ${kiFilePath}
- **Source Registry:** ${kiDoc.source_registry_id || '(none)'}
- **Source Class:** ${kiDoc.source?.class || '(none)'}
- **Source Author:** ${kiDoc.source?.author || '(none)'}
- **Source Work:** ${kiDoc.source?.work || '(none)'}
- **Rights Status:** ${kiDoc.source?.rights_status || '(none)'}

## Assessment

- **Trust Level:** ${trustLevel}
- **Portability:** ${kiDoc.assessment?.portability || '(none)'}
- **Maturity:** ${maturity}
- **Topologies:** ${topologies.join(', ') || '(none)'}
- **Preconditions:** ${(kiDoc.assessment?.preconditions || []).join(', ') || '(none)'}
- **Anti-patterns:** ${(kiDoc.assessment?.anti_patterns || []).join(', ') || '(none)'}
- **Alternatives:** ${(kiDoc.assessment?.alternatives || []).join(', ') || '(none)'}
- **Related Topologies:** ${(kiDoc.assessment?.related_topologies || []).join(', ') || '(none)'}
- **Concerns:** ${(kiDoc.assessment?.concerns || []).join(', ') || '(none)'}

## Synthesis

> ${kiDoc.synthesis || '(not provided)'}

${srcDoc ? `## Source Registry Entry

- **License:** ${srcDoc.source_license || '(none)'}
- **Retention Mode:** ${srcDoc.retention_mode || '(none)'}
- **Review Cadence:** ${srcDoc.review_cadence || '(none)'}
- **Content Fingerprint:** ${srcDoc.content_fingerprint || '(none)'}
` : ''}

## Review Instructions

Evaluate this knowledge intake candidate against the following criteria:

1. **Provenance Quality:** Is the source credible, properly attributed, and rights-managed?
2. **Assessment Accuracy:** Are topologies, maturity, trust level, and portability correctly assigned?
3. **Synthesis Quality:** Does the synthesis accurately capture the knowledge without misrepresenting the source?
4. **Topology Alignment:** Are the declared topologies valid accepted topology IDs?
5. **Anti-pattern Completeness:** Are relevant anti-patterns listed?
6. **Actionability:** Is this knowledge actionable and applicable to Evolith Core architectures?
7. **Status Readiness:** Is the candidate ready for the next promotion stage?

Respond with ONLY a single JSON object (no prose, no markdown fences):

{
  "knowledge_id": "${knowledgeId}",
  "verdict": "approve" | "approve-with-conditions" | "reject",
  "recommended_status": "${currentStatus}" | "evaluated" | "accepted" | "rejected",
  "findings": [
    {
      "criterion": "<review criterion name>",
      "severity": "error" | "warning" | "info",
      "title": "<short description>",
      "detail": "<explanation and recommendation>"
    }
  ],
  "conditions": ["<conditions for approve-with-conditions>"],
  "summary": "<1-2 sentence overall assessment>"
}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node .harness/scripts/knowledge-wilson-review.mjs <ki-file>');
    console.error('');
    console.error('Examples:');
    console.error('  node .harness/scripts/knowledge-wilson-review.mjs reference/knowledge/intake/KI-EVANS-AGGREGATE-001.yaml');
    console.error('');
    console.error('CI trigger:');
    console.error('  /wilson-review <ki-file>    (as a PR comment command)');
    process.exit(1);
  }

  const kiFileArg = args[0];
  const kiFilePath = path.resolve(ROOT, kiFileArg);

  console.log(`\n🔍 Wilson Knowledge Intake Review`);
  console.log(`   File: ${kiFileArg}`);

  const kiDoc = loadKiFile(kiFilePath);
  const srcDoc = loadSourceRegistry(kiDoc);

  console.log(`   Knowledge ID: ${kiDoc.knowledge_id}`);
  console.log(`   Status: ${kiDoc.promotion?.status || 'candidate'}`);
  console.log(`   Source: ${kiDoc.source?.author || '(none)'} — ${kiDoc.source?.work || '(none)'}`);

  const prompt = buildReviewPrompt(kiDoc, srcDoc, kiFileArg);

  const outputPath = path.join(ROOT, `.harness/tmp/wilson-review-${kiDoc.knowledge_id}.md`);
  const tmpDir = path.dirname(outputPath);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(outputPath, prompt, 'utf8');

  console.log(`\n📋 Review prompt generated and written to:`);
  console.log(`   ${outputPath}`);
  console.log(`\n--- Prompt Preview (first 20 lines) ---`);
  console.log(prompt.split('\n').slice(0, 20).join('\n'));
  console.log(`--- End Preview ---`);
  console.log(`\n   Total prompt length: ${prompt.length} characters`);

  console.log(`\n💡 To evaluate with Winston, provide the prompt content to your LLM context.`);
  console.log(`   Or use the CI command: /wilson-review ${kiFileArg}`);
}

main().catch((error) => {
  fail(error.message);
});
