/**
 * shared.js — the module both GitHub Pages views import.
 *
 * Owns the reader's preferences (language, reading level, theme, motion), the
 * bilingual UI table, the shell header, toasts and a few helpers. Nothing here
 * knows about the map or the poster: app.js and the viewer wire it up.
 *
 * Preference precedence: query string > hash (legacy `#lang=`) > localStorage
 * > navigator.language (es* → es) > defaults. Every storage access is wrapped:
 * private windows and blocked site data must never break the page.
 */

export const PREF_KEY = 'evolith.pages.v1';
export const LEVELS = ['executive', 'architect', 'engineer'];
export const THEMES = ['auto', 'light', 'dark'];
export const REPO_URL = 'https://github.com/beyondnetcode/evolith_arch32';
/** Nav pill labels are the short names (spec §1.4: `Atlas` / `Vision poster`); `openAtlas`/`openPoster` are the long call-to-action strings. */
export const PAGES = {
  atlas: { href: './', key: 'navAtlas' },
  poster: { href: './master-view.html', key: 'navPoster' },
};

const DEFAULTS = { lang: 'en', level: 'executive', theme: 'auto', motion: 'auto' };

const storage = {
  read() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch { return {}; }
  },
  write(patch) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ ...storage.read(), ...patch })); } catch { /* private window: preferences are session-only */ }
  },
};

/** Query + legacy hash parameters, query winning. */
export function urlParams() {
  const out = new Map();
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (hash.includes('=')) for (const [k, v] of new URLSearchParams(hash)) out.set(k, v);
  for (const [k, v] of new URLSearchParams(location.search)) out.set(k, v);
  return out;
}

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/** Resolve the four preferences through the precedence chain. */
export function readPrefs() {
  const q = urlParams();
  const stored = storage.read();
  const browser = (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : DEFAULTS.lang;
  return {
    lang: pick(q.get('lang') || stored.lang || browser, ['en', 'es'], DEFAULTS.lang),
    level: pick(q.get('level') || stored.level, LEVELS, DEFAULTS.level),
    theme: pick(q.get('theme') || stored.theme, THEMES, DEFAULTS.theme),
    motion: pick(q.get('motion') || stored.motion, ['auto', 'on', 'off'], DEFAULTS.motion),
  };
}

/** Persist one preference and mirror it into the URL (replaceState, no history entry). */
export function setPref(key, value) {
  storage.write({ [key]: value });
  const url = new URL(location.href);
  if (value === DEFAULTS[key]) url.searchParams.delete(key); else url.searchParams.set(key, value);
  if (url.hash.includes('=')) url.hash = '';
  history.replaceState(history.state, '', url);
}

/** Apply theme + motion to <html>; keeps <meta name="theme-color"> in step. */
export function applyTheme(theme, motion = 'auto') {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = theme;
  if (motion === 'auto') root.removeAttribute('data-motion'); else root.dataset.motion = motion;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  meta.content = dark ? '#0F161D' : '#F4F6F8';
}

/** True when motion should be suppressed (OS preference unless the reader forced it on/off). */
export function reducedMotion(motion = 'auto') {
  if (motion === 'off') return true;
  if (motion === 'on') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Bilingual table → t(key, vars). Missing keys return the key itself, loudly in the console. */
export function createI18n(ui, lang) {
  const missing = new Set();
  const api = {
    lang,
    t(key, vars = {}) {
      const entry = ui[key];
      let text = entry ? (entry[api.lang] || entry.en || '') : '';
      if (!entry && !missing.has(key)) { missing.add(key); console.warn(`[i18n] missing ui key: ${key}`); }
      if (!entry) text = key;
      return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    },
    /** A {en, es} object → the current language, English as fallback. */
    pick(field) {
      if (field == null) return '';
      if (typeof field === 'string') return field;
      return field[api.lang] || field.en || '';
    },
    setLang(next) { api.lang = next; },
  };
  return api;
}

export function formatNumber(value, lang) {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? new Intl.NumberFormat(lang === 'es' ? 'es' : 'en').format(n) : String(value);
}

/** Whole days between an ISO date and today (UTC); NaN when the date is not parseable. */
export function daysSince(isoDate) {
  const then = Date.parse(isoDate);
  return Number.isFinite(then) ? Math.floor((Date.now() - then) / 86400000) : NaN;
}

/** Build a link to the other page carrying the reader's preferences and, optionally, a chapter. */
export function pageUrl(page, prefs, extra = {}) {
  const url = new URL(PAGES[page].href, location.href);
  for (const [k, v] of Object.entries({ ...prefs, ...extra })) {
    if (v != null && v !== '' && v !== DEFAULTS[k]) url.searchParams.set(k, v);
  }
  return url.pathname + url.search;
}

const ICONS = {
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18A9 9 0 0 0 12 3z" fill="currentColor"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.9-.3 2.8 1a9.5 9.5 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1a3.6 3.6 0 0 1 .1 2.7 3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.8-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};
export const icon = (name) => ICONS[name] || '';

const BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 64 76" aria-hidden="true"><path d="M32 2 61 18v12L32 14 3 30V18L32 2Z" fill="#52a69c"/><path d="M3 35 32 51l29-16v12L32 63 3 47V35Z" fill="#214d70"/><path d="M3 20 32 36l29-16v12L32 48 3 32V20Z" fill="#17344d"/><path d="M18 28 32 36l14-8 11 6-25 14L7 34l11-6Z" fill="#eef7f8"/></svg>';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Render the shared header into `root`. `page` is 'atlas' | 'poster'. Callbacks fire
 * with the new value; the caller re-renders what it owns. Returns a `refresh()` that
 * re-renders the header strings (after a language change).
 */
export function renderHeader(root, { i18n, page, prefs, on }) {
  function paint() {
    const t = (k, vars) => i18n.t(k, vars);
    const otherLang = i18n.lang === 'es' ? 'en' : 'es';
    const nav = ['atlas', 'poster'].map((p) => `<a href="${pageUrl(p, prefs)}" ${p === page ? 'aria-current="page"' : ''}>${esc(t(PAGES[p].key))}</a>`).join('');
    const levels = LEVELS.map((l) => `<button type="button" role="radio" aria-checked="${prefs.level === l}" data-level="${l}" ${prefs.level === l ? 'tabindex="0"' : 'tabindex="-1"'}>${esc(t(l))}</button>`).join('');
    const themes = THEMES.map((th) => `<button type="button" role="menuitemradio" aria-checked="${prefs.theme === th}" data-theme-choice="${th}">${esc(t(`theme${th[0].toUpperCase()}${th.slice(1)}`))}</button>`).join('');
    root.innerHTML = `
      <a class="brand" href="${REPO_URL}" rel="noopener">${BRAND_MARK}<span class="wordmark">Evolith</span></a>
      <nav class="nav-pill" aria-label="${esc(t('pagesNav'))}">${nav}</nav>
      <details class="menu">
        <summary aria-label="${esc(t('settings'))}">${icon('gear')}</summary>
        <div class="menu-body">
          <div class="level" role="radiogroup" aria-label="${esc(t('readingLevel'))}">${levels}</div>
          <button type="button" class="lang" lang="${otherLang}" aria-label="${esc(t('switchLang'))}">${icon('globe')}<span>${otherLang.toUpperCase()}</span></button>
          <div class="theme">
            <button type="button" class="theme-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(t('themeAria', { theme: t(`theme${prefs.theme[0].toUpperCase()}${prefs.theme.slice(1)}`) }))}">${icon('theme')}</button>
            <div class="theme-menu" role="menu" hidden>${themes}</div>
          </div>
          <a class="repo" href="${REPO_URL}" rel="noopener" aria-label="${esc(t('openRepo'))}">${icon('github')}</a>
        </div>
      </details>`;
    wire();
  }
  function wire() {
    const group = root.querySelector('.level');
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-level]'); if (!b) return;
      prefs.level = b.dataset.level; setPref('level', prefs.level); paint(); on.level?.(prefs.level);
    });
    group.addEventListener('keydown', (e) => {
      const items = [...group.querySelectorAll('[data-level]')];
      const i = items.findIndex((el) => el === document.activeElement);
      if (i === -1 || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length];
      next.click(); next.focus();
    });
    root.querySelector('.lang').addEventListener('click', () => {
      prefs.lang = i18n.lang === 'es' ? 'en' : 'es'; i18n.setLang(prefs.lang); setPref('lang', prefs.lang);
      document.documentElement.lang = prefs.lang; paint(); on.lang?.(prefs.lang);
    });
    const themeBtn = root.querySelector('.theme-btn');
    const menu = root.querySelector('.theme-menu');
    const closeMenu = () => { menu.hidden = true; themeBtn.setAttribute('aria-expanded', 'false'); };
    themeBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; themeBtn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) menu.querySelector('[aria-checked="true"]')?.focus(); });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme-choice]'); if (!b) return;
      prefs.theme = b.dataset.themeChoice; setPref('theme', prefs.theme); applyTheme(prefs.theme, prefs.motion); paint(); on.theme?.(prefs.theme);
    });
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); themeBtn.focus(); } });
  }
  // One document listener per header, not one per repaint (paint() runs on every level/lang/theme change).
  document.addEventListener('click', (e) => {
    const menu = root.querySelector('.theme-menu');
    if (menu && !menu.hidden && !root.contains(e.target)) { menu.hidden = true; root.querySelector('.theme-btn')?.setAttribute('aria-expanded', 'false'); }
  });
  // A closed <details> renders nothing but its summary, whatever the CSS says: on wide
  // screens the controls live in the open element (the summary is hidden), on phones the
  // gear toggles it. Track the breakpoint so a resize never strands the controls.
  const wide = matchMedia('(min-width: 900px)');
  const syncMenu = () => { const d = root.querySelector('details.menu'); if (d) d.open = wide.matches; };
  wide.addEventListener('change', syncMenu);
  const painted = paint;
  paint = () => { painted(); syncMenu(); };
  paint();
  return { refresh: paint };
}

/**
 * A chip/status `source` citation → HTML. Citations are prose-shaped ("a/b.ts:33-72; docs/x.md (ADR-0101)",
 * "git shortlog -sn", "evolith_tracker@818a2819 README.md"): each `;`-separated segment whose head is a
 * repo path (contains `/` or an extension, no spaces) becomes a `docsBase + path#Lstart-Lend` link and the
 * rest stays text, so no link ever points at a URL that cannot exist on the tree.
 */
export function sourceLinksHtml(source, docsBase) {
  return String(source || '').split(/;\s*/).filter(Boolean).map((segment) => {
    const m = /^([A-Za-z0-9][A-Za-z0-9._/-]*)(?::(\d+)(?:-(\d+))?)?(\s*\(.*\))?$/.exec(segment.trim());
    const linkable = m && (m[1].includes('/') || /\.[A-Za-z0-9]+$/.test(m[1]));
    if (!linkable) return esc(segment);
    const anchor = m[2] ? `#L${m[2]}${m[3] ? `-L${m[3]}` : ''}` : '';
    const label = `${m[1]}${m[2] ? `:${m[2]}${m[3] ? `-${m[3]}` : ''}` : ''}`;
    return `<a href="${esc(docsBase + m[1] + anchor)}" rel="noopener">${esc(label)}</a>${esc(m[4] || '')}`;
  }).join('; ');
}

let toastTimer = null;
/** A polite, self-dismissing status message (replaces every alert()). */
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = message; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
}

/** Copy text; resolves to true on success. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Focus trap for a dialog-like region; returns a release() function. */
export function trapFocus(container, onEscape) {
  const selector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const opener = document.activeElement;
  function onKey(e) {
    if (e.key === 'Escape') { onEscape?.(); return; }
    if (e.key !== 'Tab') return;
    const items = [...container.querySelectorAll(selector)].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', onKey);
  return () => { container.removeEventListener('keydown', onKey); opener?.focus?.(); };
}
