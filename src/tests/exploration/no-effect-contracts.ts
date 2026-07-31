import { Surface } from './types';

/**
 * GT-643 — contracts whose entire content is the ABSENCE of an effect.
 *
 * A `--dry-run` promises one thing only: that nothing changed. The exploratory
 * tester could not check that, because it compares REPLIES, and a reply is
 * exactly what a dry run that writes still gets right — `evolith agents install
 * --dry-run` reported success while creating `rulesets/agents/<name>/` and
 * rewriting `agents-registry.json`. It was found by hand, in a `git status`.
 *
 * Each contract declares the invocation, the state that must not move, and a
 * CONTRAST invocation that must move it. The contrast is not optional decoration:
 * without it, a command that stopped working entirely would satisfy every
 * no-effect assertion in this file, and the oracle would be green precisely when
 * the product was most broken.
 */
export interface NoEffectInvocation {
  cli?: string[];
  /** MCP tool + args. Declared for the day a surface grows the flag. */
  mcp?: { tool: string; args: Record<string, unknown> };
  rest?: { method: string; path: string; body?: unknown };
}

export interface NoEffectContract {
  /** Stable id, used as the finding's operationId. */
  id: string;
  /** The flag under test, for the report. */
  flag: string;
  description: string;
  /** Surfaces this contract is declared on. */
  surfaces: Surface[];
  /** The invocation that must change nothing. */
  invocation: NoEffectInvocation;
  /**
   * The same operation WITHOUT the flag. It must change something, or the
   * assertion above is vacuous.
   */
  contrast: NoEffectInvocation;
  /**
   * Extra roots (absolute) that must not move either, beyond the sandbox the
   * command runs in. `agents install` writes to `process.cwd()`, so the sandbox
   * covers it; a command that wrote into the CLI package instead would be caught
   * only by naming that root here.
   */
  extraRoots?: (ctx: { corePath: string; projectPath: string }) => string[];
}

export const NO_EFFECT_CONTRACTS: NoEffectContract[] = [
  {
    id: 'agents-install--dry-run',
    flag: 'agents install --dry-run',
    description:
      'The instance GT-643 was opened for: the flag was declared, documented, typed on the '
      + 'options interface, and never read, so the dry run installed the agent.',
    surfaces: ['cli'],
    // The prompt mock answers `test-value` to every question, so that is the
    // agent name on both branches.
    invocation: { cli: ['agents', 'install', '--dry-run'] },
    contrast: { cli: ['agents', 'install'] },
  },
  {
    id: 'agents--dry-run-menu-path',
    flag: 'agents --dry-run (no subcommand)',
    description:
      'The menu path forwards the caller options to the chosen subcommand. It used to drop '
      + 'them and write anyway — the path a user takes when they are unsure enough to want a '
      + 'dry run in the first place.',
    surfaces: ['cli'],
    invocation: { cli: ['agents', '--dry-run'] },
    contrast: { cli: ['agents', '--install', 'test-value'] },
  },
  {
    id: 'init--dry-run',
    flag: 'init --dry-run',
    description:
      'The convention `agents` was out of step with: `init` swaps the filesystem for a '
      + 'DryRunFileSystem. Covered so the CLASS is checked and not the one instance that was '
      + 'already broken.',
    surfaces: ['cli'],
    invocation: {
      cli: ['init', '--yes', '--name', 'explore-noeffect', '--runtime', 'nodejs', '--dry-run'],
    },
    contrast: { cli: ['init', '--yes', '--name', 'explore-noeffect', '--runtime', 'nodejs'] },
  },
];
