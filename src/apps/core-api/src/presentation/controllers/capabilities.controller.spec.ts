import { Test, TestingModule } from '@nestjs/testing';
import {
  buildCapabilityManifest,
  capabilityManifestFingerprint,
} from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';
import { CapabilitiesController } from './capabilities.controller';

describe('CapabilitiesController', () => {
  let controller: CapabilitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapabilitiesController],
    }).compile();
    controller = module.get(CapabilitiesController);
  });

  it('returns the domain capability manifest', () => {
    expect(controller.getCapabilities()).toEqual(buildCapabilityManifest());
  });

  it('emits a manifest whose sha256 matches its own fingerprint', () => {
    const manifest = controller.getCapabilities();
    expect(manifest.name).toBe('evolith-core');
    expect(manifest.sha256).toBe(capabilityManifestFingerprint(manifest));
  });
});
