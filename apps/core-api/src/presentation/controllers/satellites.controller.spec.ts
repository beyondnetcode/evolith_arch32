import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SatellitesController } from './satellites.controller';
import { SatelliteRegistryService } from '../../application/services/satellite-registry.service';
import {
  RegisterSatelliteDto,
  UpdateSatelliteDto,
  SatelliteTopology,
  SatellitePhase,
  SatelliteMode,
  SatelliteStatus,
} from '../dtos/satellite.dto';

const sampleDto: RegisterSatelliteDto = {
  name: 'auth-service',
  owner: 'platform-team',
  repoUrl: 'https://github.com/acme/auth-service',
  cloneUrl: 'https://github.com/acme/auth-service.git',
  sshUrl: 'git@github.com:acme/auth-service.git',
  topology: SatelliteTopology.ModularMonolith,
  phase: SatellitePhase.F1,
  mode: SatelliteMode.Active,
};

describe('SatellitesController', () => {
  let controller: SatellitesController;
  let service: SatelliteRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SatellitesController],
      providers: [SatelliteRegistryService],
    }).compile();

    controller = module.get<SatellitesController>(SatellitesController);
    service = module.get<SatelliteRegistryService>(SatelliteRegistryService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register (POST /satellites)', () => {
    it('should create a satellite and return an ADR-0073 envelope', () => {
      const response = controller.register(sampleDto);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe('auth-service');
      expect(response.data.status).toBe(SatelliteStatus.Active);
      expect(response.meta.requestId).toBeDefined();
      expect(response.meta.version).toBe('1');
    });
  });

  describe('findAll (GET /satellites)', () => {
    it('should return an empty list when no satellites are registered', () => {
      const response = controller.findAll();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(0);
    });

    it('should return all registered satellites', () => {
      controller.register(sampleDto);
      controller.register({ ...sampleDto, name: 'billing-service' });

      const response = controller.findAll();

      expect(response.data).toHaveLength(2);
    });
  });

  describe('findOne (GET /satellites/:id)', () => {
    it('should return a satellite by id', () => {
      const created = controller.register(sampleDto);
      const id = created.data.id;

      const response = controller.findOne(id);

      expect(response.success).toBe(true);
      expect(response.data.id).toBe(id);
      expect(response.data.name).toBe('auth-service');
    });

    it('should throw NotFoundException for an unknown id', () => {
      expect(() => controller.findOne('non-existent-uuid')).toThrow(NotFoundException);
    });
  });

  describe('update (PATCH /satellites/:id)', () => {
    it('should update the status of a satellite', () => {
      const created = controller.register(sampleDto);
      const id = created.data.id;

      const updateDto: UpdateSatelliteDto = { status: SatelliteStatus.Inactive };
      const response = controller.update(id, updateDto);

      expect(response.success).toBe(true);
      expect(response.data.status).toBe(SatelliteStatus.Inactive);
    });

    it('should throw NotFoundException when updating an unknown id', () => {
      expect(() =>
        controller.update('ghost-id', { status: SatelliteStatus.Inactive }),
      ).toThrow(NotFoundException);
    });
  });

  describe('remove (DELETE /satellites/:id)', () => {
    it('should soft-delete a satellite by setting status to archived', () => {
      const created = controller.register(sampleDto);
      const id = created.data.id;

      const response = controller.remove(id);

      expect(response.success).toBe(true);
      expect(response.data.status).toBe(SatelliteStatus.Archived);

      // Satellite still retrievable but marked archived
      const fetched = controller.findOne(id);
      expect(fetched.data.status).toBe(SatelliteStatus.Archived);
    });

    it('should throw NotFoundException when deleting an unknown id', () => {
      expect(() => controller.remove('ghost-id')).toThrow(NotFoundException);
    });
  });
});
