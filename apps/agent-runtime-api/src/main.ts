import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(helmet());

  // Lenient validation: the runtime's parseAgentRuntimeRequest is the source of
  // truth for the request contract (it accepts a dynamic `parameters` object),
  // so we only coerce types here and never strip unknown fields.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const rawOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin:
      nodeEnv === 'development'
        ? '*'
        : rawOrigins
          ? rawOrigins.split(',').map((s) => s.trim())
          : false,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`Evolith Agent Runtime API listening on :${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
