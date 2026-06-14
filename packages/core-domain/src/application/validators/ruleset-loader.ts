import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { PhaseGatesRuleset } from './phase-gate-validator.service';

export class RulesetLoader {
  private cachedRuleset: PhaseGatesRuleset | null = null;
  private readonly ajv: Ajv;
  private schemaValidator: any;

  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly rulesetPath: string
  ) {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
  }

  async loadRuleset(): Promise<PhaseGatesRuleset> {
    if (this.cachedRuleset) {
      return this.cachedRuleset;
    }

    try {
      const content = await this.fs.readFile(this.rulesetPath);
      const parsed = JSON.parse(content);
      
      if (!this.schemaValidator) {
        const schemaPath = path.join(path.dirname(this.rulesetPath), '../schema/ruleset-sdlc.schema.json');
        const schemaContent = await this.fs.readFile(schemaPath);
        this.schemaValidator = this.ajv.compile(JSON.parse(schemaContent));
      }
      
      const valid: any = this.schemaValidator(parsed as any);
      if (!valid) {
        throw new Error(`Ruleset validation failed: ${this.ajv.errorsText(this.schemaValidator.errors)}`);
      }

      this.cachedRuleset = parsed as PhaseGatesRuleset;
      return this.cachedRuleset;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load phase gates ruleset: ${message}`);
      throw new Error(`Cannot load phase gates ruleset from ${this.rulesetPath}: ${message}`);
    }
  }

  async getRulesetVersion(): Promise<string> {
    const ruleset = await this.loadRuleset();
    return ruleset.version ?? '0.0.0';
  }
}
