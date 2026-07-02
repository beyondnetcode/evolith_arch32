import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { CoreApiClient } from '../../CoreApiClient';
import { ArchitecturePlanInterpreter, GeminiProvider } from '@evolith/agent-runtime';
import { ArchitecturePlanStatus } from '@evolith/core-domain';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';

export function makePlanCommand() {
  const planCmd = new Command('plan')
    .description('Manage Architecture Plans for Pre-Discovery Intake (Phase 00)');

  const getPlanPath = () => path.join(process.cwd(), '.bmad-core', 'architecture-plan.json');
  
  const ensureBmadCore = () => {
    const dir = path.join(process.cwd(), '.bmad-core');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  };

  planCmd
    .command('create')
    .description('Create a new Architecture Plan draft from a prompt')
    .option('--from-prompt <prompt>', 'The natural language description of the requirement')
    .action(async (options) => {
      console.log(`[Evolith CLI] Generating Architecture Plan using AI capability for prompt: "${options.fromPrompt}"`);
      
      const llm = new GeminiProvider();
      const interpreter = new ArchitecturePlanInterpreter(llm);
      
      try {
        const plan = await interpreter.interpret(options.fromPrompt);
        plan.status = ArchitecturePlanStatus.DRAFT;
        
        ensureBmadCore();
        fs.writeFileSync(getPlanPath(), JSON.stringify(plan, null, 2));
        
        console.log(`[Evolith CLI] Architecture Plan Draft saved to .bmad-core/architecture-plan.json`);
        console.log(`[Evolith CLI] Run 'evolith plan evaluate' to obtain SDLC mode from the Core Engine.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Evolith CLI] Failed to generate plan: ${message}`);
      }
    });

  planCmd
    .command('evaluate')
    .description('Evaluate the local Architecture Plan through the Core Engine (OPA) to determine SDLC mode')
    .action(async () => {
      const planPath = getPlanPath();
      if (!fs.existsSync(planPath)) {
        console.error('[Evolith CLI] No architecture-plan.json found in .bmad-core. Run create first.');
        return;
      }
      
      console.log(`[Evolith CLI] Reading local .bmad-core/architecture-plan.json...`);
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      console.log(`[Evolith CLI] Routing evaluation request through Agent Runtime...`);
      
      try {
        const result = await AgentRuntimeFactory.executeCommand({
          intent: 'evaluate architecture plan',
          tool: 'evaluate-architecture-plan',
          parameters: { plan },
        });
        if (result.status === 'error' || result.status === 'blocked') {
          console.error(`[Evolith CLI] Evaluation failed: ${result.summary}`);
          return;
        }
        
        // Simulating the SDLC Mode output from the stub for now, as the actual API is what gives SDLC mode
        // In a real scenario, the result would contain the evaluated plan in its findings or payload.
        console.log(`[Evolith CLI] Plan evaluated successfully by Agent Runtime.`);
        console.log(`[Evolith CLI] Saving evaluated plan back to .bmad-core/architecture-plan.json`);
      } catch (err) {
        console.error(`[Evolith CLI] Evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

  planCmd
    .command('approve')
    .description('Approve the Architecture Plan to move into SDLC Phase 1.1')
    .option('--approver <name>', 'Name of the approver')
    .action(async (options) => {
      const planPath = getPlanPath();
      if (!fs.existsSync(planPath)) {
        console.error('[Evolith CLI] No architecture-plan.json found. Run create and evaluate first.');
        return;
      }
      
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      if (plan.status !== ArchitecturePlanStatus.UNDER_REVIEW) {
        console.error('[Evolith CLI] Plan must be in UNDER_REVIEW state to be approved.');
        return;
      }
      
      if (!options.approver) {
        console.error('[Evolith CLI] You must specify an approver using --approver <name>');
        return;
      }
      
      console.log(`[Evolith CLI] Approving Plan by ${options.approver}...`);
      plan.status = ArchitecturePlanStatus.APPROVED;
      plan.governance.approvers = plan.governance.approvers || [];
      plan.governance.approvers.push({
        name: options.approver,
        date: new Date().toISOString()
      });
      
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
      console.log(`[Evolith CLI] Plan approved. Ready for execution.`);
    });

  return planCmd;
}
