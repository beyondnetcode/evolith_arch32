import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';
import request from 'supertest';
import helmet from 'helmet';

describe('Security Headers (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(helmet());

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

  it('should return 200 for health endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });
});
