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
