import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { EnvConfig } from './infrastructure/config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService<EnvConfig>);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.use(helmet());

  app.enableCors({
    origin: config.get('ALLOWED_ORIGINS')?.split(',') ?? ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-api-key'],
    credentials: true,
  });

  app.flushLogs();

  app.enableShutdownHooks();

  await app.listen(config.get('PORT', 3000));
}
bootstrap().catch((err) => {
  console.error('Error starting application', err);
});
