import { z } from 'zod';

export const SatelliteManifestSchema = z.object({
  satellitePath: z.string().min(1, 'satellitePath is required'),
  corePath: z.string().optional(),
  topology: z.string().optional(),
  phase: z.string().optional(),
});

export type SatelliteManifestDto = z.infer<typeof SatelliteManifestSchema>;
