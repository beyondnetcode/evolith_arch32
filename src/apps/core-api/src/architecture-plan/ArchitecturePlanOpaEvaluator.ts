import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

@Injectable()
export class ArchitecturePlanOpaEvaluator {
  private readonly logger = new Logger(ArchitecturePlanOpaEvaluator.name);

  async evaluate(policy: string, input: any): Promise<{ sdlc_mode: string; required_approvals: string[] }> {
    const rootDir = process.cwd();
    // Use the downloaded OPA binary from the workspace harness
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

    // Write input to temporary file
    const tmpFile = path.join(rootDir, `.tmp-opa-input-${crypto.randomBytes(4).toString('hex')}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(input));

    try {
      const { stdout } = await execAsync(`"${opaBin}" eval -d "${policyFile}" -i "${tmpFile}" "data.evolith.governance.architecture_planning" --format json`);
      
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
