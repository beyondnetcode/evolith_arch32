import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import helmet from 'helmet';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';

process.env.API_KEYS = 'test-api-key-123';

const API_KEY = 'test-api-key-123';

describe('Core API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
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

    app.useGlobalFilters(new HttpExceptionFilter());

    app.use(helmet());
    app.use(correlationIdMiddleware);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flow 1: Health Check (Public)', () => {
    it('should return service health status without auth', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('Flow 2: RFC 9457 Problem Details', () => {
    it('should return application/problem+json on 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('status', 401);
      expect(res.body).toHaveProperty('detail');
      expect(res.body).toHaveProperty('instance');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('should return application/problem+json on 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .set('x-api-key', API_KEY)
        .send({});
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toHaveProperty('status', 400);
    });
  });

  describe('Flow 3: Authentication Required', () => {
    it('should return 401 without API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
    });
  });

  describe('Flow 4: Validated Requests', () => {
    it('should reject empty body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/architecture/validate-satellite')
        .set('x-api-key', API_KEY)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
