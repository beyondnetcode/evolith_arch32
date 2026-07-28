/**
 * GT-580 criterion 2 — stdout carries data only; every diagnostic goes to stderr.
 *
 * Unit half: the classification and the stream patch. The end-to-end half lives
 * in `machine-channel.subprocess.spec.ts`, which pipes a real CLI process and
 * parses what comes out.
 */
import { PassThrough } from 'node:stream';
import {
  MACHINE_FORMATS,
  detectMachineFormat,
  installMachineChannelGuard,
  isMachineData,
  isMachineFormat,
} from './machine-channel';

describe('GT-580 · machine channel', () => {
  describe('detectMachineFormat', () => {
    it.each([
      [['node', 'cli', 'validate', '--format', 'json'], 'json'],
      [['node', 'cli', 'validate', '--format=json'], 'json'],
      [['node', 'cli', 'validate', '-f', 'json'], 'json'],
      [['node', 'cli', 'validate', '-f=json'], 'json'],
    ])('reads %j as %s', (argv, expected) => {
      expect(detectMachineFormat(argv as string[])).toBe(expected);
    });

    it.each([
      ['no format at all', ['node', 'cli', 'validate']],
      ['an explicitly human format', ['node', 'cli', 'validate', '--format', 'table']],
      ['a dangling flag', ['node', 'cli', 'validate', '--format']],
    ])('does not arm on %s', (_label, argv) => {
      expect(detectMachineFormat(argv as string[])).toBeUndefined();
    });

    it('leaves ndjson unarmed until a command can emit one', () => {
      // Deliberate: arming for a format nothing produces would replace prose on
      // stdout (wrong, but visible) with silence (wrong and invisible).
      expect(isMachineFormat('ndjson')).toBe(false);
      expect(MACHINE_FORMATS).toEqual(['json']);
    });
  });

  describe('isMachineData', () => {
    it('accepts a whole JSON document, pretty-printed or not', () => {
      expect(isMachineData('{"success":true}\n', 'json')).toBe(true);
      expect(isMachineData(`${JSON.stringify({ a: [1, 2] }, null, 2)}\n`, 'json')).toBe(true);
      expect(isMachineData('[{"id":1}]', 'json')).toBe(true);
    });

    it.each([
      ['@clack progress prose', '│\n●  [DRY-RUN] Would execute in /x: dotnet new sln -n P\n'],
      ['a spinner frame', '◐ Installing plugins...'],
      ['a truncated document', '{"success":tr'],
      ['a bare scalar that JSON.parse would happily accept', '3\n'],
      ['a quoted string that JSON.parse would happily accept', '"advertencia"\n'],
      ['an empty write', ''],
    ])('rejects %s', (_label, chunk) => {
      expect(isMachineData(chunk, 'json')).toBe(false);
    });

    it('classifies ndjson line by line', () => {
      expect(isMachineData('{"e":"start"}\n{"e":"finding"}\n', 'ndjson')).toBe(true);
      expect(isMachineData('{"e":"start"}\nInstalling...\n', 'ndjson')).toBe(false);
    });
  });

  describe('installMachineChannelGuard', () => {
    const streams = () => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      const out: string[] = [];
      const err: string[] = [];
      stdout.on('data', (c) => out.push(String(c)));
      stderr.on('data', (c) => err.push(String(c)));
      return {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stderr: stderr as unknown as NodeJS.WriteStream,
        out,
        err,
      };
    };

    it('reroutes a diagnostic and lets the envelope through, in order', () => {
      const s = streams();
      const restore = installMachineChannelGuard(['node', 'cli', '--format', 'json'], s);
      expect(restore).toBeDefined();

      s.stdout.write('●  [DRY-RUN] Would execute in /x: dotnet new sln\n');
      s.stdout.write('{"success":true,"data":{}}\n');

      expect(s.out.join('')).toBe('{"success":true,"data":{}}\n');
      expect(s.err.join('')).toContain('[DRY-RUN]');
      restore?.();
    });

    it('reroutes a Buffer write too — a leak does not have to be a string', () => {
      const s = streams();
      const restore = installMachineChannelGuard(['node', 'cli', '--format', 'json'], s);

      s.stdout.write(Buffer.from('warming up\n', 'utf8'));

      expect(s.out.join('')).toBe('');
      expect(s.err.join('')).toBe('warming up\n');
      restore?.();
    });

    it('does nothing at all in human mode — prose on stdout is the point there', () => {
      const s = streams();
      const restore = installMachineChannelGuard(['node', 'cli', 'validate'], s);

      expect(restore).toBeUndefined();
      s.stdout.write('✓ Satélite inicializado\n');
      expect(s.out.join('')).toBe('✓ Satélite inicializado\n');
      expect(s.err.join('')).toBe('');
    });

    it('restores the original write, so the patch is not permanent', () => {
      const s = streams();
      const original = s.stdout.write;
      const restore = installMachineChannelGuard(['node', 'cli', '--format', 'json'], s);
      expect(s.stdout.write).not.toBe(original);
      restore?.();
      expect(s.stdout.write).toBe(original);
    });
  });
});
