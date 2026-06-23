import { YamlConfigParserProvider, YamlConfigParserImpl, JsonConfigParserProvider, JsonConfigParserImpl } from './config-parser.provider';

describe('YamlConfigParser', () => {
  let parser: YamlConfigParserImpl;

  beforeEach(() => {
    parser = new YamlConfigParserImpl();
  });

  it('parses YAML string', () => {
    const result = parser.parse('key: value\nnested:\n  inner: 42');
    expect(result).toEqual({ key: 'value', nested: { inner: 42 } });
  });

  it('stringifies object to YAML', () => {
    const result = parser.stringify({ a: 1, b: [2, 3] });
    expect(result).toContain('a: 1');
    expect(result).toContain('b:');
  });

  it('round-trips parse and stringify', () => {
    const input = { name: 'test', count: 5, tags: ['a', 'b'] };
    const yamlStr = parser.stringify(input);
    const result = parser.parse(yamlStr);
    expect(result).toEqual(input);
  });
});

describe('YamlConfigParserProvider', () => {
  it('creates YamlConfigParserImpl', () => {
    const provider = new YamlConfigParserProvider();
    const parser = provider.createConfigParser('yaml');
    expect(parser).toBeInstanceOf(YamlConfigParserImpl);
  });
});

describe('JsonConfigParser', () => {
  let parser: JsonConfigParserImpl;

  beforeEach(() => {
    parser = new JsonConfigParserImpl();
  });

  it('parses JSON string', () => {
    const result = parser.parse('{"key": "value", "nested": {"inner": 42}}');
    expect(result).toEqual({ key: 'value', nested: { inner: 42 } });
  });

  it('stringifies object to pretty-printed JSON', () => {
    const result = parser.stringify({ a: 1, b: [2, 3] });
    expect(result).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it('round-trips parse and stringify', () => {
    const input = { name: 'test', count: 5, tags: ['a', 'b'] };
    const jsonStr = parser.stringify(input);
    const result = parser.parse(jsonStr);
    expect(result).toEqual(input);
  });

  it('throws on invalid JSON', () => {
    expect(() => parser.parse('not-json')).toThrow();
  });
});

describe('JsonConfigParserProvider', () => {
  it('creates JsonConfigParserImpl', () => {
    const provider = new JsonConfigParserProvider();
    const parser = provider.createConfigParser('json');
    expect(parser).toBeInstanceOf(JsonConfigParserImpl);
  });
});
