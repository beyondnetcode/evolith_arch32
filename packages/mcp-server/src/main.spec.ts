import { parseArgs } from './main';

describe('parseArgs', () => {
  it('defaults to serve over stdio on port 3000', () => {
    const cli = parseArgs(['node', 'main'], {});
    expect(cli).toEqual({ command: 'serve', transport: 'stdio', port: 3000, apiKey: undefined });
  });

  it('reads the command, flags and api key', () => {
    const cli = parseArgs(
      ['node', 'main', 'serve', '--transport', 'http', '--port', '49100', '--api-key', 'k'],
      {},
    );
    expect(cli).toMatchObject({ command: 'serve', transport: 'http', port: 49100, apiKey: 'k' });
  });

  it('supports --flag=value syntax', () => {
    const cli = parseArgs(['node', 'main', '--transport=http', '--port=8080'], {});
    expect(cli).toMatchObject({ transport: 'http', port: 8080 });
  });

  it('falls back to environment variables', () => {
    const cli = parseArgs(['node', 'main'], { TRANSPORT: 'http', PORT: '5000', EVOLITH_API_KEY: 'env-key' });
    expect(cli).toMatchObject({ transport: 'http', port: 5000, apiKey: 'env-key' });
  });

  it('recognizes the version command', () => {
    expect(parseArgs(['node', 'main', 'version'], {}).command).toBe('version');
  });
});
