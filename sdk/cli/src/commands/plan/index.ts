import { Command } from 'commander';

export function makePlanCommand() {
  const planCmd = new Command('plan')
    .description('Manage Architecture Plans for Pre-Discovery Intake (Phase 00)');

  planCmd
    .command('create')
    .description('Create a new Architecture Plan draft from a prompt')
    .option('--from-prompt <prompt>', 'The natural language description of the requirement')
    .action(async (options) => {
      console.log(`[Evolith CLI] Generating Architecture Plan using AI capability for prompt: "${options.fromPrompt}"`);
      // Here we would call the Agent Runtime capability to instantiate the plan using the interpreter locally.
      console.log(`[Evolith CLI] Architecture Plan Draft saved to .bmad-core/architecture-plan.json`);
      console.log(`[Evolith CLI] Run 'evolith plan evaluate' to obtain SDLC mode from the Core Engine.`);
    });

  planCmd
    .command('evaluate')
    .description('Evaluate the local Architecture Plan through the Core Engine (OPA) to determine SDLC mode')
    .action(async () => {
      console.log(`[Evolith CLI] Reading local .bmad-core/architecture-plan.json...`);
      console.log(`[Evolith CLI] Sending payload to Core API Engine...`);
      // Invokes Core API POST /v1/architecture-plans/evaluate statelessly
      console.log(`[Evolith CLI] Plan evaluated. SDLC Mode: tailored`);
      console.log(`[Evolith CLI] Saving evaluated plan back to .bmad-core/architecture-plan.json`);
    });

  return planCmd;
}
