import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execFileAsync = promisify(execFile);

/**
 * Evaluates OPA policies for architecture planning.
 *
 * DIP NOTE: This class directly imports child_process, fs, and crypto.
 * These are infrastructure concerns that should ideally be injected via
 * ICommandExecutor and IFileSystem ports. However, the OPA binary
 * execution pattern (temp file + execFile + cleanup) is sufficiently
 * unique that a dedicated OPA adapter is more appropriate than
 * general-purpose ports.
 *
 * TODO: Extract to OpaExecutionAdapter implementing an IOpaEvaluator port
 * when the OPA integration surface grows beyond this single evaluator.
 */
@Injectable()
export class ArchitecturePlanOpaEvaluator {
  private readonly logger = new Logger(ArchitecturePlanOpaEvaluator.name);

  async evaluate(policy: string, input: any): Promise<{ sdlc_mode: string; required_approvals: string[] }> {
    const rootDir = process.cwd();
    const isWin = process.platform === 'win32';
    const opaBin = path.join(rootDir, '.harness', 'bin', isWin ? 'opa.exe' : 'opa');
    const policyFile = path.join(rootDir, 'rulesets', 'opa', `${policy}.rego`);

    if (!fs.existsSync(opaBin)) {
      this.logger.error(`OPA binary not found at ${opaBin}`);
      throw new Error('OPA binary is missing. Run setup/compile scripts.');
    }
    if (!fs.existsSync(policyFile)) {
      this.logger.error(`Policy file not found at ${policyFile}`);
      throw new Error(`Policy file ${policy}.rego is missing.`);
    }

    const tmpFile = path.join(rootDir, `.tmp-opa-input-${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(input));

    try {
      const { stdout } = await execFileAsync(opaBin, [
        'eval',
        '-d', policyFile,
        '-i', tmpFile,
        'data.evolith.governance.architecture_planning',
        '--format', 'json',
      ]);
      
      const resultObj = JSON.parse(stdout);
      const data = resultObj.result?.[0]?.expressions?.[0]?.value || {};
      
      return {
        sdlc_mode: data.sdlc_mode || 'minimal',
        required_approvals: data.required_approvals || []
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing OPA eval: ${errorMsg}`);
      throw new Error(`Evaluation failed: ${errorMsg}`);
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }
}
