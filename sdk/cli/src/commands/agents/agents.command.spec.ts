import 'reflect-metadata';
import { AgentsCommand } from './agents.command';

const COMMAND_META_KEY = 'CommandBuilder:Command:Meta';

describe('AgentsCommand', () => {
  let command: AgentsCommand;
  beforeEach(() => { command = new AgentsCommand(); });
  it('should be defined', () => { expect(command).toBeDefined(); });
  it('should have name agents', () => {
    const meta = Reflect.getMetadata(COMMAND_META_KEY, AgentsCommand);
    expect(meta?.name).toBe('agents');
  });
});
