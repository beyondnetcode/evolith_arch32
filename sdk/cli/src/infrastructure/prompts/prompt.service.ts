import * as p from "@clack/prompts";
import type { Option } from "@clack/prompts";
import chalk from "chalk";
import { CatalogLoader } from "../catalog/catalog-loader";
import { InitProjectInput } from "../../application/services";
import { Injectable } from "@nestjs/common";
import { UserCancelledError } from "../../core/errors";

@Injectable()
export class PromptService {
  private spinner?: any;

  showIntro(message: string): void {
    if (typeof p.intro === "function") {
      p.intro(message);
    } else {
      console.log(message);
    }
  }

  showOutro(message: string): void {
    if (typeof p.outro === "function") {
      p.outro(message);
    } else {
      console.log(message);
    }
  }

  showInfo(message: string): void {
    this.writeLog("info", message);
  }

  showSuccess(message: string): void {
    this.writeLog("success", chalk.green(message));
  }

  showWarning(message: string): void {
    this.writeLog("warn", chalk.yellow(message));
  }

  showError(message: string): void {
    this.writeLog("error", chalk.red(message));
  }

  startSpinner(message: string): void {
    if (typeof p.spinner === "function") {
      this.spinner = p.spinner();
      this.spinner.start(message);
    } else {
      console.log(message);
    }
  }

  stopSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.stop(message);
      this.spinner = undefined;
    }
  }

  async confirm(
    message: string,
    initialValue: boolean = true,
  ): Promise<boolean> {
    const result = await p.confirm({
      message,
      initialValue,
    });

    if (this.isCancelled(result)) {
      p.cancel("Operación cancelada.");
      throw new UserCancelledError();
    }

    return result as boolean;
  }

  async text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | undefined;
  }): Promise<string> {
    const result = await p.text({
      ...options,
      validate: options.validate
        ? (value) => options.validate!(value)
        : undefined,
    });
    if (this.isCancelled(result)) {
      p.cancel("Operación cancelada.");
      throw new UserCancelledError();
    }
    return result as string;
  }

  async select<T extends string>(options: {
    message: string;
    options: { value: T; label?: string; hint?: string }[];
    initialValue?: T;
  }): Promise<T> {
    const result = await p.select({
      ...options,
      options: options.options.map((option) => ({
        ...option,
        label: option.label ?? option.value,
      })) as Option<T>[],
    });
    if (this.isCancelled(result)) {
      p.cancel("Operación cancelada.");
      throw new UserCancelledError();
    }
    return result as T;
  }

  async multiselect<T extends string>(options: {
    message: string;
    options: { value: T; label?: string; hint?: string }[];
    required?: boolean;
    initialValues?: T[];
  }): Promise<T[]> {
    const result = await p.multiselect({
      ...options,
      options: options.options.map((option) => ({
        ...option,
        label: option.label ?? option.value,
      })) as Option<T>[],
    });
    if (this.isCancelled(result)) {
      p.cancel("Operación cancelada.");
      throw new UserCancelledError();
    }
    return result as T[];
  }

  async askInitOptions(
    catalog: CatalogLoader,
  ): Promise<Partial<InitProjectInput> | null> {
    const selection = await p.group(
      {
        projectName: () =>
          p.text({
            message: "Nombre del proyecto:",
            placeholder: "my-satellite-repo",
            validate: (value) => {
              if (!value) return "Por favor ingresa un nombre.";
              if (value.includes(" "))
                return "El nombre no debe contener espacios.";
              if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
                return "El nombre debe empezar con letra y contener solo letras, números, guiones.";
              }
            },
          }),

        runtime: () => {
          const runtimes = catalog.loadRuntimeCatalog();
          return p.select({
            message: "Selecciona el runtime principal:",
            options: runtimes.map((r) => ({
              value: r.id,
              label: `${r.name} (${r.defaultVersion})`,
              hint: r.language,
            })),
            initialValue: "nodejs",
          });
        },

        monorepo: () => {
          const monorepos = catalog.getMonorepoOptions();
          return p.select({
            message: "Selecciona la estrategia de monorepo:",
            options: monorepos.map((m) => ({
              value: m.id,
              label: m.name,
              hint: m.description,
            })),
            initialValue: "none",
          });
        },

        architecture: () => {
          const architectures = catalog.getArchitecturePatterns();
          return p.select({
            message: "Selecciona el patrón arquitectónico:",
            options: architectures.map((a) => ({
              value: a.id,
              label: a.name,
              hint: a.description,
            })),
            initialValue: "clean",
          });
        },

        database: ({ results }) => {
          const runtimes = catalog.loadRuntimeCatalog();
          const runtime = runtimes.find((r) => r.id === results.runtime);
          const databases = runtime?.databases || [];
          return p.select({
            message: "Selecciona el tipo de base de datos:",
            options: databases.map((db) => ({
              value: db.id,
              label: db.name,
              hint: db.orm || db.type || "",
            })),
            initialValue: catalog.getDefaultDatabase(results.runtime),
          });
        },

        apiProtocol: () => {
          const protocols = catalog.getApiProtocols();
          return p.select({
            message: "Selecciona el protocolo de API:",
            options: protocols.map((pr) => ({
              value: pr.id,
              label: pr.name,
              hint: pr.description,
            })),
            initialValue: "rest",
          });
        },

        ciCd: () =>
          p.select({
            message: "Selecciona la plataforma de CI/CD:",
            options: [
              {
                value: "github",
                label: "GitHub Actions",
                hint: "Primary CI/CD",
              },
              {
                value: "gitlab",
                label: "GitLab CI",
                hint: "Integrated registry",
              },
              { value: "azure", label: "Azure DevOps", hint: "Enterprise ALM" },
              { value: "none", label: "None", hint: "Skip CI/CD" },
            ],
            initialValue: "github",
          }),

        observability: () =>
          p.select({
            message: "Selecciona el nivel de observabilidad:",
            options: [
              {
                value: "otel",
                label: "OpenTelemetry (All)",
                hint: "Traces + Metrics + Logs",
              },
              {
                value: "otel-traces",
                label: "Traces only",
                hint: "Distributed tracing",
              },
              { value: "minimal", label: "Minimal", hint: "Basic logging" },
              { value: "none", label: "None", hint: "Skip observability" },
            ],
            initialValue: "otel",
          }),

        features: () =>
          p.multiselect({
            message: "¿Qué características base quieres incluir?",
            options: [
              {
                value: "otel",
                label: "OpenTelemetry",
                hint: "Traces + Metrics + Logs",
              },
              {
                value: "acl",
                label: "Anti-Corruption Layer",
                hint: "Schema validation",
              },
              {
                value: "bilingual",
                label: "Bilingual Docs",
                hint: "EN + ES docs",
              },
              { value: "hooks", label: "Git Hooks", hint: "Husky pre-commit" },
              {
                value: "adr",
                label: "ADR System",
                hint: "Architecture Decisions",
              },
            ],
            required: false,
          }),

        agents: () =>
          p.multiselect({
            message: "¿Qué agentes de Evolith deseas configurar?",
            options: [
              { value: "bmad", label: "BMad", hint: "Recommended" },
              {
                value: "architecture",
                label: "Architecture",
                hint: "Recommended",
              },
              { value: "qa", label: "QA" },
              { value: "sdlc", label: "SDLC" },
            ],
            required: false,
          }),

        confirmInit: () =>
          p.confirm({
            message: "¿Comenzar inicialización con las opciones seleccionadas?",
            initialValue: true,
          }),
      },
      {
        onCancel: () => {
          p.cancel("Operación cancelada.");
          throw new UserCancelledError();
        },
      },
    );

    if (!selection.confirmInit) {
      return null;
    }

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

  private isCancelled(value: unknown): boolean {
    return typeof p.isCancel === "function" && p.isCancel(value);
  }

  private writeLog(
    level: "info" | "success" | "warn" | "error",
    message: string,
  ): void {
    const logger = p.log?.[level];
    if (typeof logger === "function") {
      logger(message);
    } else {
      console.log(message);
    }
  }
}
