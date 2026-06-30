/**
 * Runnable example — validate a Discovery gate end-to-end through the Evolith
 * Agent Runtime using the DEFAULT (stub) adapters. No Hermes, no live Core, no
 * `.harness` checkout required (design rule #5).
 *
 *   npm --workspace @evolith/agent-runtime run build   # produce dist/
 *   node packages/agent-runtime/examples/validate-discovery-gate.mjs
 *
 * It runs two scenarios (artifacts present → passed, missing → blocked) and a
 * policy-denied scenario, rendering each result via the CLI gateway.
 */

import {
  createAgentRuntime,
  parseAgentRuntimeRequest,
  CliCommunicationGatewayAdapter,
  StubPolicyValidationAdapter,
} from '../dist/index.js';

const gateway = new CliCommunicationGatewayAdapter();

function discoveryRequest(present) {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    requested_by: 'tracker_chat',
    intent: 'validate_discovery_gate',
    runtime: 'evolith_agent_runtime',
    tool: 'validate-discovery-gate',
    correlation_id: 'demo-corr-1',
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: present, gate: 'prd_readiness' },
  });
}

async function main() {
  console.log('=== Scenario 1: all required artifacts present ===');
  {
    const { runtime, deps } = createAgentRuntime();
    const result = await runtime.handle(discoveryRequest(['prd']));
    console.log(await gateway.present(result));
    console.log('trace events:', deps.tracker.events.map((e) => e.type).join(' → '));
  }

  console.log('\n=== Scenario 2: mandatory artifact missing (blocked) ===');
  {
    const { runtime } = createAgentRuntime();
    const result = await runtime.handle(discoveryRequest([]));
    console.log(await gateway.present(result));
    console.log('result JSON:\n' + JSON.stringify(result, null, 2));
  }

  console.log('\n=== Scenario 3: capability ran but org policy denies (OPA) ===');
  {
    const denyAll = new StubPolicyValidationAdapter(() => [
      { ruleId: 'org.requires_second_reviewer', message: 'Discovery gate needs a second reviewer.', severity: 'error' },
    ]);
    const { runtime } = createAgentRuntime({ policy: denyAll });
    const result = await runtime.handle(discoveryRequest(['prd']));
    console.log(await gateway.present(result));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
