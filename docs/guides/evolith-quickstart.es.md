# Inicio Rápido

> **Navegación Bilingüe:** [English](./evolith-quickstart.md)

Tres comandos. Sin servidor que arrancar, sin base de datos, sin clúster.

## 1. Instalar

```bash
npm install -g @beyondnet/evolith-cli
```

El paquete instala dos binarios equivalentes: `evolith` (el nombre documentado) y
`evolith-cli`. Requiere Node 20.

## 2. Inicializar un satélite

Un *satélite* es cualquier repositorio gobernado por un Core de Evolith. Inicializarlo escribe
un `evolith.yaml` en el directorio actual y nada más.

```bash
evolith init --name my-sat --yes
```

`--yes` ejecuta sin prompts, algo que también implican un stdin no interactivo o `--format
json`. Para andamiar en un directorio nuevo, pásalo como posicional:
`evolith init my-sat --yes`. `--dry-run` no escribe nada.

## 3. Validar

```bash
evolith validate --engine opa
```

Salida real de `@beyondnet/evolith-cli@1.3.0` contra un satélite recién inicializado, en un
contenedor con nada más que Node:

```
Rules: 133 checked / 26 skipped / 0 errored / 159 total
37 blocking issue(s)
exit code 2
```

## Qué significan los números

**Espera hallazgos en la primera ejecución.** Un satélite recién inicializado es una línea
base, no un aprobado: muchas reglas asumen un repositorio más completo del que tiene un
proyecto en fase 0.

El número que importa es **skipped**. Esas 26 reglas no se evaluaron, así que su resultado es
*desconocido*, no *aprobado*. Nueve de los 37 issues bloqueantes son exactamente eso: reglas
que el motor no pudo decidir, reportadas como fallo en vez de redondearse hacia el verde. La
mayoría de linters no hace esta distinción, y por eso su cobertura y su cumplimiento se ven
idénticos.

Los códigos de salida son una taxonomía, no un booleano:

| Código | Significado |
|:---:|---|
| `0` | pasó |
| `1` | la herramienta falló -- no se produjo veredicto |
| `2` | la puerta bloqueó -- hay veredicto real, y dice que no |
| `3` | invocación inválida -- no se evaluó nada |

`1` y `3` **no** son formas más débiles de `2`. Significan que tu repositorio nunca fue
examinado.

## Siguientes pasos

- Acota lo que corre: `evolith rulesets` lista los packs, y `--select <ref>` evalúa solo los
  que nombres. No nombrar nada evalúa el corpus completo que carga este Core, reportado como
  `selection.source: core-default`.
- Ponlo en CI: ver [Úsalo como puerta de PR](../../README.es.md#úsalo-como-puerta-de-pr).
- Sírvelo a un agente de IA: `npx -y @beyondnet/evolith-mcp` sobre stdio.
- Levanta tú el Core API -- solo hace falta para la superficie REST y escenarios
  multi-repositorio, nunca para el CLI:
  [Auto-hospedar el Core API](./self-hosting-core-api.es.md).
