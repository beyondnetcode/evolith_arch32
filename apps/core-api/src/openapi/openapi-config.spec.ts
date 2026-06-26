import { OPENAPI_CONFIG, createOpenApiDocument, setupOpenApi } from './openapi-config';

describe('OpenAPI Config', () => {
  it('should export OPENAPI_CONFIG with required fields', () => {
    expect(OPENAPI_CONFIG.title).toBe('Evolith Core API');
    expect(OPENAPI_CONFIG.version).toBe('1.0.0');
    expect(OPENAPI_CONFIG.docsPath).toBe('api/docs');
  });

  it('should export createOpenApiDocument as a function', () => {
    expect(typeof createOpenApiDocument).toBe('function');
  });

  it('should export setupOpenApi as a function', () => {
    expect(typeof setupOpenApi).toBe('function');
  });
});
