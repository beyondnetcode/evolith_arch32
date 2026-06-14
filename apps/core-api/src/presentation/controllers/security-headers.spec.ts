import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';
import request from 'supertest';
import helmet from 'helmet';
import { CorrelationIdMiddleware, correlationIdMiddleware } from '../../infrastructure/middleware/correlation-id.middleware';

describe('Security & Logging (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

  it('should generate new x-correlation-id when not provided', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    const correlationId = response.headers['x-correlation-id'];
    expect(correlationId).toBeDefined();
    expect(correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should return 200 for health endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });
});
