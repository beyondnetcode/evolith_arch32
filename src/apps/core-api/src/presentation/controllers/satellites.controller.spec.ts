import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SatellitesController } from './satellites.controller';
import { SatelliteRegistryService } from '../../application/services/satellite-registry.service';
import {
  CreateSatelliteDto,
  UpdateSatelliteDto,
  LinkSatelliteDto,
} from '../dtos/satellite.dto';

const sampleDto: CreateSatelliteDto = {
  id: 'sat_001',
  name: 'auth-service',
  parentCorePath: '/cores/auth',
};

describe('SatellitesController', () => {
  let controller: SatellitesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SatellitesController],
      providers: [SatelliteRegistryService],
    }).compile();

    controller = module.get<SatellitesController>(SatellitesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register (POST /satellites)', () => {
    it('should register a satellite and return a record with status "registered"', () => {
      const record = controller.register(sampleDto);

      expect(record.id).toBe('sat_001');
      expect(record.name).toBe('auth-service');
      expect(record.parentCorePath).toBe('/cores/auth');
      expect(record.status).toBe('registered');
      expect(record.registeredAt).toBeDefined();
    });
  });

  describe('findAll (GET /satellites)', () => {
    it('should return an empty list when no satellites are registered', () => {
      const records = controller.findAll();

      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(0);
    });

    it('should return all registered satellites', () => {
      controller.register(sampleDto);
      controller.register({ ...sampleDto, id: 'sat_002', name: 'billing-service' });

      const records = controller.findAll();

      expect(records).toHaveLength(2);
    });
  });

  describe('findOne (GET /satellites/:id)', () => {
    it('should return a satellite by id', () => {
      controller.register(sampleDto);

      const record = controller.findOne('sat_001');

      expect(record.id).toBe('sat_001');
      expect(record.name).toBe('auth-service');
    });

    it('should throw NotFoundException for an unknown id', () => {
      expect(() => controller.findOne('non-existent-id')).toThrow(NotFoundException);
    });
  });

  describe('update (PATCH /satellites/:id)', () => {
    it('should update the name of a satellite', () => {
      controller.register(sampleDto);

      const updateDto: UpdateSatelliteDto = { name: 'auth-service-v2' };
      const record = controller.update('sat_001', updateDto);

      expect(record.id).toBe('sat_001');
      expect(record.name).toBe('auth-service-v2');
      expect(record.status).toBe('registered');
    });

    it('should throw NotFoundException when updating an unknown id', () => {
      expect(() =>
        controller.update('ghost-id', { name: 'nope' }),
      ).toThrow(NotFoundException);
    });
  });

  describe('link (POST /satellites/:id/link)', () => {
    it('should link a satellite to a target and set status to "linked"', () => {
      controller.register(sampleDto);
      controller.register({ ...sampleDto, id: 'sat_core_001', name: 'core-auth' });

      const linkDto: LinkSatelliteDto = { targetSatelliteId: 'sat_core_001' };
      const record = controller.link('sat_001', linkDto);

      expect(record.id).toBe('sat_001');
      expect(record.status).toBe('linked');
      expect(record.linkedSatelliteId).toBe('sat_core_001');
      expect(record.linkedAt).toBeDefined();
    });

    it('should throw NotFoundException when the source satellite is unknown', () => {
      controller.register({ ...sampleDto, id: 'sat_core_001', name: 'core-auth' });

      expect(() =>
        controller.link('ghost-source', { targetSatelliteId: 'sat_core_001' }),
      ).toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the target satellite is unknown', () => {
      controller.register(sampleDto);

      expect(() =>
        controller.link('sat_001', { targetSatelliteId: 'ghost-target' }),
      ).toThrow(NotFoundException);
    });
  });
});
