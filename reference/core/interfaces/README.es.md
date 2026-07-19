# Evolith Core — How-To de Interfaces

> Navegación bilingüe: [English](./README.md)

Cómo operar Evolith Core desde sus tres superficies — **CLI** (`evolith …`), **MCP**
(tools `evolith-*`) y **REST** (`/api/v1/…`).

## Empieza aquí — guías legibles (por interfaz)

Escritas para una persona que está aprendiendo a usar Evolith Core: cada
comando/tool/endpoint explicado en prosa, con sus opciones, ejemplos de lo simple a
lo avanzado, y las combinaciones habituales.

- **[Usando la CLI](using-the-cli.es.md)** — los 25 comandos y subcomandos de la CLI.
- **[Usando MCP](using-the-mcp.es.md)** — las 47 tools `evolith-*`, para agentes.
- **[Usando la API REST](using-the-rest-api.es.md)** — los 27 endpoints, para integradores / el Tracker.

## Catálogo de referencia (por fase, generado)

Una referencia cruzada derivada por máquina — la misma operación en las tres
superficies, con su respuesta real capturada — organizada por fase del SDLC. Un check
de CI la mantiene a prueba de drift (ver abajo). Úsala para consultar el
request/response exacto de una operación en cada superficie; usa las guías legibles de
arriba para *aprender*.

## Dos capas

| Capa | Patrón de archivo | Naturaleza | Responde |
| --- | --- | --- | --- |
| **Catálogo de referencia** | `how-to-<phase>.md` | **Generado** | "¿Qué es la operación X en cada superficie — sus opciones, un request resuelto y la respuesta real?" |
| **Playbook de fase** | `playbook-<phase>.md` | **Curado** | "¿Cómo trabajo esta fase — qué ejecuto, en qué orden y qué espero?" |

El playbook es el recorrido narrativo; enlaza al catálogo para el
comando/opciones/ejemplos exactos. El catálogo es el diccionario.

## Por qué el catálogo no puede driftear

El catálogo es **derivado de la fuente de verdad certificada**, nunca escrito a mano:

1. `reference/core/control-center/audits/surface-parity-matrix.json` — qué
   operaciones existen y en qué superficies.
2. `src/tests/exploration/bindings.ts` — el **request CLI/MCP/REST exacto** que el
   tester de conformidad ejecuta para cada operación.
3. `src/tests/exploration/.out/howto-capture.json` — el `inputSchema` en vivo de cada
   tool MCP **y el sobre de respuesta ADR-0073 real** que devolvió cada superficie
   (emitido por la corrida de tests de exploración).
4. Los decoradores `@Option` (CLI) y `@ApiProperty` (REST) — las tablas de flags/campos.

Un test de conformidad (`exploration.spec.ts` → *"the generated interface how-to docs
are up to date"*) regenera los documentos y **falla el CI si los archivos commiteados
divergen** de la fuente de verdad. Así, una invocación documentada es, por
construcción, una que realmente corre y devuelve lo que dice.

## Arquitectura objetivo que refleja el how-to

- **CLI** — la superficie de referencia; todo comando emite un sobre ADR-0073 con
  `--format json` y sale con código distinto de cero ante un verdict fallido.
- **MCP** — paridad plena con la CLI para las acciones invocables por agentes
  (filesystem/scaffolding incluidos); las tools mutativas exigen `{ apply, approvalToken }`.
- **REST** — el middleware que consume el Evolith Tracker; expone los comandos de
  evaluación stateless del Core + datos detrás de un sobre global.

## Regeneración

```bash
npm run test:exploration        # boots the 3 surfaces, captures schemas + responses
npx ts-node --transpile-only \
  --project src/tests/exploration/tsconfig.json \
  src/tests/exploration/gen-howto.ts all
```

## Fases

- [Discovery](how-to-discovery.md) · _playbook: pendiente_
- [Design](how-to-design.md) · _playbook: pendiente_
- [Construction](how-to-construction.md) · [playbook](playbook-construction.es.md)
- [QA](how-to-qa.md) · _playbook: pendiente_
- [Release](how-to-release.md) · _playbook: pendiente_

---

[Volver al hub de Evolith Core](../README.es.md)
