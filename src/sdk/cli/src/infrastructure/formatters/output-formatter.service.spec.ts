import { OutputFormatterService } from './output-formatter.service';

describe('OutputFormatterService', () => {
  let formatter: OutputFormatterService;

  beforeEach(() => {
    formatter = new OutputFormatterService();
  });

  describe('format', () => {
    it('should format as JSON by default', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'json' });

      expect(result).toContain('"name": "test"');
      expect(result).toContain('"value": 42');
    });

    it('should format as table for array data', () => {
      const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
      const result = formatter.format(data, { format: 'table' });

      expect(result).toContain('Name');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    it('should format as yaml', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'yaml' });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format as markdown', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'markdown' });

      expect(typeof result).toBe('string');
    });
  });

  describe('formatJson', () => {
    it('should stringify data with 2-space indent', () => {
      const data = { a: 1, b: 'test' };
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toBe('{\n  "a": 1,\n  "b": "test"\n}');
    });

    it('should handle nested objects', () => {
      const data = { outer: { inner: 'value' } };
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toContain('"outer"');
      expect(result).toContain('"inner": "value"');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });
  });

  describe('formatYaml', () => {
    it('should convert simple object to yaml-like format', () => {
      const data = { name: 'test', count: 5 };
      const result = formatter.formatYaml(data, { format: 'yaml' });

      expect(result).toContain('name');
      expect(result).toContain('test');
      expect(result).toContain('count');
      expect(result).toContain('5');
    });

    it('should fallback to JSON on error', () => {
      const data = { name: 'test', count: 5 };
      const result = formatter.formatYaml(data, { format: 'yaml' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatMarkdown', () => {
    it('should convert array to markdown table', () => {
      const data = [{ name: 'Alice', role: 'Dev' }, { name: 'Bob', role: 'QA' }];
      const result = formatter.formatMarkdown(data, { format: 'markdown' });

      expect(result).toContain('|');
      expect(result).toContain('Name');
      expect(result).toContain('Alice');
    });

    it('should convert object to markdown', () => {
      const data = { title: 'Test', status: 'passed' };
      const result = formatter.formatMarkdown(data, { format: 'markdown' });

      expect(result).toContain('Title');
      expect(result).toContain('Test');
      expect(result).toContain('Status');
      expect(result).toContain('passed');
    });

    it('should handle primitive values', () => {
      const result = formatter.formatMarkdown('hello', { format: 'markdown' });

      expect(result).toBe('hello');
    });
  });

  describe('formatTable', () => {
    it('should format array as table', () => {
      const data = [{ id: 1, name: 'Item1' }, { id: 2, name: 'Item2' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('Id');
      expect(result).toContain('Name');
      expect(result).toContain('Item1');
    });

    it('should format object as key-value list', () => {
      const data = { key1: 'value1', key2: 'value2' };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('key1');
      expect(result).toContain('value1');
      expect(result).toContain('key2');
      expect(result).toContain('value2');
    });

    it('should return (empty) for empty array', () => {
      const result = formatter.formatTable([], { format: 'table' });

      expect(result).toBe('(empty)');
    });

    it('should return (empty) for empty object', () => {
      const result = formatter.formatTable({}, { format: 'table' });

      expect(result).toBe('(empty)');
    });

    it('should handle primitive values', () => {
      const result = formatter.formatTable(42, { format: 'table' });

      expect(result).toBe('42');
    });
  });

  describe('humanizeKey', () => {
    it('should convert camelCase to title case', () => {
      const data = [{ firstName: 'John', lastName: 'Doe' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('First Name');
      expect(result).toContain('Last Name');
    });

    it('should convert snake_case to title case', () => {
      const data = [{ first_name: 'John', last_name: 'Doe' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('First name');
      expect(result).toContain('Last name');
    });

    it('should handle kebab-case', () => {
      const data = [{ 'my-key': 'value' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('My-key');
    });
  });

  describe('formatValue', () => {
    it('should handle boolean values', () => {
      const data = { active: true, disabled: false };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null values', () => {
      const data = { value: null };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('(none)');
    });

    it('should handle undefined values', () => {
      const data = { value: undefined };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toBeDefined();
    });

    it('should handle arrays as values', () => {
      const data = { items: [1, 2, 3] };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('[3 items]');
    });

    // GT-457: `validate -f table` used to collapse a failed run's issues into an
    // opaque "[N items]" count, hiding the ruleId/title/description/remediation
    // that only `-f json` surfaced. The formatter must now render per-issue detail.
    describe('GT-457 issue-detail rendering', () => {
      it('renders ruleId, title, description, severity and remediation per issue', () => {
        const data = {
          status: 'failed',
          issues: [
            {
              ruleId: 'ACL-01',
              title: 'Anti-corruption layer missing',
              description: 'Domain imports an external DTO directly',
              severity: 'MUST',
              remediation: 'Introduce an ACL adapter for the external contract',
            },
          ],
        };

        const result = formatter.formatTable(data, { format: 'table' });

        // The opaque count is gone; each field is now visible in table output.
        expect(result).not.toContain('[1 items]');
        expect(result).toContain('1 issue(s):');
        expect(result).toContain('ACL-01');
        expect(result).toContain('Anti-corruption layer missing');
        expect(result).toContain('Domain imports an external DTO directly');
        expect(result).toContain('MUST');
        expect(result).toContain('Introduce an ACL adapter for the external contract');
      });

      it('does not duplicate description when it equals the title', () => {
        const data = {
          issues: [{ ruleId: 'GOV-1', title: 'same text', description: 'same text', severity: 'SHOULD' }],
        };

        const result = formatter.formatTable(data, { format: 'table' });
        const occurrences = result.split('same text').length - 1;

        expect(occurrences).toBe(1);
        expect(result).toContain('GOV-1');
      });

      it('still renders opaque count for non-issue arrays', () => {
        const data = { tags: ['a', 'b'] };
        const result = formatter.formatTable(data, { format: 'table' });

        expect(result).toContain('[2 items]');
      });
    });
  });

  // Este servicio es funcion pura -- sin I/O ni mocks -- y aun asi tenia 33 ramas
  // sin ejercitar: los casos degenerados (vacio, primitivos, null) y el
  // renderizado de arrays de issues que GT-457 anadio para que la salida en tabla
  // no escondiera los hallazgos tras un "[N items]".
  describe('casos degenerados y formatValue', () => {
    const svc = new OutputFormatterService();
    const O = (format: string) => ({ format }) as never;

    it('un formato desconocido cae a json en vez de romper', () => {
      expect(svc.format({ a: 1 }, O('inventado'))).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it.each(['table', 'markdown'])('%s sobre un array vacio dice (empty)', (fmt) => {
      expect(svc.format([], O(fmt))).toBe('(empty)');
    });

    it('table sobre un objeto vacio dice (empty)', () => {
      expect(svc.format({}, O('table'))).toBe('(empty)');
    });

    it.each(['table', 'markdown', 'yaml'])('%s sobre un primitivo lo convierte a texto', (fmt) => {
      expect(svc.format(42, O(fmt))).toContain('42');
    });

    it('table sobre un array de primitivos los lista uno por linea', () => {
      expect(svc.format(['uno', 'dos'], O('table'))).toBe('uno\ndos');
    });

    it('markdown sobre un array de primitivos usa vinetas', () => {
      expect(svc.format(['uno', 'dos'], O('markdown'))).toBe('- uno\n- dos');
    });

    it('table sobre un array de objetos rinde cabecera, separador y filas', () => {
      const out = svc.format([{ ruleId: 'A-1', ok: true }], O('table'));
      const lines = out.split('\n');
      expect(lines[0]).toMatch(/Rule Id/);
      expect(lines[1]).toMatch(/─/);
      expect(lines[2]).toMatch(/A-1/);
    });

    it('markdown sobre un array de objetos rinde una tabla markdown', () => {
      const out = svc.format([{ ruleId: 'A-1' }], O('markdown'));
      expect(out).toMatch(/^\| Rule Id \|/m);
      expect(out).toMatch(/^\| --- \|/m);
    });

    it('humaniza las claves camelCase y snake_case en la cabecera', () => {
      const out = svc.format([{ ruleId: 'x', phase_name: 'y' }], O('markdown'));
      expect(out).toMatch(/Rule Id/);
      expect(out).toMatch(/Phase name/);
    });

    it('null y undefined se rinden como (none), no como texto vacio', () => {
      const out = svc.format({ a: null, b: undefined }, O('table'));
      expect(out).toMatch(/\(none\)/);
    });

    it('los booleanos se rinden como marca y aspa', () => {
      const out = svc.format({ si: true, no: false }, O('table'));
      expect(out).toMatch(/✓/);
      expect(out).toMatch(/✗/);
    });

    it('un array corriente se resume por conteo', () => {
      expect(svc.format({ xs: [1, 2, 3] }, O('table'))).toMatch(/\[3 items\]/);
    });

    it('un array de ISSUES se detalla en vez de resumirse (GT-457)', () => {
      const out = svc.format(
        { issues: [{ ruleId: 'HXA-01', title: 'Capa cruzada', severity: 'MUST' }] },
        O('table'),
      );
      expect(out).toMatch(/1 issue\(s\)/);
      expect(out).toMatch(/HXA-01/);
      expect(out).toMatch(/Capa cruzada/);
      expect(out).toMatch(/MUST/);
      expect(out).not.toMatch(/\[1 items\]/);
    });

    it('la descripcion sale en su propia linea cuando aporta sobre el titulo', () => {
      const out = svc.format(
        { issues: [{ ruleId: 'A-1', title: 'Titulo', description: 'Detalle distinto' }] },
        O('table'),
      );
      expect(out).toMatch(/Titulo/);
      expect(out).toMatch(/Detalle distinto/);
    });

    it.each(['remediation', 'fix', 'hint'])('el hint de remediacion se muestra desde %s', (key) => {
      const out = svc.format(
        { issues: [{ ruleId: 'A-1', title: 'T', [key]: 'haz esto' }] },
        O('table'),
      );
      expect(out).toMatch(/fix:/);
      expect(out).toMatch(/haz esto/);
    });

    it('un objeto anidado no-issue se serializa como json inline', () => {
      expect(svc.format({ cfg: { a: 1 } }, O('table'))).toMatch(/\{"a":1\}/);
    });
  });
});
