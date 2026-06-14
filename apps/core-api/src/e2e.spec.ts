import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import request from 'supertest';
import helmet from 'helmet';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';

process.env.API_KEYS = 'test-api-key-123';

const API_KEY = 'test-api-key-123';

describe('Core API E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
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

  describe('Flow 2: Security Headers', () => {
    it('should include security headers', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('Flow 3: Correlation ID', () => {
    it('should propagate correlation ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', 'e2e-test');
      expect(res.headers['x-correlation-id']).toBe('e2e-test');
    });
  });

  describe('Flow 4: Authentication Required', () => {
    it('should return 401 without API key on protected endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .set('x-api-key', 'wrong-key')
        .send({ satellitePath: '/test' });
      expect(res.status).toBe(401);
    });
  });

  describe('Flow 5: Validated Requests', () => {
    it('should reject empty body with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .set('x-api-key', API_KEY)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject unknown properties with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .set('x-api-key', API_KEY)
        .send({ satellitePath: '/test', badField: true });
      expect(res.status).toBe(400);
    });
  });
});
