import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DEFAULT_RESOURCE_SCOPES,
  buildProtectedResourceMetadata,
  buildWwwAuthenticate,
  isResourceMetadataPath,
  resolveResourceMetadata,
  wellKnownMetadataPaths,
} from './protected-resource-metadata';

describe('Protected Resource Metadata (GT-582)', () => {
  describe('document', () => {
    it('carries the fields RFC 9728 and MCP require', () => {
      const doc = buildProtectedResourceMetadata({
        resource: 'https://mcp.example.com/mcp',
        authorizationServers: ['https://auth.example.com'],
      });
      expect(doc).toEqual({
        resource: 'https://mcp.example.com/mcp',
        authorization_servers: ['https://auth.example.com'],
        scopes_supported: DEFAULT_RESOURCE_SCOPES,
        bearer_methods_supported: ['header'],
      });
    });

    it('advertises only header-borne tokens (MCP forbids the query string)', () => {
      const doc = buildProtectedResourceMetadata({ resource: 'https://m', authorizationServers: ['https://a'] });
      expect(doc.bearer_methods_supported).not.toContain('query');
    });

    it('keeps scopes_supported minimal — admin is earned by step-up, not published', () => {
      expect(DEFAULT_RESOURCE_SCOPES).not.toContain('admin');
    });
  });

  describe('resolution from configuration', () => {
    it('is null when no authorization server is configured', () => {
      expect(resolveResourceMetadata({} as NodeJS.ProcessEnv, 'https://m')).toBeNull();
    });

    it('derives the authorization server from the OAuth issuer', () => {
      const input = resolveResourceMetadata(
        { EVOLITH_MCP_OAUTH_ISSUER: 'https://issuer.example.com' } as unknown as NodeJS.ProcessEnv,
        'https://mcp.example.com',
      );
      expect(input).toMatchObject({
        authorizationServers: ['https://issuer.example.com'],
        resource: 'https://mcp.example.com',
      });
    });

    it('prefers an explicit list of authorization servers', () => {
      const input = resolveResourceMetadata(
        {
          EVOLITH_MCP_OAUTH_ISSUER: 'https://issuer.example.com',
          EVOLITH_MCP_RESOURCE_AUTH_SERVERS: 'https://a.example.com, https://b.example.com',
        } as unknown as NodeJS.ProcessEnv,
        'https://m',
      );
      expect(input?.authorizationServers).toEqual(['https://a.example.com', 'https://b.example.com']);
    });

    it('uses the audience as the canonical resource when one is configured', () => {
      const input = resolveResourceMetadata(
        {
          EVOLITH_MCP_OAUTH_ISSUER: 'https://issuer.example.com',
          EVOLITH_MCP_OAUTH_AUDIENCE: 'https://mcp.example.com/mcp',
        } as unknown as NodeJS.ProcessEnv,
        'https://fallback',
      );
      expect(input?.resource).toBe('https://mcp.example.com/mcp');
    });
  });

  describe('well-known URIs', () => {
    it('offers the path-inserted URI before the root, as clients probe them', () => {
      expect(wellKnownMetadataPaths('/mcp')).toEqual([
        '/.well-known/oauth-protected-resource/mcp',
        '/.well-known/oauth-protected-resource',
      ]);
    });

    it('offers only the root for a server mounted at the root', () => {
      expect(wellKnownMetadataPaths('/')).toEqual(['/.well-known/oauth-protected-resource']);
    });

    it.each([
      ['/.well-known/oauth-protected-resource', true],
      ['/.well-known/oauth-protected-resource/mcp', true],
      ['/.well-known/oauth-authorization-server', false],
      ['/mcp', false],
    ])('recognises %s as a metadata path: %s', (pathname, expected) => {
      expect(isResourceMetadataPath(pathname)).toBe(expected);
    });
  });

  describe('WWW-Authenticate challenge', () => {
    it('names the metadata URL and the scopes needed', () => {
      const challenge = buildWwwAuthenticate({
        resourceMetadataUrl: 'https://mcp.example.com/.well-known/oauth-protected-resource',
        scope: 'read write',
        error: 'invalid_token',
      });
      expect(challenge).toBe(
        'Bearer error="invalid_token", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource", scope="read write"',
      );
    });

    it('supports the insufficient_scope challenge for a step-up', () => {
      const challenge = buildWwwAuthenticate({
        resourceMetadataUrl: 'https://m/.well-known/oauth-protected-resource',
        scope: 'write',
        error: 'insufficient_scope',
        errorDescription: 'Write permission required',
      });
      expect(challenge).toContain('error="insufficient_scope"');
      expect(challenge).toContain('error_description="Write permission required"');
    });

    it('never emits an unbalanced quote from a hostile description', () => {
      const challenge = buildWwwAuthenticate({
        resourceMetadataUrl: 'https://m/.well-known/oauth-protected-resource',
        errorDescription: 'bad " quote',
      });
      expect(challenge.split('"').length % 2).toBe(1);
    });
  });

  /**
   * GT-582 — the 2026-07-28 revision deprecates Dynamic Client Registration in
   * favour of Client ID Metadata Documents. This server is a resource server, so
   * what it owes is to publish resource metadata (above) and to keep client
   * registration off its own surface entirely. This guard fails the build if an
   * RFC 7591 registration path is ever introduced here.
   */
  describe('independence from Dynamic Client Registration', () => {
    const srcRoot = path.resolve(__dirname, '..');

    function sourceFiles(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return entry.isFile() && full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
      });
    }

    /** Comments explain why DCR is absent; only executable code can reintroduce it. */
    const stripComments = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    it('implements no registration endpoint and requires no DCR flow', () => {
      const offenders = sourceFiles(srcRoot).filter((file) => {
        const code = stripComments(fs.readFileSync(file, 'utf8'));
        return /registration_endpoint|client_secret_expires_at|\/oauth\/register/.test(code);
      });
      expect(offenders.map((f) => path.relative(srcRoot, f))).toEqual([]);
    });

    it('is not vacuous: the guard sees the source it is meant to police', () => {
      const files = sourceFiles(srcRoot);
      expect(files.length).toBeGreaterThan(20);
      expect(files.some((f) => f.endsWith('mcp-server.service.ts'))).toBe(true);
    });
  });
});
