import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ReferenceController } from './reference.controller';
import { CoreReferenceQueryService } from '../../application/services/core-reference-query.service';

describe('ReferenceController', () => {
  let controller: ReferenceController;
  let queries: jest.Mocked<Pick<CoreReferenceQueryService, 'listRulesets' | 'getRuleset' | 'getGate' | 'getPhaseRequirements'>>;

  beforeEach(async () => {
    queries = {
      listRulesets: jest.fn(),
      getRuleset: jest.fn(),
      getGate: jest.fn(),
      getPhaseRequirements: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferenceController],
      providers: [
        { provide: CoreReferenceQueryService, useValue: queries },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('/core') } },
      ],
    }).compile();
    controller = module.get(ReferenceController);
  });

  it('lists rulesets from the configured Core corpus', async () => {
    queries.listRulesets.mockResolvedValue([{ id: 'sdlc/phase-gates', title: 'Phase gates', description: '' }]);

    await expect(controller.listRulesets()).resolves.toEqual([
      { id: 'sdlc/phase-gates', title: 'Phase gates', description: '' },
    ]);
    expect(queries.listRulesets).toHaveBeenCalledWith('/core');
  });

  it('returns a ruleset by canonical identifier', async () => {
    queries.getRuleset.mockResolvedValue({ $id: 'sdlc/phase-gates' });

    await expect(controller.getRuleset('sdlc/phase-gates')).resolves.toEqual({ $id: 'sdlc/phase-gates' });
    expect(queries.getRuleset).toHaveBeenCalledWith('/core', 'sdlc/phase-gates');
  });

  it('returns 404 when the ruleset does not exist', async () => {
    queries.getRuleset.mockResolvedValue(undefined);

    await expect(controller.getRuleset('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns gate and phase requirements from the configured Core corpus', async () => {
    queries.getGate.mockResolvedValue({ phase: 1 } as any);
    queries.getPhaseRequirements.mockResolvedValue({ phase: 1 } as any);

    await expect(controller.getGate('PG1')).resolves.toEqual({ phase: 1 });
    await expect(controller.getPhaseRequirements('1')).resolves.toEqual({ phase: 1 });
    expect(queries.getGate).toHaveBeenCalledWith('/core', 'PG1');
    expect(queries.getPhaseRequirements).toHaveBeenCalledWith('/core', '1');
  });
});
