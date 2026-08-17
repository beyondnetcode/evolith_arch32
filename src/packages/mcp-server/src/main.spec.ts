import { parseArgs } from './main';

describe('parseArgs', () => {
  it('defaults to serve over stdio on port 3000', () => {
    const cli = parseArgs(['node', 'main'], {});
    expect(cli).toEqual({ command: 'serve', transport: 'stdio', port: 3000, apiKey: undefined, allowNoAuth: false });
  });

  it('reads the command, flags and api key', () => {
    const cli = parseArgs(
      ['node', 'main', 'serve', '--transport', 'http', '--port', '49100', '--api-key', 'k'],
      {},
    );
    expect(cli).toMatchObject({ command: 'serve', transport: 'http', port: 49100, apiKey: 'k', allowNoAuth: false });
  });

  it('supports --flag=value syntax', () => {
    const cli = parseArgs(['node', 'main', '--transport=http', '--port=8080'], {});
    expect(cli).toMatchObject({ transport: 'http', port: 8080, allowNoAuth: false });
  });

  it('falls back to environment variables', () => {
    const cli = parseArgs(['node', 'main'], { TRANSPORT: 'http', PORT: '5000', EVOLITH_API_KEY: 'env-key' });
    expect(cli).toMatchObject({ transport: 'http', port: 5000, apiKey: 'env-key', allowNoAuth: false });
  });

  it('parses --allow-no-auth flag', () => {
    const cli = parseArgs(['node', 'main', '--allow-no-auth'], {});
    expect(cli.allowNoAuth).toBe(true);
  });

  it('parses EVOLITH_MCP_ALLOW_NO_AUTH env', () => {
    const cli = parseArgs(['node', 'main'], { EVOLITH_MCP_ALLOW_NO_AUTH: 'true' });
    expect(cli.allowNoAuth).toBe(true);
  });

  it('recognizes the version command', () => {
    expect(parseArgs(['node', 'main', 'version'], {}).command).toBe('version');
  });

  // The defect these were written against, measured on the published 1.3.2:
  // `command` was `args.find((a) => !a.startsWith('-')) ?? 'serve'`, so every
  // flag spelling fell through to 'serve' and `evolith-mcp --version` started
  // the MCP server. With stdin closed it exited 0 printing nothing; with stdin
  // open it never returned. The positional `version` worked the whole time,
  // which is why nothing noticed.
  it.each(['--version', '-v', '-V'])('treats %s as the version command, not serve', (flag) => {
    expect(parseArgs(['node', 'main', flag], {}).command).toBe('version');
  });

  it.each(['--help', '-h'])('treats %s as the help command, not serve', (flag) => {
    expect(parseArgs(['node', 'main', flag], {}).command).toBe('help');
  });

  it('does not fall back to serve for a flag-shaped command', () => {
    expect(parseArgs(['node', 'main', '--version'], {}).command).not.toBe('serve');
    expect(parseArgs(['node', 'main', '--help'], {}).command).not.toBe('serve');
  });

  it('answers the version even when transport flags are also present', () => {
    // A probe does not curate its argv, and booting a server because one was
    // present is the behaviour being removed.
    expect(parseArgs(['node', 'main', '--transport', 'http', '--version'], {}).command).toBe('version');
  });

  it('still serves when only real flags are given', () => {
    expect(parseArgs(['node', 'main', '--transport', 'http', '--port', '8080'], {}).command).toBe('serve');
    expect(parseArgs(['node', 'main', 'serve', '--allow-no-auth'], {}).command).toBe('serve');
  });

  // Found by the test above, which failed on the FIXED parser for a reason that
  // had nothing to do with --version: `http` is the first token not starting
  // with `-`, so it was read as the command and `evolith-mcp --transport http`
  // exited 1 with `Unknown command: http`.
  it('does not mistake a flag value for the command', () => {
    expect(parseArgs(['node', 'main', '--transport', 'http'], {}).command).toBe('serve');
    expect(parseArgs(['node', 'main', '--port', '8080'], {}).command).toBe('serve');
    expect(parseArgs(['node', 'main', '--api-key', 'secret'], {}).command).toBe('serve');
    expect(parseArgs(['node', 'main', '-t', 'http'], {}).command).toBe('serve');
  });

  it('still parses the values it skipped over', () => {
    const cli = parseArgs(['node', 'main', '--transport', 'http', '--port', '8080', '--api-key', 'k'], {});
    expect(cli).toMatchObject({ command: 'serve', transport: 'http', port: 8080, apiKey: 'k' });
  });

  it('does not read a flag value as a version request', () => {
    // `--api-key -v` is a strange key, but the value belongs to the flag.
    expect(parseArgs(['node', 'main', '--api-key', '-v'], {}).command).toBe('serve');
    expect(parseArgs(['node', 'main', '--api-key', '-v'], {}).apiKey).toBe('-v');
  });
});
