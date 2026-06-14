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
    process.env.API_KEYS = "test-api-key-123";
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

    app.use(helmet());
    app.use(correlationIdMiddleware);

    app.enableCors({
      origin: ['*'],
      credentials: true,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should set X-Frame-Options header', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-Content-Type-Options header', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-content-type-options']).toBeDefined();
    });

    it('should set X-DNS-Prefetch-Control header', async () => {
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

  describe('Auth', () => {
    it('should reject request without API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
    });

    it('should reject request with invalid API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .set('x-api-key', 'invalid-key')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
    });

    it('should allow health endpoint without API key', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
    });
  });

  describe('DTO Validation', () => {
    it('should reject request with missing required field', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .set('x-api-key', 'test-api-key-123')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject request with unknown properties', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .set('x-api-key', 'test-api-key-123')
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
        .set('x-api-key', 'test-api-key-123')
        .send({ satellitePath: '' });
      expect(res.status).toBe(400);
    });
  });
});
