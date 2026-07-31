/**
 * Structural fingerprinting of a declaration (GT-594).
 *
 * The fingerprint is a digest of the declaration's NORMALIZED syntax-node stream:
 * the ordered sequence of syntax-kind NAMES of the declaration subtree, with the text
 * of every identifier and literal, and every comment and piece of trivia, erased —
 * because `ts.forEachChild` walks the semantic tree and only the kind is emitted.
 *
 * Equality of two fingerprints is therefore an EQUIVALENCE RELATION over declarations:
 * the classic **Type-2 clone** (identical modulo renaming of identifiers and literals).
 * It is deliberately not a similarity score. A similarity score needs a threshold, a
 * threshold nobody has calibrated is the failure GT-584 exists to prevent, and the
 * Core would then be blocking merges on a knob. Exactness costs recall — a copy with
 * one statement changed has a different fingerprint and is invisible — and that cost
 * is stated in the signal's `blindSpots` rather than hidden behind a tunable.
 *
 * Kind NAMES rather than kind numbers, on purpose: `ts.SyntaxKind` numeric values are
 * renumbered between TypeScript releases, so a numeric stream would silently change
 * meaning on a compiler upgrade. Names are stable, and the residual risk — the
 * compiler's own tree shape changing — is what the delta's indexer-version guard is
 * for.
 */

import { createHash } from 'crypto';
import * as ts from 'typescript';

/** Algorithm prefix, carried in the string so it can be migrated visibly. */
export const FINGERPRINT_ALGORITHM = 'sha256';

export interface StructuralFingerprint {
  /** `sha256:<hex>` over the normalized syntax-kind stream. */
  readonly hash: string;
  /** Number of nodes the stream covers. */
  readonly size: number;
}

/**
 * True when a declaration has a BODY worth fingerprinting.
 *
 * Types, interfaces, enums and plain constants are excluded: structurally identical
 * type shapes are the norm in a well-factored codebase (two DTOs with one string
 * field are not a copy-paste incident), and counting them would fill the metric with
 * the language's own boilerplate. Duplication here means duplicated *behaviour*.
 */
export function isFingerprintable(node: ts.Node): boolean {
  if (ts.isFunctionDeclaration(node)) return node.body !== undefined;
  if (ts.isClassDeclaration(node)) return true;
  if (ts.isVariableDeclaration(node)) {
    const initializer = node.initializer;
    return (
      initializer !== undefined &&
      (ts.isArrowFunction(initializer) ||
        ts.isFunctionExpression(initializer) ||
        ts.isClassExpression(initializer))
    );
  }
  return false;
}

/** The normalized syntax-kind stream of a subtree, in traversal order. */
export function normalizedKindStream(node: ts.Node): string[] {
  const stream: string[] = [];
  const visit = (current: ts.Node): void => {
    stream.push(ts.SyntaxKind[current.kind]);
    ts.forEachChild(current, visit);
  };
  visit(node);
  return stream;
}

/** Fingerprint of a declaration subtree. Pure: same subtree, same digest. */
export function structuralFingerprintOf(node: ts.Node): StructuralFingerprint {
  const stream = normalizedKindStream(node);
  const digest = createHash(FINGERPRINT_ALGORITHM).update(stream.join(','), 'utf8').digest('hex');
  return { hash: FINGERPRINT_ALGORITHM + ':' + digest, size: stream.length };
}
