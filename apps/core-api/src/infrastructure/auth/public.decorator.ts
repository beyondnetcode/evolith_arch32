import { SetMetadata } from '@nestjs/common';

/** Metadata key marking a route/controller as reachable without an API key. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as public (no API key required). Used for the
 * health/readiness probes, which orchestrators (k8s/Coolify/Traefik) must reach
 * unauthenticated.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
