# Ledger de Coordinación de Sesiones

> Navegación bilingüe: [English](./COORDINATION.md)

> **Propósito.** A veces varias sesiones de agente trabajan el mismo `develop` en paralelo
> (cerrando gaps, registrando ADRs). El *código* de los gaps se particiona de forma natural
> (gaps distintos → archivos distintos), pero hay tres **asignadores globales** compartidos que
> colisionan si dos sesiones los leen y escriben a la vez: el contador **Progress** del board,
> los **números de ADR** y los **GT-ID**. Este ledger es el único lugar donde se reservan, y donde
> se declara qué gaps posee cada sesión. **Léelo (después de `git fetch`) antes de asignar nada.**

## Cómo funciona la reserva (reservar-y-luego-pushear)

Para reclamar un número de ADR o un GT-ID:

1. `git fetch origin` y lee los **Registros de asignadores** de abajo.
2. Toma el valor libre actual, **incrementa el registro aquí y pushea ESTE archivo primero**
   en un commit mínimo — eso reserva el número para ti.
3. Si el push es rechazado (alguien incrementó antes), vuelve a hacer fetch, toma el nuevo valor libre y reintenta.
4. Solo entonces crea los archivos de ADR/gap que usan el número.

Quien pushee primero el bump del ledger se queda el número. Nunca `--force`.

## Registros de asignadores (valores libres autoritativos)

| Asignador | Próximo libre | Último reclamado | Por |
|-----------|-----------|--------------|-----|
| Número de ADR (`reference/core/architecture/adrs/core/NNNN-*`) | **0117** | 0116 — Harness Core: canonical Finding + authority boundary | harness-normalisation lane (0114 still earmarked by UP-003) |
| GT-ID (filas de `gap-tracking.md`) | **GT-560** | GT-559 — advisory-authority single source (P0 wave) | harness-normalisation lane |

> El contador **`**Progress:**`** del board NO se reserva por bloque — ver su protocolo abajo.
> `gap-closure-evidence.json` es append-only (baja colisión); aun así, pushea sin demora.

## Carriles activos (quién posee qué gaps)

Dos sesiones nunca editan las mismas filas de board/catálogo si se mantienen en su carril.

| Sesión | Carril / hilo | Alcance de gaps (posee) | Estado |
|---------|---------------|------------------|--------|
| **RAG model maturity assessment** | RAG / embeddings / maturity | GT-538…541 + follow-ons + RAG ADRs (0112) | activo (no corriendo ahora; último push 12:24) |
| **Gap-closing waves (Winston)** | enforcers / evidence-seam / runtime | GT-533-wire, GT-516, GT-524, GT-520, GT-513, GT-535 | **pausado** a la espera de coordinación |
| **Harness normalisation (P0)** | shared harness capabilities | GT-556…559 + ADR-0116 | activo |

Si necesitas un gap fuera de tu carril, recláma aquí primero (agrega una fila / nota) antes de tocarlo.

## Protocolo del contador Progress (la línea de mayor contención)

La única línea `**Progress:** N / T done · … ` la edita cada sync del board. Reglas:

1. Edítala **solo** en un commit pequeño y dedicado de sync del board.
2. Haz `git fetch` inmediatamente antes, recalcula los conteos contra las filas del board
   **recién traídas**, y pushea de inmediato. Mantén la ventana mínima.
3. Si el push es rechazado, vuelve a hacer fetch, recalcula contra la nueva línea base y reintenta. Nunca fuerces.
4. Corre `node .harness/scripts/ci/08-validate-tracking.mjs` (debe estar verde) antes de pushear.

## Instantánea de la línea base actual (informativa — el board es el autoritativo)

- Punta de `develop`: `29d00afb`
- Board: **506 / 541 done · 17 in progress · 14 pending · 4 deferred** — guard verde
- Numeración de ADR: `0111` Quality Signal port · `0112` RAG embedding/vector-store · `0113` Lighthouse evidence adapter

## Log

- **2026-07-13** — Ledger creado tras una colisión de números de ADR: ambos carriles tomaron
  independientemente el ADR-0112 (RAG vs Lighthouse). Se resolvió renumerando Lighthouse a 0113;
  RAG conserva 0112. Los carriles y el protocolo de reserva quedaron establecidos arriba.
