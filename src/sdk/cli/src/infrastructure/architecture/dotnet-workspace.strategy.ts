import { ICommandExecutor } from '@beyondnet/evolith-core-domain/domain/interfaces';
import chalk from 'chalk';

/**
 * GT-580 — the strategy's progress sink, narrowed to the one method it uses.
 *
 * It used to take the whole `PromptService`, whose `showInfo` writes to STDOUT.
 * In `--format json` that put `[DRY-RUN] Would execute ...` lines in front of the
 * ADR-0073 envelope, so `evolith scaffold --runtime dotnet --format json | jq`
 * failed to parse — a diagnostic on the machine channel. A structural type lets
 * the caller hand over a stderr sink for machine formats without the strategy
 * knowing anything about output formats.
 */
export interface DotnetProgressSink {
  showInfo(message: string): void;
}

/**
 * GT-455: .NET target for `scaffold`. Generates an ASP.NET Core satellite whose
 * layout mirrors the UMS reference architecture (clean/hexagonal modular
 * monolith): a solution with Domain / Application / Infrastructure /
 * Presentation projects and their references, under `src/apps/<name>`.
 *
 * Like NxWorkspaceStrategy shells out to `nx`/`npm`, this shells out to the
 * `dotnet` CLI via the shared ICommandExecutor, honoring dry-run.
 */
export class DotnetWorkspaceStrategy {
  private dryRun = false;

  constructor(
    private readonly executor: ICommandExecutor,
    private readonly promptService: DotnetProgressSink,
  ) {}

  setDryRun(dryRun: boolean): void {
    this.dryRun = dryRun;
  }

  /** Fail fast with an actionable message when the .NET SDK is missing. */
  async ensureAvailable(): Promise<void> {
    if (this.dryRun) return;
    try {
      await this.executor.executeOrThrow('dotnet --version', process.cwd());
    } catch {
      throw new Error(
        'The .NET SDK (`dotnet`) was not found on PATH. Install .NET 8+ ' +
          '(the Evolith suite targets .NET 10) to scaffold a .NET satellite.',
      );
    }
  }

  private async run(command: string, cwd: string): Promise<void> {
    if (this.dryRun) {
      this.promptService.showInfo(chalk.yellow(`[DRY-RUN] Would execute in ${cwd}: dotnet ${command}`));
      return;
    }
    this.promptService.showInfo(chalk.gray(`> Executing in ${cwd}: dotnet ${command}`));
    await this.executor.executeOrThrow(`dotnet ${command}`, cwd);
  }

  /**
   * Generate the hexagonal solution for `base` (PascalCase namespace root) in
   * `appDir`: a `.sln`, the four layer projects, and their references.
   */
  async generateSolution(base: string, appDir: string): Promise<void> {
    const csproj = (layer: string) => `${base}.${layer}/${base}.${layer}.csproj`;

    // `dotnet new sln` emits a `.sln` (or `.slnx` on .NET 9+); `dotnet sln add`
    // (without naming the file) auto-detects the single solution in the dir, so
    // this works across SDK versions.
    await this.run(`new sln -n ${base}`, appDir);

    // Domain/Application/Infrastructure are class libraries; Presentation is the
    // ASP.NET Core host (webapi). Templates default to the installed SDK TFM.
    await this.run(`new classlib -n ${base}.Domain -o ${base}.Domain`, appDir);
    await this.run(`new classlib -n ${base}.Application -o ${base}.Application`, appDir);
    await this.run(`new classlib -n ${base}.Infrastructure -o ${base}.Infrastructure`, appDir);
    await this.run(`new webapi -n ${base}.Presentation -o ${base}.Presentation`, appDir);

    for (const layer of ['Domain', 'Application', 'Infrastructure', 'Presentation']) {
      await this.run(`sln add ${csproj(layer)}`, appDir);
    }

    // Dependency direction (Presentation → Infrastructure → Application → Domain).
    await this.run(`add ${csproj('Application')} reference ${csproj('Domain')}`, appDir);
    await this.run(`add ${csproj('Infrastructure')} reference ${csproj('Application')} ${csproj('Domain')}`, appDir);
    await this.run(`add ${csproj('Presentation')} reference ${csproj('Application')} ${csproj('Infrastructure')}`, appDir);
  }

  /**
   * Generate a bounded-context class library (`<base>.<Context>`) referenced by
   * the Application layer — the .NET analogue of a `domain` library.
   */
  async generateDomainContext(base: string, context: string, appDir: string): Promise<void> {
    const name = `${base}.${context}`;
    await this.run(`new classlib -n ${name} -o domains/${name}`, appDir);
    await this.run(`sln add domains/${name}/${name}.csproj`, appDir);
    await this.run(`add ${base}.Application/${base}.Application.csproj reference domains/${name}/${name}.csproj`, appDir);
  }
}
