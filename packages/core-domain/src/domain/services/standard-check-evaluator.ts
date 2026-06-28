/**
 * GT-350: safe evaluation of a Standard rule's `check` predicate.
 *
 * The previous implementation used `new Function('code', 'return ' + check)`,
 * which executes arbitrary JavaScript sourced from standards data (a code-
 * execution / sandbox-escape sink). This evaluator instead matches `check`
 * against a small, audited predicate grammar and NEVER executes arbitrary code.
 *
 * Supported grammar (predicates joined by `&&` / `||`, optional leading `!`,
 * optional parentheses):
 *   - code.includes('literal')   code.startsWith('literal')   code.endsWith('literal')
 *   - /regex/flags.test(code)
 *   - code.length <op> <number>   where <op> ∈ > >= < <= === == !== !=
 *   - true | false
 *
 * Anything outside the grammar is treated as non-evaluable and returns `true`
 * (non-blocking) — exactly the fail-open default the old code used on error,
 * but with zero execution.
 */
export function evaluateStandardCheck(check: string, code: string): boolean {
  try {
    return evaluateExpression(check, code);
  } catch {
    return true;
  }
}

function evaluateExpression(expr: string, code: string): boolean {
  const orParts = splitTopLevel(expr, '||');
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateExpression(part, code));
  }
  const andParts = splitTopLevel(expr, '&&');
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateExpression(part, code));
  }
  return evaluatePredicate(expr.trim(), code);
}

/**
 * Splits `expr` on a binary operator at the top level only, ignoring operators
 * inside string literals, regex literals, or parentheses. This keeps the parse
 * declarative — it never evaluates the expression.
 */
function splitTopLevel(expr: string, op: '&&' | '||'): string[] {
  const parts: string[] = [];
  let buf = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inRegex = false;

  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    const prev = expr[i - 1];

    if (inSingle) { if (c === "'" && prev !== '\\') inSingle = false; buf += c; continue; }
    if (inDouble) { if (c === '"' && prev !== '\\') inDouble = false; buf += c; continue; }
    if (inRegex) { if (c === '/' && prev !== '\\') inRegex = false; buf += c; continue; }

    if (c === "'") { inSingle = true; buf += c; continue; }
    if (c === '"') { inDouble = true; buf += c; continue; }
    if (c === '/') { inRegex = true; buf += c; continue; }
    if (c === '(') { depth++; buf += c; continue; }
    if (c === ')') { depth--; buf += c; continue; }

    if (depth === 0 && c === op[0] && expr[i + 1] === op[1]) {
      parts.push(buf);
      buf = '';
      i++; // skip the second operator char
      continue;
    }
    buf += c;
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function evaluatePredicate(predicate: string, code: string): boolean {
  let negate = false;
  let p = predicate.trim();
  if (p.startsWith('!')) {
    negate = true;
    p = p.slice(1).trim();
  }
  while (p.startsWith('(') && p.endsWith(')')) {
    p = p.slice(1, -1).trim();
  }
  const result = matchPredicate(p, code);
  return negate ? !result : result;
}

function matchPredicate(p: string, code: string): boolean {
  // code.includes / startsWith / endsWith with a string literal argument
  const strMatch = p.match(/^code\.(includes|startsWith|endsWith)\(\s*(['"])([\s\S]*)\2\s*\)$/);
  if (strMatch) {
    const arg = unescapeLiteral(strMatch[3]);
    if (strMatch[1] === 'includes') return code.includes(arg);
    if (strMatch[1] === 'startsWith') return code.startsWith(arg);
    return code.endsWith(arg);
  }

  // /regex/flags.test(code)
  const reMatch = p.match(/^\/((?:\\.|[^/])+)\/([gimsuy]*)\.test\(\s*code\s*\)$/);
  if (reMatch) {
    return new RegExp(reMatch[1], reMatch[2]).test(code);
  }

  // code.length <op> <number>
  const lenMatch = p.match(/^code\.length\s*(===|!==|==|!=|>=|<=|>|<)\s*(\d+)$/);
  if (lenMatch) {
    const n = Number(lenMatch[2]);
    switch (lenMatch[1]) {
      case '>': return code.length > n;
      case '>=': return code.length >= n;
      case '<': return code.length < n;
      case '<=': return code.length <= n;
      case '===':
      case '==': return code.length === n;
      case '!==':
      case '!=': return code.length !== n;
    }
  }

  if (p === 'true') return true;
  if (p === 'false') return false;

  throw new Error(`Unsupported standard check predicate: ${p}`);
}

function unescapeLiteral(value: string): string {
  return value.replace(/\\(['"\\])/g, '$1');
}
