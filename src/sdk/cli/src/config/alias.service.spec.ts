import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AliasService } from './alias.service';

describe('AliasService', () => {
  let service: AliasService;
  let evolithDir: string;

  beforeEach(() => {
    evolithDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-alias-test-'));
    const _home = process.env.HOME;
    process.env.HOME = evolithDir;
    service = new AliasService();
  });

  afterEach(() => {
    fs.rmSync(evolithDir, { recursive: true, force: true });
  });

  it('starts with empty aliases', () => {
    const all = service.getAll();
    expect(all).toEqual({});
  });

  it('adds and retrieves an alias', () => {
    service.add('myalias', 'validate --path .');
    const all = service.getAll();
    expect(all['myalias']).toBe('validate --path .');
  });

  it('persists aliases to disk', () => {
    service.add('m', 'metrics');
    const aliasesPath = path.join(evolithDir, '.evolith', 'aliases.json');
    const saved = JSON.parse(fs.readFileSync(aliasesPath, 'utf-8'));
    expect(saved).toEqual({ m: 'metrics' });
  });

  it('resolves alias to command', () => {
    service.add('v', 'validate --path .');
    expect(service.resolve('v')).toBe('validate --path .');
  });

  it('returns original string for unknown alias', () => {
    expect(service.resolve('unknown')).toBe('unknown');
  });

  it('throws when adding duplicate alias', () => {
    service.add('dup', 'validate');
    expect(() => service.add('dup', 'metrics')).toThrow('already exists');
  });

  it('removes an alias', () => {
    service.add('tmp', 'validate');
    service.remove('tmp');
    expect(service.getAll()).toEqual({});
  });

  it('throws when removing non-existent alias', () => {
    expect(() => service.remove('nonexistent')).toThrow('not found');
  });

  it('loads saved aliases on construction', () => {
    service.add('saved', 'test-command');
    const service2 = new AliasService();
    expect(service2.getAll()).toEqual({ saved: 'test-command' });
  });
});
