import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().optional(),
  CORE_PATH: z.string().default(process.cwd()),
  WORKSPACE_ROOT: z.string().default('/tmp/evolith-workspaces'),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  SWAGGER_ENABLED: z.string().optional(),
  // API-key auth (ApiKeyGuard). When set, all non-public routes require this key
  // via `Authorization: Bearer` or `x-api-key`. When unset, the API is open
  // (migration-safe) unless CORE_API_AUTH_REQUIRED=true forces fail-closed.
  EVOLITH_API_KEY: z.string().optional(),
  CORE_API_AUTH_REQUIRED: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
