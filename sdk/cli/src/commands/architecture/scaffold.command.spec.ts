import { ScaffoldCommand } from './scaffold.command';
import * as p from '@clack/prompts';
import { NxWorkspaceStrategy } from '../../core/architecture/nx-workspace.strategy';

jest.mock('@clack/prompts');
jest.mock('../../core/architecture/nx-workspace.strategy');

const mockStrategy = {
  installDependencies: jest.fn().mockResolvedValue(undefined),
  generateApiApp: jest.fn().mockResolvedValue(undefined),
  generateStandardWebApp: jest.fn().mockResolvedValue(undefined),
  generateHostApp: jest.fn().mockResolvedValue(undefined),
  generateLibrary: jest.fn().mockResolvedValue(undefined),
};

const mockSelect = p.select as jest.Mock;
const mockText = p.text as jest.Mock;
const mockMultiselect = p.multiselect as jest.Mock;
const mockSpinner = p.spinner as jest.Mock;
const mockIntro = p.intro as jest.Mock;
const mockOutro = p.outro as jest.Mock;

const mockSpinnerInstance = {
  start: jest.fn(),
  message: jest.fn(),
  stop: jest.fn(),
};

describe('ScaffoldCommand', () => {
  let command: ScaffoldCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    (NxWorkspaceStrategy as jest.Mock).mockImplementation(() => mockStrategy);
    mockSpinner.mockReturnValue(mockSpinnerInstance);
    command = new ScaffoldCommand();
  });

  describe('run', () => {
    it('should scaffold phase 1 architecture with react and prisma', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('tracker-api')
        .mockResolvedValueOnce('tracker-web');
      mockMultiselect.mockResolvedValue(['discovery', 'design']);

      await command.run([], {});

      expect(mockIntro).toHaveBeenCalled();
      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('react', 'prisma');
      expect(mockStrategy.generateApiApp).toHaveBeenCalledWith('tracker-api');
      expect(mockStrategy.generateStandardWebApp).toHaveBeenCalledWith('tracker-web', 'react');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('workflow-engine', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('integration-fabric', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('tenant-config', 'shell');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('discovery', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('design', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('db-schema', 'shared');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('mocks', 'shared');
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Andamiaje arquitectónico completado exitosamente.');
      expect(mockOutro).toHaveBeenCalled();
    });

    it('should scaffold phase 3 architecture with angular and typeorm', async () => {
      mockSelect
        .mockResolvedValueOnce('angular')
        .mockResolvedValueOnce('typeorm')
        .mockResolvedValueOnce('3');
      mockText
        .mockResolvedValueOnce('my-api')
        .mockResolvedValueOnce('my-host')
        .mockResolvedValueOnce('remote1, remote2');
      mockMultiselect.mockResolvedValue(['qa', 'release']);

      await command.run([], {});

      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('angular', 'typeorm');
      expect(mockStrategy.generateApiApp).toHaveBeenCalledWith('my-api');
      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith('my-host', ['remote1', 'remote2'], 'angular');
      expect(mockStrategy.generateStandardWebApp).not.toHaveBeenCalled();
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('qa', 'domain');
      expect(mockStrategy.generateLibrary).toHaveBeenCalledWith('release', 'domain');
    });

    it('should use provided options instead of prompting', async () => {
      mockSelect.mockResolvedValueOnce('2');
      mockText
        .mockResolvedValueOnce('opt-api')
        .mockResolvedValueOnce('opt-host')
        .mockResolvedValueOnce('remoteA');
      mockMultiselect.mockResolvedValue(['construction']);

      await command.run([], { frontend: 'react', orm: 'prisma' });

      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockStrategy.installDependencies).toHaveBeenCalledWith('react', 'prisma');
    });

    it('should handle phase 2 with host app and remotes', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('2');
      mockText
        .mockResolvedValueOnce('api-v2')
        .mockResolvedValueOnce('host-app')
        .mockResolvedValueOnce('remote-x, remote-y, remote-z');
      mockMultiselect.mockResolvedValue(['design', 'construction', 'qa']);

      await command.run([], {});

      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith(
        'host-app',
        ['remote-x', 'remote-y', 'remote-z'],
        'react',
      );
      expect(mockStrategy.generateStandardWebApp).not.toHaveBeenCalled();
    });

    it('should handle error during scaffolding', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('error-api')
        .mockResolvedValueOnce('error-web');
      mockMultiselect.mockResolvedValue(['discovery']);
      mockStrategy.installDependencies.mockRejectedValueOnce(new Error('Install failed'));

      await expect(command.run([], {})).rejects.toThrow('Install failed');

      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith('Command failed.');
      expect(mockOutro).toHaveBeenCalled();
    });

    it('should filter empty remote names', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('3');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('host')
        .mockResolvedValueOnce(', remote1, , remote2, ');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      expect(mockStrategy.generateHostApp).toHaveBeenCalledWith(
        'host',
        ['remote1', 'remote2'],
        'react',
      );
    });

    it('should generate all shell libraries', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('web');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      const shellCalls = mockStrategy.generateLibrary.mock.calls.filter(
        (call: string[]) => call[1] === 'shell',
      );
      expect(shellCalls).toHaveLength(3);
      expect(shellCalls.map((c: string[]) => c[0])).toContain('workflow-engine');
      expect(shellCalls.map((c: string[]) => c[0])).toContain('integration-fabric');
      expect(shellCalls.map((c: string[]) => c[0])).toContain('tenant-config');
    });

    it('should generate shared libraries', async () => {
      mockSelect
        .mockResolvedValueOnce('react')
        .mockResolvedValueOnce('prisma')
        .mockResolvedValueOnce('1');
      mockText
        .mockResolvedValueOnce('api')
        .mockResolvedValueOnce('web');
      mockMultiselect.mockResolvedValue(['discovery']);

      await command.run([], {});

      const sharedCalls = mockStrategy.generateLibrary.mock.calls.filter(
        (call: string[]) => call[1] === 'shared',
      );
      expect(sharedCalls).toHaveLength(2);
      expect(sharedCalls.map((c: string[]) => c[0])).toContain('db-schema');
      expect(sharedCalls.map((c: string[]) => c[0])).toContain('mocks');
    });
  });

  describe('parseFrontend', () => {
    it('should return the provided value', () => {
      expect(command.parseFrontend('react')).toBe('react');
      expect(command.parseFrontend('angular')).toBe('angular');
    });
  });

  describe('parseOrm', () => {
    it('should return the provided value', () => {
      expect(command.parseOrm('prisma')).toBe('prisma');
      expect(command.parseOrm('typeorm')).toBe('typeorm');
    });
  });
});
