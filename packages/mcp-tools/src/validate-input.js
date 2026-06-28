/**
 * GT-352: minimal, dependency-free validation of tool arguments against a
 * tool's JSON-Schema `inputSchema`. The Evolith tool schemas are intentionally
 * simple (an object with typed properties + `required`), so this covers exactly
 * what they use rather than pulling in a full JSON-Schema engine.
 *
 * @param {object} schema - the tool's `inputSchema` (JSON Schema, type: object).
 * @param {unknown} args - the arguments passed in the CallTool request.
 * @returns {string[]} a list of human-readable validation errors (empty = valid).
 */
export function validateInput(schema, args) {
  const errors = [];
  if (!schema || schema.type !== 'object') {
    return errors; // nothing declared to validate
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return ['arguments must be an object'];
  }

  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const key of required) {
    if (!(key in args) || args[key] === undefined) {
      errors.push(`missing required property: ${key}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    const spec = properties[key];
    if (!spec) {
      if (schema.additionalProperties === false) {
        errors.push(`unexpected property: ${key}`);
      }
      continue;
    }
    if (value === undefined) {
      continue; // absence already handled by the required check
    }
    if (spec.type && !matchesType(value, spec.type)) {
      errors.push(`property '${key}' must be of type ${spec.type}`);
    }
  }

  return errors;
}

function matchesType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true; // unknown type keyword — do not block
  }
}
