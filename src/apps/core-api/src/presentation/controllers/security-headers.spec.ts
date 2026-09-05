import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../../app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import helmet from 'helmet';
import { correlationIdMiddleware } from '../../infrastructure/middleware/correlation-id.middleware';


describe('Security & Validation (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // H6: Set CORE_API_AUTH_REQUIRED=false for integration tests (no API key in test env)
    process.env.CORE_API_AUTH_REQUIRED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({ type: VersioningType.URI, prefix: "api/v", defaultVersion: '1' });

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Este arnés monta LO MISMO que `main.ts`. Antes montaba `helmet()` a secas y
    // un CORS con `origin: ['*'], credentials: true` — el contrario del
    // `credentials: false` que manda §6 —, así que las pruebas verdes de abajo no
    // decían nada sobre el servicio que se despliega.
    app.use(
      helmet({
        contentSecurityPolicy: { useDefaults: false, directives: { 'default-src': ["'none'"] } },
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
      }),
    );
    app.use(correlationIdMiddleware);

    app.enableCors({
      origin: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-api-key'],
      credentials: false,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ADR-0119 §5, comprobado por VALOR y no por existencia. `toBeDefined()` pasaba
  // con `default-src 'self'` y `SAMEORIGIN`, que son justo los valores que §5
  // prohíbe: una cabecera presente con el contenido equivocado es indistinguible
  // de una correcta para una aserción de existencia, y ese fue el hueco por el que
  // el servicio se desplegó dos versiones sin cumplir su propia norma.
  describe('Security Headers (ADR-0119 §5)', () => {
    it('sets Content-Security-Policy to default-src none', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    });

    it('sets X-Frame-Options to DENY, not SAMEORIGIN', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('sets X-Content-Type-Options to nosniff', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('sets Referrer-Policy to no-referrer', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });

    it('sets Strict-Transport-Security', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    });

    it('sets X-XSS-Protection to 0 (the auditor is disabled on purpose)', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-xss-protection']).toBe('0');
    });

    it('does not advertise credentials on CORS (ADR-0119 §6)', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });

    it('still sets X-DNS-Prefetch-Control', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    });
  });

  describe('Correlation ID', () => {
    it('should set x-correlation-id in response header', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should propagate provided x-correlation-id', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', 'test-corr-id-123');
      expect(res.headers['x-correlation-id']).toBe('test-corr-id-123');
    });

    it('should generate UUID x-correlation-id when not provided', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('DTO Validation', () => {
    it('should reject request with missing required field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject request with unknown properties', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({ satellitePath: '/test', injectedField: 'malicious' });
      expect(res.status).toBe(400);
    });
  });

  it('should return 200 for health endpoint', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 for GET /health', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
    });

    it('should return 422 for validation failure on domain error', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({ satellitePath: '' });
      expect(res.status).toBe(400);
    });
  });
});
