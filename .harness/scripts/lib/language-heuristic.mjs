#!/usr/bin/env node

/**
 * GT-620 — a cheap language heuristic, and the reason it exists.
 *
 * `reference/core/interfaces/using-the-cli.md` — the ENGLISH slot — opened with
 * `# Cómo usar la CLI de Evolith` and carried 817 Spanish function words against
 * 151 English ones. This suite passed it green, because comparing the COUNT of
 * headings says nothing about the language they are written in. An untranslated
 * file in the wrong slot is exactly the defect bilingual parity exists to catch,
 * and it was the one shape the gate could not see.
 *
 * The heuristic is deliberately dumb and deliberately not a language detector:
 * it counts function words that are unambiguous in one language and absent from
 * the other, over PROSE only. Fenced blocks, inline code and link targets are
 * stripped first, so command flags, identifiers and paths cannot skew the tally.
 * A verdict is only issued when the sample is large enough to mean anything.
 */
const ES_MARKERS = new Set([
  'el','la','los','las','un','una','de','del','que','con','para','por','como','pero',
  'también','este','esta','esto','estos','estas','se','su','sus','al','lo','ya','sin',
  'sobre','entre','cuando','donde','desde','hasta','cada','todo','toda','todos','todas',
  'otro','otra','muy','más','tus','le','les','tiene','tienes','puedes','archivo','archivos',
  'comando','comandos','salida','ruta','rutas','fase','fases','reglas','modo','qué','cómo',
  'está','están','ser','son','sí','así','hacia','porque','aunque','mientras','según',
]);
const EN_MARKERS = new Set([
  'the','a','an','of','to','and','that','with','for','by','as','but','also','this','these',
  'those','it','its','their','at','on','from','until','each','all','every','other','very',
  'your','you','does','has','have','can','want','file','files','command','commands','output',
  'path','paths','phase','phases','rules','mode','what','how','use','is','are','be','not',
  'which','when','where','because','although','while','into','than','then','there',
]);

/**
 * Prose only. Fences, inline code and link targets carry identifiers, not
 * language — and so do TABLE ROWS, which is the correction this heuristic needed
 * on its first real use: `ADR_COVERAGE.es.md` is a Spanish document whose body is
 * a table of English ADR TITLES, and counting those made a correctly-written file
 * look mislabelled. A row of proper nouns is data. Accusing a document that is
 * fine is worse than missing one that is not, because it is what gets a check
 * switched off.
 */
function proseOf(content) {
  return content
    .replace(/^ {0,3}```[^\n]*\n[\s\S]*?^ {0,3}```[^\n]*$/gm, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, '] ')
    .toLowerCase();
}

/**
 * @returns {{en: number, es: number, verdict: 'en'|'es'|'inconclusive'}}
 */
function languageOf(content) {
  let en = 0;
  let es = 0;
  for (const token of proseOf(content).match(/[a-záéíóúñü]+/g) || []) {
    if (EN_MARKERS.has(token)) en += 1;
    else if (ES_MARKERS.has(token)) es += 1;
  }
  // Two guards against a false accusation, which would be worse than the blind
  // spot: too small a sample to judge, and too close a margin to be sure. A
  // stub, a table of identifiers or a mostly-code page stays inconclusive.
  const total = en + es;
  if (total < 40) return { en, es, verdict: 'inconclusive' };
  const dominant = Math.max(en, es);
  if (dominant / total < 0.65) return { en, es, verdict: 'inconclusive' };
  return { en, es, verdict: en > es ? 'en' : 'es' };
}

export { languageOf, proseOf, ES_MARKERS, EN_MARKERS };
