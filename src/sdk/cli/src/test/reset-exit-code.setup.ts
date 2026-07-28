/**
 * Impide que un test filtre el codigo de salida del propio jest.
 *
 * Los comandos del CLI señalan su veredicto con `process.exitCode = 1` (ADR-0073:
 * el exit code transporta el veredicto). Bajo `--runInBand` -- que es como corre
 * CI -- no hay workers: todas las suites comparten el proceso de jest, asi que
 * ese `1` sobrevive al test que lo puso y jest termina en 1 con 1250 pruebas en
 * verde y la cobertura por encima del umbral. En modo worker el mismo test pasa
 * inadvertido, y por eso el defecto solo aparecia en CI.
 *
 * El valor se restaura despues de CADA test. Que un test unitario fije el codigo
 * de salida del runner es siempre un artefacto, nunca una señal: los fallos
 * reales los reporta jest por su cuenta. Se resuelve aqui, y no en las dos specs
 * que hoy filtran, para que la clase entera de fuga deje de ser posible.
 */
const original = process.exitCode;

afterEach(() => {
  process.exitCode = original;
});

/**
 * GT-611 — model an interactive terminal by DEFAULT in unit tests.
 *
 * Jest runs with `process.stdin.isTTY` undefined, which is exactly the signal
 * the new prompt boundary reads as "nobody can answer this". Without an
 * explicit stance, every existing spec that exercises a wizard (`adr`,
 * `handoff`, `scaffold`, `standards`, `history`, `WizardService`) would start
 * failing for an environmental reason that has nothing to do with what it
 * asserts, and the honest interactive behaviour would go untested.
 *
 * So the default here is "a human is present", and the specs that assert the
 * MACHINE contract — `non-interactive-contract.spec.ts` and the per-command
 * ones — delete this variable and set `process.stdin.isTTY` themselves. That
 * keeps the guard under test where it belongs instead of turning the whole
 * suite into an assertion about jest's stdin.
 */
process.env.EVOLITH_FORCE_INTERACTIVE = '1';
