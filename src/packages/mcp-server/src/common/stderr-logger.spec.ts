import { StderrLogger } from './stderr-logger';

describe('StderrLogger', () => {
  it('routes every level through the destination stream (stderr in prod)', () => {
    const writes: string[] = [];
    const collector = { write: (chunk: string) => writes.push(chunk) };
    const logger = new StderrLogger('trace', collector);

    logger.log('hello', 'Ctx');
    logger.error('bad', 'trace', 'Ctx');
    logger.warn('careful');
    logger.debug('details');
    logger.verbose('trace-level');

    const all = writes.join('');
    expect(all).toContain('hello');
    expect(all).toContain('bad');
    expect(all).toContain('careful');
  });
});
