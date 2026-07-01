#!/usr/bin/env node

/**
 * run-evolith-intelligent-data-audit — Winston intelligent data strength audit.
 *
 * Evaluates the strength of Evolith Core as intelligent data by checking
 * the implementation status of WS1-WS9 workstreams defined in
 * evolith-core-intelligent-data-strength-assessment.md.
 *
 * Usage:
 *   node .harness/scripts/run-evolith-intelligent-data-audit.mjs          # Full audit (EN)
 *   node .harness/scripts/run-evolith-intelligent-data-audit.mjs --es     # Auditoría completa (ES)
 *   node .harness/scripts/run-evolith-intelligent-data-audit.mjs --ws1    # Check only WS1
 *   node .harness/scripts/run-evolith-intelligent-data-audit.mjs --report # Generate report only
 *   node .harness/scripts/run-evolith-intelligent-data-audit.mjs --gap-format # Output in gap-tracking format
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const WORKSTREAMS = [
  {
    id: 'WS1',
    name: 'Ruleset Coverage (Core Validation)',
    checks: [
      { name: 'f1-modular-monolith ruleset exists', path: 'rulesets/topologies/progressive-axis/modular-monolith' },
      { name: 'f2-distributed-modules ruleset exists', path: 'rulesets/topologies/progressive-axis/distributed-modules' },
      { name: 'f3-microservices ruleset exists', path: 'rulesets/topologies/progressive-axis/microservices' },
      { name: 'compliance-baseline ruleset exists', path: 'rulesets/compliance-baseline' },
      { name: 'definition-of-done ruleset exists', path: 'rulesets/definition-of-done' },
      { name: 'engineering-manifesto ruleset exists', path: 'rulesets/engineering-manifesto' },
      { name: 'repository-taxonomy ruleset exists', path: 'rulesets/repository-taxonomy' },
      { name: 'phase-gates ruleset exists', path: 'rulesets/phase-gates' },
      { name: 'quality-thresholds ruleset exists', path: 'rulesets/quality-thresholds' },
      { name: 'satellite-contracts ruleset exists', path: 'rulesets/satellite-contracts' },
      { name: 'executive-scorecards ruleset exists', path: 'rulesets/executive-scorecards' },
    ]
  },
  {
    id: 'WS2',
    name: 'Architecture Validation',
    checks: [
      { name: 'CLI validate command exists', path: 'sdk/cli/src/commands/validate' },
      { name: 'Architecture rules for F1/F2/F3', path: 'rulesets/architecture' },
      { name: 'OPA policies for architecture', path: 'rulesets/architecture/opa' },
    ]
  },
  {
    id: 'WS3',
    name: 'Executable SDLC Engine',
    checks: [
      { name: 'SDLC handoff command exists', path: 'sdk/cli/src/commands/sdlc' },
      { name: 'Gate evaluation logic exists', path: 'packages/core-domain/src/gates' },
      { name: 'Phase transition logic exists', path: 'packages/core-domain/src/phases' },
    ]
  },
  {
    id: 'WS4',
    name: 'MCP Server at 100%',
    checks: [
      { name: 'MCP server exists', path: 'packages/mcp-server/src' },
      { name: 'MCP tools for evaluation', path: 'packages/mcp-server/src/tools' },
      { name: 'MCP resources for corpus', path: 'packages/mcp-server/src/resources' },
      { name: 'WatcherService integration', path: 'packages/mcp-server/src/watcher' },
    ]
  },
  {
    id: 'WS5',
    name: 'core-api (REST)',
    checks: [
      { name: 'Core API exists', path: 'apps/core-api/src' },
      { name: 'REST controllers for evaluation', path: 'apps/core-api/src/presentation/controllers' },
      { name: 'OpenAPI specification', path: 'apps/core-api/src/openapi' },
    ]
  },
  {
    id: 'WS6',
    name: 'Remaining Stub Commands',
    checks: [
      { name: 'agents command exists', path: 'sdk/cli/src/commands/agents' },
      { name: 'upgrade command exists', path: 'sdk/cli/src/commands/upgrade' },
      { name: 'docs command exists', path: 'sdk/cli/src/commands/docs' },
      { name: 'scaffold command exists', path: 'sdk/cli/src/commands/architecture/scaffold' },
    ]
  },
  {
    id: 'WS7',
    name: 'New Target Design',
    checks: [
      { name: 'Evidence Graph implementation', path: 'packages/core-domain/src/evidence' },
      { name: 'Gate Decision model', path: 'packages/core-domain/src/gates/decision' },
      { name: 'Phase Transition model', path: 'packages/core-domain/src/phases/transition' },
      { name: 'Provider ports model', path: 'packages/core-domain/src/providers' },
      { name: 'Tenant authority model', path: 'packages/core-domain/src/tenancy' },
    ]
  },
  {
    id: 'WS8',
    name: 'Extensibility',
    checks: [
      { name: 'Plugin system for commands', path: 'sdk/cli/src/plugins' },
      { name: 'Contribution validation', path: 'sdk/cli/src/contributions' },
    ]
  },
  {
    id: 'WS9',
    name: 'Quality and Release-Gate',
    checks: [
      { name: 'Test suite exists', path: 'sdk/cli/src/__tests__' },
      { name: 'E2E tests exist', path: 'sdk/cli/src/__tests__/e2e' },
      { name: 'Bilingual parity check', path: '.harness/scripts/ci/04-check-bilingual-parity.mjs' },
      { name: 'Coverage report', path: 'COVERAGE_REPORT.md' },
    ]
  },
];

async function checkPathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function evaluateWorkstream(ws, language) {
  const results = [];
  
  for (const check of ws.checks) {
    const fullPath = path.join(rootDir, check.path);
    const exists = await checkPathExists(fullPath);
    results.push({
      name: check.name,
      path: check.path,
      exists,
      status: exists ? 'PASS' : 'FAIL'
    });
  }
  
  const passed = results.filter(r => r.exists).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  return {
    id: ws.id,
    name: ws.name,
    results,
    passed,
    total,
    percentage,
    status: percentage === 100 ? 'COMPLETE' : percentage >= 50 ? 'PARTIAL' : 'INCOMPLETE'
  };
}

async function generateReport(language) {
  const report = {
    timestamp: new Date().toISOString(),
    language,
    workstreams: [],
    summary: {
      totalChecks: 0,
      passedChecks: 0,
      overallPercentage: 0,
      overallStatus: ''
    }
  };

  for (const ws of WORKSTREAMS) {
    const wsResult = await evaluateWorkstream(ws, language);
    report.workstreams.push(wsResult);
    report.summary.totalChecks += wsResult.total;
    report.summary.passedChecks += wsResult.passed;
  }

  report.summary.overallPercentage = Math.round(
    (report.summary.passedChecks / report.summary.totalChecks) * 100
  );
  
  if (report.summary.overallPercentage === 100) {
    report.summary.overallStatus = 'FULLY_EXECUTABLE';
  } else if (report.summary.overallPercentage >= 75) {
    report.summary.overallStatus = 'MOSTLY_EXECUTABLE';
  } else if (report.summary.overallPercentage >= 50) {
    report.summary.overallStatus = 'PARTIALLY_EXECUTABLE';
  } else {
    report.summary.overallStatus = 'MINIMAL_EXECUTABLE';
  }

  return report;
}

function printReport(report) {
  console.log('\n========================================================================');
  console.log('🤖 WINSTON — INTELLIGENT DATA STRENGTH AUDIT');
  console.log('========================================================================\n');
  
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Language: ${report.language.toUpperCase()}`);
  console.log(`Overall Status: ${report.summary.overallStatus}`);
  console.log(`Overall Coverage: ${report.summary.overallPercentage}% (${report.summary.passedChecks}/${report.summary.totalChecks} checks passed)`);
  
  console.log('\n------------------------------------------------------------------------');
  console.log('WORKSTREAM DETAILS');
  console.log('------------------------------------------------------------------------\n');
  
  for (const ws of report.workstreams) {
    const statusIcon = ws.status === 'COMPLETE' ? '✅' : ws.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${ws.id}: ${ws.name} (${ws.percentage}%)`);
    
    for (const check of ws.results) {
      const checkIcon = check.exists ? '  ✓' : '  ✗';
      console.log(`${checkIcon} ${check.name}`);
      if (!check.exists) {
        console.log(`    Path: ${check.path}`);
      }
    }
    console.log('');
  }
  
  console.log('------------------------------------------------------------------------');
  console.log('RECOMMENDATIONS');
  console.log('------------------------------------------------------------------------\n');
  
  const incompleteWorkstreams = report.workstreams.filter(ws => ws.status !== 'COMPLETE');
  
  if (incompleteWorkstreams.length === 0) {
    console.log('✅ All workstreams are complete. The core is fully executable as intelligent data.');
  } else {
    console.log('The following workstreams need attention:\n');
    
    for (const ws of incompleteWorkstreams) {
      console.log(`• ${ws.id} (${ws.percentage}%): ${ws.name}`);
      const failedChecks = ws.results.filter(r => !r.exists);
      for (const check of failedChecks) {
        console.log(`  - Missing: ${check.name}`);
      }
    }
    
    console.log('\nPriority order (based on dependencies):');
    console.log('1. WS1: Ruleset Coverage (foundation for all validation)');
    console.log('2. WS2: Architecture Validation (builds on rulesets)');
    console.log('3. WS3: SDLC Engine (builds on rulesets and architecture)');
    console.log('4. WS4: MCP Server (consumes all previous workstreams)');
    console.log('5. WS5: core-api REST (parallel to MCP)');
    console.log('6. WS6: Stub Commands (independent)');
    console.log('7. WS7: Target Design (requires ADRs)');
    console.log('8. WS8: Extensibility (after core is stable)');
    console.log('9. WS9: Quality Gate (final validation)');
  }
  
  console.log('\n========================================================================');
  console.log('END OF AUDIT REPORT');
  console.log('========================================================================\n');
}

function generateGapEntries(report) {
  const gapEntries = [];
  let gapId = 283; // Start after the last known GT-282
  
  for (const ws of report.workstreams) {
    if (ws.status === 'COMPLETE') continue;
    
    const failedChecks = ws.results.filter(r => !r.exists);
    
    for (const check of failedChecks) {
      const component = getComponentFromWorkstream(ws.id);
      const criticality = getCriticalityFromWorkstream(ws.id);
      const complexity = getComplexityFromCheck(check);
      
      gapEntries.push({
        id: `GT-${gapId}`,
        gap: `${check.name} — ${check.path}`,
        component,
        phase: 'Cross',
        criticality,
        complexity,
        status: 'OPEN',
        workstream: ws.id,
        path: check.path
      });
      
      gapId++;
    }
  }
  
  return gapEntries;
}

function getComponentFromWorkstream(wsId) {
  const componentMap = {
    'WS1': 'Rulesets',
    'WS2': 'Architecture',
    'WS3': 'Core Domain',
    'WS4': 'MCP',
    'WS5': 'BFF API',
    'WS6': 'CLI',
    'WS7': 'Core Domain',
    'WS8': 'CLI',
    'WS9': 'Governance'
  };
  return componentMap[wsId] || 'Unknown';
}

function getCriticalityFromWorkstream(wsId) {
  const criticalityMap = {
    'WS1': 'P0',
    'WS2': 'P0',
    'WS3': 'P0',
    'WS4': 'P0',
    'WS5': 'P1',
    'WS6': 'P1',
    'WS7': 'P1',
    'WS8': 'P2',
    'WS9': 'P1'
  };
  return criticalityMap[wsId] || 'P2';
}

function getComplexityFromCheck(check) {
  // Simple heuristic based on path depth
  const depth = check.path.split('/').length;
  if (depth <= 3) return 'S';
  if (depth <= 5) return 'M';
  return 'L';
}

function printGapFormat(report) {
  const gapEntries = generateGapEntries(report);
  
  console.log('\n========================================================================');
  console.log('📋 GAP-TRACKING FORMAT — FOR REGISTRATION');
  console.log('========================================================================\n');
  
  console.log('Copy the following entries to gap-tracking.md:');
  console.log('Order: pending first (by criticality P0→P3, then complexity XS→XL)\n');
  
  // Sort by criticality then complexity
  const criticalityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
  const complexityOrder = { 'XS': 0, 'S': 1, 'M': 2, 'L': 3, 'XL': 4 };
  
  gapEntries.sort((a, b) => {
    const critDiff = criticalityOrder[a.criticality] - criticalityOrder[b.criticality];
    if (critDiff !== 0) return critDiff;
    return complexityOrder[a.complexity] - complexityOrder[b.complexity];
  });
  
  for (const entry of gapEntries) {
    console.log(`| [\`${entry.id}\`](./gap-reference-catalog.md#${entry.id.toLowerCase()}) | ${entry.gap} | \`${entry.component}\` | ${entry.phase} | ${entry.criticality} | ${entry.complexity} | \`${entry.status}\` |`);
  }
  
  console.log('\n------------------------------------------------------------------------');
  console.log('GAP REFERENCE CATALOG ENTRIES');
  console.log('------------------------------------------------------------------------\n');
  
  for (const entry of gapEntries) {
    console.log(`#### ${entry.id}`);
    console.log('');
    console.log(`**Title:** ${entry.gap}`);
    console.log('');
    console.log(`- **Purpose:** Implement ${entry.gap} as part of the ${entry.workstream} workstream.`);
    console.log(`- **Evidence:** Path \`${entry.path}\` does not exist.`);
    console.log(`- **Complexity:** ${entry.complexity}`);
    console.log(`- **Done when:**`);
    console.log(`  - [ ] The required file or directory exists at the specified path.`);
    console.log(`  - [ ] Tests verify the implementation.`);
    console.log('');
  }
  
  console.log('========================================================================');
  console.log('END OF GAP-TRACKING FORMAT');
  console.log('========================================================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const language = args.includes('--es') ? 'es' : 'en';
  const reportOnly = args.includes('--report');
  const gapFormat = args.includes('--gap-format');
  const specificWs = args.find(arg => arg.startsWith('--ws'));
  
  let workstreamsToCheck = WORKSTREAMS;
  
  if (specificWs) {
    const wsId = specificWs.replace('--ws', '').toUpperCase();
    workstreamsToCheck = WORKSTREAMS.filter(ws => ws.id === wsId);
    
    if (workstreamsToCheck.length === 0) {
      console.error(`Error: Unknown workstream ${wsId}. Valid options: WS1-WS9`);
      process.exit(1);
    }
  }
  
  const report = await generateReport(language);
  
  if (reportOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else if (gapFormat) {
    printGapFormat(report);
  } else {
    printReport(report);
  }
  
  // Exit with error code if not fully complete
  if (report.summary.overallPercentage < 100) {
    process.exit(1);
  }
}

main().catch(console.error);
