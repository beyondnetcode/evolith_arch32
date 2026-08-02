import { parseLabels } from './calibrate.command';

/**
 * GT-585 · criterion 2 — the corpus parser.
 *
 * The arithmetic is tested where it lives, in `core-domain/domain/calibration`, against worked
 * examples with published answers. What is tested HERE is the boundary: everything that decides
 * whether a row enters the sample at all, because a parser that quietly drops or invents rows
 * biases every figure downstream and does it silently.
 */
describe('calibration corpus parsing', () => {
  it('reads JSONL, because a corpus grows one adjudication at a time', () => {
    const rows = parseLabels(
      [
        '{"subject":"pr-1","rulesetId":"TAX-05","gateBlocked":true,"humanBlocked":false}',
        '{"subject":"pr-2","rulesetId":"TAX-05","gateBlocked":false,"humanBlocked":false}',
      ].join('\n'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      subject: 'pr-1',
      rulesetId: 'TAX-05',
      gateBlocked: true,
      humanBlocked: false,
    });
  });

  it('reads a JSON array too', () => {
    const rows = parseLabels('[{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true}]');
    expect(rows).toHaveLength(1);
  });

  it('REFUSES a row whose human verdict is missing instead of defaulting it to false', () => {
    // Coercing an unadjudicated row to "allowed" would add a true negative nobody judged, and
    // every rate below would drift in the flattering direction.
    expect(() => parseLabels('{"subject":"a","rulesetId":"r","gateBlocked":true}')).toThrow(
      /`humanBlocked` must be a boolean/,
    );
  });

  it('refuses a row with no subject or no ruleset', () => {
    expect(() => parseLabels('{"rulesetId":"r","gateBlocked":true,"humanBlocked":true}')).toThrow(
      /`subject`/,
    );
    expect(() => parseLabels('{"subject":"a","gateBlocked":true,"humanBlocked":true}')).toThrow(
      /`rulesetId`/,
    );
  });

  it('names the offending row, because a corpus is edited by hand', () => {
    const raw = [
      '{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true}',
      '{"subject":"b","rulesetId":"r","gateBlocked":true,"humanBlocked":true}',
      '{"subject":"c","rulesetId":"r","gateBlocked":true}',
    ].join('\n');
    expect(() => parseLabels(raw)).toThrow(/row 3/);
  });

  it('accepts a second rater and keeps it optional', () => {
    const withSecond = parseLabels(
      '{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true,"secondHumanBlocked":false}',
    );
    expect(withSecond[0].secondHumanBlocked).toBe(false);

    const without = parseLabels('{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true}');
    expect(without[0]).not.toHaveProperty('secondHumanBlocked');
  });

  it('refuses a non-boolean second rater rather than ignoring it', () => {
    expect(() =>
      parseLabels('{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true,"secondHumanBlocked":"yes"}'),
    ).toThrow(/secondHumanBlocked/);
  });

  it('treats an empty corpus as empty, not as an error', () => {
    // Zero labels is a legitimate state today — no production, no overrides. The REPORT is what
    // says every figure is undefined; the parser has no opinion about it.
    expect(parseLabels('   \n  ')).toEqual([]);
  });

  it('skips blank lines and comments so a corpus can be annotated', () => {
    const raw = [
      '// wave 1, adjudicated 2026-08-02',
      '',
      '{"subject":"a","rulesetId":"r","gateBlocked":true,"humanBlocked":true}',
    ].join('\n');
    expect(parseLabels(raw)).toHaveLength(1);
  });
});
