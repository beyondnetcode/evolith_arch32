import "./tracing";
import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(helmet());

  // Lenient validation: the runtime's parseAgentRuntimeRequest is the source of
  // truth for the request contract (it accepts a dynamic `parameters` object),
  // so we only coerce types here and never strip unknown fields.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Rate limiting: configurable via env vars with sensible defaults (MEDIUM finding).
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
  const RATE_MAX = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
  app.use((req: any, res: any, next: any) => {
    const ip = req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      entry.count++;
      if (entry.count > RATE_MAX) {
        const retryAfter = Math.ceil(RATE_WINDOW_MS / 1000);
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) });
        res.end(JSON.stringify({ error: 'Too many requests', retryAfter }));
        return;
      }
    }
    next();
  });

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const rawOrigins = process.env.CORS_ORIGINS;
  app.enableCors({
    origin:
      nodeEnv === "development"
        ? "*"
        : rawOrigins
          ? rawOrigins.split(",").map((s) => s.trim())
          : false,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");

  Logger.log(`Evolith Agent Runtime API listening on :${port}`, "Bootstrap");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error", err);
  process.exit(1);
});
