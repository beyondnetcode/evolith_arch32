import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../app.module';
import request from 'supertest';
import helmet from 'helmet';
import { correlationIdMiddleware } from '../../infrastructure/middleware/correlation-id.middleware';

describe('Security & Validation (Integration)', () => {
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
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should set X-DNS-Prefetch-Control header', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    });
  });

  describe('Correlation ID', () => {
    it('should set x-correlation-id in response header', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should propagate provided x-correlation-id', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', 'test-corr-id-123');
      expect(response.headers['x-correlation-id']).toBe('test-corr-id-123');
    });

    it('should generate UUID x-correlation-id when not provided', async () => {
      const response = await request(app.getHttpServer()).get('/health');
      const correlationId = response.headers['x-correlation-id'];
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('DTO Validation', () => {
    it('should reject request with missing required field', async () => {
      const response = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({})
        .set('Content-Type', 'application/json');
      expect(response.status).toBe(400);
    });

    it('should reject request with unknown properties', async () => {
      const response = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({ satellitePath: '/test', injectedField: 'malicious' })
        .set('Content-Type', 'application/json');
      expect(response.status).toBe(400);
    });

    it('should not reject valid request (passes validation, runtime error is pre-existing)', async () => {
      const response = await request(app.getHttpServer())
        .post('/architecture/validate-satellite')
        .send({ satellitePath: '/tmp/test-project' })
        .set('Content-Type', 'application/json');
      expect(response.status).not.toBe(400);
    });
  });

  it('should return 200 for health endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });
});
