import { Injectable } from '@nestjs/common';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { UserCancelledError } from '@evolith/core-domain/domain/errors';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  run: (state: Record<string, unknown>, goBack: () => void) => Promise<Record<string, unknown> | null>;
  validate?: (state: Record<string, unknown>) => string | undefined;  // Return error message or undefined
}

export interface WizardOptions {
  title: string;
  steps: WizardStep[];
  noInteractive?: boolean;
}

@Injectable()
export class WizardService {
  private currentState: Record<string, unknown> = {};
  private currentStepIndex = 0;
  private steps: WizardStep[] = [];
  private title = '';
  private noInteractive = false;

  async start(options: WizardOptions): Promise<Record<string, unknown> | null> {
    this.title = options.title;
    this.steps = options.steps;
    this.noInteractive = options.noInteractive ?? false;
    this.currentState = {};
    this.currentStepIndex = 0;

    if (this.noInteractive || !process.stdout.isTTY) {
      console.log(chalk.cyan(`Starting ${this.title} in non-interactive mode`));
      return this.runNonInteractive();
    }

    p.intro(chalk.cyan(this.title));

    while (this.currentStepIndex < this.steps.length) {
      const step = this.steps[this.currentStepIndex];
      
      const result = await this.runStep(step);
      
      if (result === null) {
        p.cancel('Wizard cancelled.');
        throw new UserCancelledError();
      }

      // Validate step result before proceeding
      if (step.validate) {
        const mergedState = { ...this.currentState, ...result };
        const error = step.validate(mergedState);
        if (error) {
          p.log.error(`Validation error: ${error}`);
          this.goBackCalled = true;
          this.currentStepIndex--;
          continue;
        }
      }

      Object.assign(this.currentState, result);
      
      if (!this.goBackCalled) {
        this.currentStepIndex++;
      }
      this.goBackCalled = false;
    }

    const confirmed = await this.showSummary();
    
    if (!confirmed) {
      p.cancel('Wizard cancelled at summary.');
      throw new UserCancelledError();
    }

    p.outro(chalk.green(`${this.title} completed successfully!`));
    
    return this.currentState;
  }

  private goBackCalled = false;

  private async runStep(step: WizardStep): Promise<Record<string, unknown> | null> {
    const goBack = () => {
      if (this.currentStepIndex > 0) {
        this.goBackCalled = true;
        this.currentStepIndex--;
      }
    };

    try {
      const result = await step.run(this.currentState, goBack);
      return result;
    } catch (error) {
      if (error instanceof UserCancelledError) {
        return null;
      }
      throw error;
    }
  }

  private async showSummary(): Promise<boolean> {
    p.log.info('');
    p.log.info(chalk.bold('Summary:'));
    p.log.info('');

    Object.entries(this.currentState).forEach(([key, value]) => {
      p.log.info(`${chalk.cyan(key)}: ${value}`);
    });

    p.log.info('');

    const confirmed = await p.confirm({
      message: 'Proceed with these settings?',
      initialValue: true,
    });

    if (typeof confirmed !== 'boolean') {
      return false;
    }

    return confirmed;
  }

  private async runNonInteractive(): Promise<Record<string, unknown>> {
    console.log(chalk.cyan(`Running ${this.title} in non-interactive mode`));
    
    for (const step of this.steps) {
      console.log(chalk.dim(`Executing step: ${step.title}`));
      const result = await step.run(this.currentState, () => {});
      if (result === null) {
        throw new UserCancelledError();
      }
      Object.assign(this.currentState, result);
    }

    console.log(chalk.green(`${this.title} completed`));
    return this.currentState;
  }

  getState(): Record<string, unknown> {
    return { ...this.currentState };
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  getTotalSteps(): number {
    return this.steps.length;
  }
}
