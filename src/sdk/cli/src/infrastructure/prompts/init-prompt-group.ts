import * as p from '@clack/prompts';
import { CatalogLoader } from '../catalog/catalog-loader';
import { InitProjectInput } from '@beyondnet/evolith-core-domain/application/services';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import {
  AGENT_OPTIONS, CI_CD_OPTIONS, FEATURE_OPTIONS, OBSERVABILITY_OPTIONS,
  validateProjectName,
} from './init-prompt-options';

export async function runInitPromptGroup(
  catalog: CatalogLoader,
): Promise<Partial<InitProjectInput> | null> {
  const selection = await p.group(
    {
      projectName: () => p.text({
        message: 'Nombre del proyecto:',
        placeholder: 'my-satellite-repo',
        validate: validateProjectName,
      }),

      runtime: () => {
        const runtimes = catalog.loadRuntimeCatalog();
        return p.select({
          message: 'Selecciona el runtime principal:',
          options: runtimes.map((r) => ({ value: r.id, label: `${r.name} (${r.defaultVersion})`, hint: r.language })),
          initialValue: 'nodejs',
        });
      },

      monorepo: () => {
        const monorepos = catalog.getMonorepoOptions();
        return p.select({
          message: 'Selecciona la estrategia de monorepo:',
          options: monorepos.map((m) => ({ value: m.id, label: m.name, hint: m.description })),
          initialValue: 'none',
        });
      },

      architecture: () => {
        const architectures = catalog.getArchitecturePatterns();
        return p.select({
          message: 'Selecciona el patrón arquitectónico:',
          options: architectures.map((a) => ({ value: a.id, label: a.name, hint: a.description })),
          initialValue: 'clean',
        });
      },

      database: ({ results }) => {
        const runtimes = catalog.loadRuntimeCatalog();
        const runtime = runtimes.find((r) => r.id === results.runtime);
        const databases = runtime?.databases || [];
        return p.select({
          message: 'Selecciona el tipo de base de datos:',
          options: databases.map((db) => ({ value: db.id, label: db.name, hint: db.orm || db.type || '' })),
          initialValue: catalog.getDefaultDatabase(results.runtime ?? ''),
        });
      },

      apiProtocol: () => {
        const protocols = catalog.getApiProtocols();
        return p.select({
          message: 'Selecciona el protocolo de API:',
          options: protocols.map((pr) => ({ value: pr.id, label: pr.name, hint: pr.description })),
          initialValue: 'rest',
        });
      },

      ciCd: () => p.select({ message: 'Selecciona la plataforma de CI/CD:', options: CI_CD_OPTIONS, initialValue: 'github' }),
      observability: () => p.select({ message: 'Selecciona el nivel de observabilidad:', options: OBSERVABILITY_OPTIONS, initialValue: 'otel' }),
      features: () => p.multiselect({ message: '¿Qué características base quieres incluir?', options: FEATURE_OPTIONS, required: false }),
      agents: () => p.multiselect({ message: '¿Qué agentes de Evolith deseas configurar?', options: AGENT_OPTIONS, required: false }),
      confirmInit: () => p.confirm({ message: '¿Comenzar inicialización con las opciones seleccionadas?', initialValue: true }),
    },
    {
      onCancel: () => {
        p.cancel('Operación cancelada.');
        throw new UserCancelledError();
      },
    },
  );

  if (!selection.confirmInit) return null;

  return {
    name: selection.projectName as string,
    runtime: selection.runtime as string,
    monorepo: selection.monorepo as string,
    architecture: selection.architecture as string,
    database: selection.database as string,
    apiProtocol: selection.apiProtocol as string,
    ciCd: selection.ciCd as string,
    observability: selection.observability as string,
    features: (selection.features as string[]) || [],
    agents: (selection.agents as string[]) || [],
  };
}
