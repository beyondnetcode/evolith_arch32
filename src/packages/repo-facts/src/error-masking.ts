/**
 * Error-masking construct detection (GT-594).
 *
 * A CLOSED, purely syntactic list of constructs that prevent an error from being
 * observed. Every member is decidable from the shape of the code alone, so what this
 * module produces is a COUNT, not an opinion: whether a given occurrence is wrong is a
 * judgement the Core does not make (and the reason the resulting signal is emitted as
 * probabilistic and advisory).
 *
 * Two families, kept apart because they mask different things:
 *   - swallowed runtime error — the failure happens and nobody hears it;
 *   - suppressed diagnostic — the compiler objected and was told to be quiet.
 *
 * Deliberately NOT here, and named in the signal's `blindSpots`: masking by logic
 * rather than by syntax (`if (err) return null`), and masking by configuration
 * (`eslint-disable`, a lenient tsconfig, `|| true` in CI) — which is often the most
 * consequential masker in a repository and lives in files this never opens.
 */

import * as ts from 'typescript';
import type { ErrorMaskingFact, ErrorMaskingKind } from '@beyondnet/evolith-core-domain/evaluation/contracts';

/** Matches a `@ts-ignore` / `@ts-expect-error` directive inside a comment. */
const TS_DIRECTIVE = /(?:\/\/|\/\*|\*)\s*@ts-(?:ignore|expect-error)\b/;

export interface MaskingScanContext {
  readonly moduleId: string;
  /** Enclosing declared symbol id for a node, when it sits inside one. */
  readonly symbolIdAt: (node: ts.Node) => string | undefined;
}

/** True when `subtree` contains a `throw` that is not nested inside another function. */
function rethrows(subtree: ts.Node): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isThrowStatement(node)) {
      found = true;
      return;
    }
    // A throw inside a nested function is not a rethrow of THIS handler.
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(subtree, visit);
  return found;
}

/** True when the identifier `name` is read anywhere inside `subtree`. */
function readsIdentifier(subtree: ts.Node, name: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(node) && node.text === name) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(subtree, visit);
  return found;
}

/** The single binding name of a catch clause / handler parameter, when it has a simple one. */
function simpleBindingName(name: ts.BindingName | undefined): string | undefined {
  return name && ts.isIdentifier(name) ? name.text : undefined;
}

/** True when `node` is `<something>.catch(...)`. Syntactic — see the blind spots. */
function isCatchCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'catch' &&
    node.arguments.length > 0
  );
}

/**
 * Every error-masking occurrence in one source file, in deterministic (source) order.
 *
 * `ts.forEachChild` visits in positional order and directive comments are scanned
 * line by line, so two runs over the same file emit the same list.
 */
export function scanErrorMasking(
  sourceFile: ts.SourceFile,
  context: MaskingScanContext,
): ErrorMaskingFact[] {
  const found: ErrorMaskingFact[] = [];

  const record = (node: ts.Node, kind: ErrorMaskingKind): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const symbolId = context.symbolIdAt(node);
    found.push({ moduleId: context.moduleId, kind, line, ...(symbolId ? { symbolId } : {}) });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCatchClause(node)) {
      if (node.block.statements.length === 0) {
        record(node, 'empty-catch');
      } else {
        const bound = simpleBindingName(node.variableDeclaration?.name);
        const observed = bound !== undefined && readsIdentifier(node.block, bound);
        if (!observed && !rethrows(node.block)) record(node, 'catch-discards-error');
      }
    } else if (isCatchCall(node)) {
      const handler = node.arguments[0];
      if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
        const bound = simpleBindingName(handler.parameters[0]?.name);
        const body = handler.body;
        const empty = ts.isBlock(body) && body.statements.length === 0;
        const observed = bound !== undefined && readsIdentifier(body, bound);
        if (empty || (!observed && !rethrows(body))) record(node, 'promise-catch-swallow');
      }
    } else if (ts.isAsExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      record(node, 'any-assertion');
    } else if (ts.isTypeAssertionExpression(node) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      record(node, 'any-assertion');
    } else if (ts.isNonNullExpression(node)) {
      record(node, 'non-null-assertion');
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  // Directive suppressions are comments, not nodes: scanned textually, line by line.
  const lines = sourceFile.getFullText().split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (TS_DIRECTIVE.test(lines[i])) {
      found.push({ moduleId: context.moduleId, kind: 'ts-directive-suppression', line: i + 1 });
    }
  }

  return found;
}
