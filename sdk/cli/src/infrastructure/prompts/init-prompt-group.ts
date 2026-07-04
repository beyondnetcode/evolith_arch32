import * as p from '@clack/prompts';
import { CatalogLoader } from '../catalog/catalog-loader';
import { RepoDetectionResult } from '@evolith/core-domain/application/ports/repo-detection.port';
import { AdoptRepoInput } from '@evolith/core-domain/application/services/satellite-scaffolder.service';
import { UserCancelledError } from '@evolith/core-domain/domain/errors';
import {
  AGENT_OPTIONS, FEATURE_OPTIONS, MONOREPO_OPTIONS,
} from './init-prompt-options';

export async function runAdoptPromptGroup(
  detection: RepoDetectionResult,
  catalog: CatalogLoader,
): Promise<AdoptRepoInput | null> {
  const selection = await p.group(
    {
      detectionSummary: async () => {
        p.log.info('');
        p.log.info('Detected repository properties:');
        p.log.info(`  Repository:   ${detection.repoName}`);
        p.log.info(`  Runtime:      ${detection.runtime}`);
        p.log.info(`  Pkg Manager:  ${detection.packageManager}`);
        p.log.info(`  Framework:    ${detection.framework ?? 'none detected'}`);
        p.log.info(`  CI/CD:        ${detection.ciPlatform}`);
        p.log.info(`  Remote:       ${detection.remoteUrl ?? 'none'}`);
        if (detection.hasEvolithYaml) p.log.warn('  evolith.yaml already exists — will be merged');
        if (detection.hasGovernance) p.log.warn('  Governance dirs already exist — will be enhanced');
        if (detection.hasAgentsMd) p.log.warn('  AGENTS.md already exists — will be enhanced');
        p.log.info('');
        return true;
      },

      monorepo: () => p.select({
        message: 'Monorepo strategy:',
        options: MONOREPO_OPTIONS.map(m => ({
          value: m.value, label: m.label, hint: m.hint,
        })),
        initialValue: 'none',
      }),

      features: () => p.multiselect({
        message: 'Evolith features to enable:',
        options: FEATURE_OPTIONS,
        required: false,
      }),

      agents: () => p.multiselect({
        message: 'Agents to install:',
        options: AGENT_OPTIONS,
        required: false,
      }),

      hooks: () => p.confirm({
        message: 'Install git hooks (pre-commit, pre-push)?',
        initialValue: true,
      }),

      confirmAdopt: () => p.confirm({
        message: 'Apply Evolith governance to this repository?',
        initialValue: true,
      }),
    },
    {
      onCancel: () => {
        p.cancel('Adoption cancelled.');
        throw new UserCancelledError();
      },
    },
  );

  if (!selection.confirmAdopt) return null;

  return {
    name: detection.repoName,
    monorepo: selection.monorepo as string,
    features: (selection.features as string[]) || [],
    agents: (selection.agents as string[]) || [],
    hooks: selection.hooks as boolean,
    detection,
  };
}

/** @deprecated Use runAdoptPromptGroup instead */
export async function runInitPromptGroup(
  catalog: CatalogLoader,
): Promise<AdoptRepoInput | null> {
  p.log.warn('Using deprecated prompt flow. Run init inside an existing repository.');
  return null;
}
