import 'reflect-metadata';
import { UpgradeCommand } from './upgrade.command';

const COMMAND_META_KEY = 'CommandBuilder:Command:Meta';

describe('UpgradeCommand', () => {
  let command: UpgradeCommand;
  beforeEach(() => { command = new UpgradeCommand(); });
  it('should be defined', () => { expect(command).toBeDefined(); });
  it('should have name upgrade', () => {
    const meta = Reflect.getMetadata(COMMAND_META_KEY, UpgradeCommand);
    expect(meta?.name).toBe('upgrade');
  });
});
