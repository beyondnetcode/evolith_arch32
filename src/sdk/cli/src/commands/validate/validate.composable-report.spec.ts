/**
 * Rendering del motor composable (GT-312) en modo humano.
 *
 * `createComposableEngine()` es una funcion local del comando, pero carga los
 * modos con `require(...)` en tiempo de llamada -- asi que se pueden mockear por
 * ruta de modulo y devolver resultados a medida. Sin eso, todo el bloque que
 * printing modes, failures by severity, remedies and OK rules was left without
 * ejercitar: son ramas de presentacion guiadas por la FORMA de los datos, y solo
 * se distinguen alimentando cada forma.
 */
const makeMode = (name: string, result: unknown) => ({
  name,
  canHandle: () => true,
  validate: async () => result,
});

let sdlcResult: unknown = { mode: 'sdlc', status: 'passed', rulesChecked: 0, issues: [] };

jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/sdlc-validation.mode',
  () => ({ SdlcValidationMode: jest.fn(() => makeMode('sdlc', sdlcResult)) }),
);
const inert = (name: string) => ({
  [`${name}Mode`]: jest.fn(() => ({ name, canHandle: () => false, validate: async () => ({}) })),
});
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/architecture-validation.mode',
  () => ({ ArchitectureValidationMode: inert('architecture').architectureMode }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/ruleset-validation.mode',
  () => ({ RulesetValidationMode: jest.fn(() => ({ name: 'ruleset', canHandle: () => false, validate: async () => ({ mode: 'ruleset', status: 'passed', rulesChecked: 0, issues: [] }) })) }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/adr-validation.mode',
  () => ({ AdrValidationMode: jest.fn(() => ({ name: 'adr', canHandle: () => false, validate: async () => ({}) })) }),
);
jest.mock(
  '@beyondnet/evolith-core-domain/application/validators/modes/adhoc-validation.mode',
  () => ({ AdhocValidationMode: jest.fn(() => ({ name: 'adhoc', canHandle: () => false, validate: async () => ({}) })) }),
);

import { ValidateCommand } from './validate.command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { CLI_EXIT_CODES } from '../../infrastructure/cli/exit-codes';

describe('ValidateCommand — composable engine report', () => {
  let command: ValidateCommand;
  let info: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  const said = () =>
    [...info.mock.calls, ...warn.mock.calls].map((c) => String(c[0])).join('\n');

  beforeEach(() => {
    info = jest.spyOn(PromptService.prototype, 'showInfo').mockImplementation(() => undefined);
    warn = jest.spyOn(PromptService.prototype, 'showWarning').mockImplementation(() => undefined);
    jest.spyOn(PromptService.prototype, 'showIntro').mockImplementation(() => undefined);
    jest.spyOn(PromptService.prototype, 'showOutro').mockImplementation(() => undefined);
    jest.spyOn(PromptService.prototype, 'showSuccess').mockImplementation(() => undefined);
    jest.spyOn(PromptService.prototype, 'showError').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    command = new ValidateCommand({} as never, {} as never, new PromptService());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const run = () => command.run([], { composable: true } as never);

  it('summarises modes, checked rules and performance', async () => {
    sdlcResult = {
      mode: 'sdlc', status: 'passed', rulesChecked: 7,
      issues: [{ ruleId: 'OK-1', status: 'pass', message: 'bien', severity: 'info' }],
    };
    await run();
    const out = said();
    expect(out).toMatch(/Composable engine GT-312/);
    expect(out).toMatch(/Modos ejecutados: sdlc/);
    expect(out).toMatch(/7 checked/);
    expect(out).toMatch(/Rendimiento:/);
  });

  it('lists a mode\u0027s OK rules when there are any', async () => {
    sdlcResult = {
      mode: 'sdlc', status: 'passed', rulesChecked: 2,
      issues: [
        { ruleId: 'OK-1', status: 'pass', message: 'a', severity: 'info' },
        { ruleId: 'OK-2', status: 'pass', message: 'b', severity: 'info' },
      ],
    };
    await run();
    expect(said()).toMatch(/Mode sdlc: 2 rules OK/);
  });

  it('marca cada severidad de fallo con su icono', async () => {
    sdlcResult = {
      mode: 'sdlc', status: 'failed', rulesChecked: 3,
      issues: [
        { ruleId: 'E-1', status: 'fail', message: 'error', severity: 'error' },
        { ruleId: 'W-1', status: 'fail', message: 'aviso', severity: 'warning' },
        { ruleId: 'I-1', status: 'fail', message: 'info', severity: 'info' },
      ],
    };
    await run();
    const out = said();
    expect(out).toMatch(/\[RED\] \[E-1\]/);
    expect(out).toMatch(/\[YELLOW\] \[W-1\]/);
    expect(out).toMatch(/\[BLUE\] \[I-1\]/);
    expect(out).toMatch(/Mode sdlc: 3 failures/);
  });

  it('muestra el remedio solo en los fallos que lo traen', async () => {
    sdlcResult = {
      mode: 'sdlc', status: 'failed', rulesChecked: 2,
      issues: [
        { ruleId: 'R-1', status: 'fail', message: 'con remedio', severity: 'error', remediation: 'haz esto' },
        { ruleId: 'R-2', status: 'fail', message: 'sin remedio', severity: 'error' },
      ],
    };
    await run();
    const out = said();
    expect(out).toMatch(/Remedio: haz esto/);
    expect(out.match(/Remedio:/g)).toHaveLength(1);
  });

  it('un veredicto negativo sale con codigo distinto de cero para que CI lo pueda gatear', async () => {
    sdlcResult = {
      mode: 'sdlc', status: 'failed', rulesChecked: 1,
      issues: [{ ruleId: 'E-1', status: 'fail', message: 'x', severity: 'error' }],
    };
    await run();
    // GT-580: a negative verdict is BLOCKED (2), never the catch-all 1.
    expect(exitSpy).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
  });
});
