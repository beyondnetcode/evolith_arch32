import {
  YamlConfigParserProvider,
  YamlConfigParserImpl,
  JsonConfigParserProvider,
  JsonConfigParserImpl,
} from './config-parser.provider';

describe('YamlConfigParserProvider', () => {
  it('createConfigParser returns a YAML parser regardless of the format hint', () => {
    const parser = new YamlConfigParserProvider().createConfigParser('yaml');
    expect(parser).toBeInstanceOf(YamlConfigParserImpl);
  });

  it('round-trips an object through stringify/parse', () => {
    const parser = new YamlConfigParserImpl();
    const data = { name: 'evolith', nested: { count: 2, flags: ['a', 'b'] } };
    const text = parser.stringify(data);
    expect(typeof text).toBe('string');
    expect(parser.parse(text)).toEqual(data);
  });

  it('parses YAML content into a JS value', () => {
    const parser = new YamlConfigParserImpl();
    expect(parser.parse('a: 1\nb:\n  - x\n  - y\n')).toEqual({ a: 1, b: ['x', 'y'] });
  });
});

describe('JsonConfigParserProvider', () => {
  it('createConfigParser returns a JSON parser', () => {
    const parser = new JsonConfigParserProvider().createConfigParser('json');
    expect(parser).toBeInstanceOf(JsonConfigParserImpl);
  });

  it('parse reads JSON text', () => {
    const parser = new JsonConfigParserImpl();
    expect(parser.parse('{"x":1,"y":[2,3]}')).toEqual({ x: 1, y: [2, 3] });
  });

  it('stringify pretty-prints with 2-space indentation', () => {
    const parser = new JsonConfigParserImpl();
    const out = parser.stringify({ a: 1 });
    expect(out).toBe('{\n  "a": 1\n}');
  });

  it('parse throws on malformed JSON', () => {
    const parser = new JsonConfigParserImpl();
    expect(() => parser.parse('{not json')).toThrow();
  });
});
