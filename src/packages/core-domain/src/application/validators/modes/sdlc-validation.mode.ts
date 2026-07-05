/**
 * GT-312: SDLC Validation Mode
 * Validates SDLC phases, gates, artifacts, and blocking criteria.
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';
import { toLegacyPhaseId } from '../../../domain/sdlc/phase-id';

export class SdlcValidationMode implements ValidationMode {
  readonly name = 'sdlc' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.phase || context.topology);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    // GT-343: accept canonical phase ids (discovery…release) as well as the
    // legacy f1..f5; the on-disk phase/gate files are keyed by f1..f5, so
    // normalize to the legacy id for file resolution.
    const phases = context.phase
      ? [toLegacyPhaseId(context.phase) ?? context.phase]
      : ['f1', 'f2', 'f3', 'f4', 'f5'];

    for (const phaseId of phases) {
      try {
        const { promises: fs } = await import('fs');
        const path = await import('path');

        const phasePath = path.join(
          context.corePath || context.satellitePath,
          'reference', 'governance', 'sdlc', 'phases', `phase-${phaseId}.json`,
        );

        let phaseContent: string;
        try {
          phaseContent = await fs.readFile(phasePath, 'utf-8');
        } catch {
          issues.push({
            ruleId: `SDLC-${phaseId.toUpperCase()}-NOT_FOUND`,
            status: 'fail',
            message: `Phase definition not found: ${phaseId}`,
            severity: 'warning',
          });
          continue;
        }

        const phase = JSON.parse(phaseContent);

        for (const gateId of phase.gates || []) {
          const gatePath = path.join(
            context.corePath || context.satellitePath,
            'reference', 'governance', 'sdlc', 'gates', `${gateId}.json`,
          );

          let gateContent: string;
          try {
            gateContent = await fs.readFile(gatePath, 'utf-8');
          } catch {
            issues.push({
              ruleId: `SDLC-${gateId.toUpperCase()}-NOT_FOUND`,
              status: 'fail',
              message: `Gate definition not found: ${gateId}`,
              severity: 'warning',
            });
            continue;
          }

          const gate = JSON.parse(gateContent);

          for (const artifact of gate.requiredArtifacts || []) {
            rulesChecked++;
            const artifactExists = await this.checkArtifactExists(
              context.satellitePath,
              artifact.artifact,
            );

            issues.push({
              ruleId: `SDLC-${phaseId.toUpperCase()}-${gateId.toUpperCase()}-${artifact.artifact.toUpperCase()}`,
              status: artifactExists ? 'pass' : 'fail',
              message: artifactExists
                ? `Artifact '${artifact.artifact}' exists for ${phaseId}/${gateId}`
                : `Missing required artifact '${artifact.artifact}' for ${phaseId}/${gateId}`,
              severity: artifactExists ? 'info' : 'error',
              remediation: artifactExists ? undefined : `Create ${artifact.artifact} artifact`,
            });
          }

          for (const criterion of gate.blockingCriteria || []) {
            rulesChecked++;
            issues.push({
              ruleId: `BLOCKING-${phaseId.toUpperCase()}-${gateId.toUpperCase()}`,
              status: 'pass',
              message: `Blocking criterion registered: ${criterion.criterion}`,
              severity: 'info',
            });
          }
        }
      } catch {
        issues.push({
          ruleId: `SDLC-${phaseId.toUpperCase()}-LOAD_ERROR`,
          status: 'fail',
          message: `Failed to load phase ${phaseId}`,
          severity: 'error',
        });
      }
    }

    const hasFailures = issues.some(i => i.status === 'fail');

    return {
      mode: 'sdlc',
      status: hasFailures ? 'failed' : 'passed',
      rulesChecked,
      issues,
      metadata: {
        phasesValidated: phases,
      },
    };
  }

  private async checkArtifactExists(satellitePath: string, artifactName: string): Promise<boolean> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const possiblePaths = [
      path.join(satellitePath, 'docs', artifactName),
      path.join(satellitePath, 'docs', `${artifactName}.md`),
      path.join(satellitePath, artifactName),
      path.join(satellitePath, `${artifactName}.md`),
    ];

    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }
}
