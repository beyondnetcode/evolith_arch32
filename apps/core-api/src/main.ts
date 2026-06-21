import './tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { EnvConfig } from './infrastructure/config/env.validation';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { DeprecationInterceptor } from './infrastructure/interceptors/deprecation.interceptor';
import { EnvelopeInterceptor } from './infrastructure/interceptors/envelope.interceptor';
import { SecurityAuditInterceptor } from './infrastructure/interceptors/security-audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  const config = app.get(ConfigService<EnvConfig>);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Evolith Core API')
    .setDescription('Core API for gate evaluation, phase transitions, project initialization, and architecture drift detection')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(
    new SecurityAuditInterceptor(),
    new DeprecationInterceptor(),
    new EnvelopeInterceptor(),
  );

  app.use(helmet());

  app.enableCors({
    origin: config.get('ALLOWED_ORIGINS')?.split(',') ?? ['*'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-correlation-id'],
    credentials: true,
  });

  app.flushLogs();

  app.enableShutdownHooks();

  await app.listen(config.get('PORT', 3000));
}
bootstrap().catch((err) => {
  console.error('Error starting application', err);
});
