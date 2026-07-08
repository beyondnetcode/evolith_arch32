#!/usr/bin/env node
/**
 * 38-validate-okf-projection.mjs — CI gate para la proyección OKF publicada (ADR-0105).
 *
 * Envuelve --verify del proyector: conformidad OKF v0.1 + up-to-date. Bloquea si:
 *   - algún concepto no conforma (frontmatter/`type`)          -> drift de conformidad
 *   - el bundle publicado (reference/knowledge/okf/) quedó      -> drift de sincronía
 *     desincronizado del corpus canónico
 *
 * Es offline y determinista (regenera con el as-of del bundle publicado y compara).
 * Prueba el invariante clave del ADR-0105: `publicado == regenerar(canonical)`, de modo
 * que el bundle commiteado nunca puede mentir ni volverse autoridad.
 *
 * Única fuente de verdad: .harness/scripts/knowledge-okf-project.mjs --verify.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('node', ['.harness/scripts/knowledge-okf-project.mjs', '--verify'], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
