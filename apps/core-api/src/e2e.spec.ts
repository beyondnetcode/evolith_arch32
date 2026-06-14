import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import request from 'supertest';
import helmet from 'helmet';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';

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

  describe('Flow 1: Health Check', () => {
    it('should return service health status', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.service).toContain('Evolith');
    });
  });

  describe('Flow 2: Security Headers', () => {
    it('should include security headers in response', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBeDefined();
    });
  });

  describe('Flow 3: Correlation ID Propagation', () => {
    it('should propagate custom correlation ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', 'e2e-test-id');
      expect(res.headers['x-correlation-id']).toBe('e2e-test-id');
    });

    it('should generate correlation ID when not provided', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]+$/);
    });
  });

  describe('Flow 4: Input Validation', () => {
    it('should reject empty body on POST endpoint', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject unknown properties', async () => {
      const res = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({ satellitePath: '/test', hackedField: true });
      expect(res.status).toBe(400);
    });
  });

  describe('Flow 5: Rate Limiting', () => {
    it('should accept requests within rate limit', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
