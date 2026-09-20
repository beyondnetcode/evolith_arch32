/**
 * @file interpolate.mjs
 * @description `{{dotted.path}}` placeholders → metric values. Shared by the map build
 * and the poster generator so neither ever types a number. Numbers are formatted for
 * the language of the string they land in (`1,492` in English, `1.492` in Spanish):
 * the walk remembers whether it descended through an `en` or an `es` key.
 */

/** Look a dotted path up; `undefined` when any segment is missing. */
export const lookup = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const formatters = { en: new Intl.NumberFormat('en-US'), es: new Intl.NumberFormat('es', { useGrouping: 'always' }) };

/** Integers ≥ 1000 get thousands separators per language; everything else prints as-is. */
export function formatValue(v, lang) {
  if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) >= 1000) return formatters[lang || 'en'].format(v);
  return String(v);
}

/**
 * Replace every `{{dotted.path}}` in every string of `value` (recursively through
 * arrays and objects). Unknown or non-scalar placeholders are left in place and
 * collected in `ctx.unknown` so the caller can fail loudly. `ctx.lang` is the language
 * of the current subtree ('en' unless an `es` key was crossed).
 */
export function interpolate(value, metrics, ctx = {}) {
  const { unknown = new Set(), lang = 'en' } = ctx;
  if (typeof value === 'string') {
    return value.replace(/\{\{([\w.-]+)\}\}/g, (m, key) => {
      const v = lookup(metrics, key);
      if (v === undefined || v === null || typeof v === 'object') { unknown.add(key); return m; }
      return formatValue(v, lang);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, metrics, { unknown, lang }));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, metrics, { unknown, lang: k === 'en' || k === 'es' ? k : lang })]));
  }
  return value;
}

/** Every placeholder key mentioned anywhere in `value`. */
export function placeholders(value, out = new Set()) {
  if (typeof value === 'string') for (const m of value.matchAll(/\{\{([\w.-]+)\}\}/g)) out.add(m[1]);
  else if (Array.isArray(value)) value.forEach((v) => placeholders(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => placeholders(v, out));
  return out;
}
