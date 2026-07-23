import {
  extractMermaidBlocks,
  parseClassDiagram,
  parseDddModel,
} from './mermaid-class-parser';

describe('mermaid-class-parser', () => {
  describe('extractMermaidBlocks', () => {
    it('extracts mermaid blocks from markdown', () => {
      const md = `# Title\n\n\`\`\`mermaid\nclassDiagram\n  class Foo\n\`\`\`\n\nSome text\n\n\`\`\`mermaid\nclassDiagram\n  class Bar\n\`\`\``;
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(2);
    });

    it('returns empty array when no mermaid blocks', () => {
      const md = '# Title\n\nNo mermaid here.';
      expect(extractMermaidBlocks(md)).toEqual([]);
    });

    it('handles empty markdown', () => {
      expect(extractMermaidBlocks('')).toEqual([]);
    });
  });

  describe('parseClassDiagram', () => {
    it('returns null for non-classDiagram blocks', () => {
      expect(parseClassDiagram('sequenceDiagram\n  A -> B')).toBeNull();
    });

    it('parses a simple class', () => {
      const block = `classDiagram
  class User {
    <<Entity>>
    +String id
    +String name
  }`;
      const diagram = parseClassDiagram(block);
      expect(diagram).not.toBeNull();
      expect(diagram!.classes).toHaveLength(1);
      expect(diagram!.classes[0].name).toBe('User');
      expect(diagram!.classes[0].stereotype).toBe('Entity');
      expect(diagram!.classes[0].properties).toHaveLength(2);
      expect(diagram!.classes[0].properties[0].name).toBe('id');
      expect(diagram!.classes[0].properties[0].type).toBe('string');
    });

    it('parses methods with parameters', () => {
      const block = `classDiagram
  class UserService {
    +validate(id String, name String) Boolean
    -hashPassword(pwd String) String
  }`;
      const diagram = parseClassDiagram(block);
      expect(diagram!.classes[0].methods).toHaveLength(2);
      expect(diagram!.classes[0].methods[0].name).toBe('validate');
      expect(diagram!.classes[0].methods[0].params).toHaveLength(2);
      expect(diagram!.classes[0].methods[0].returnType).toBe('boolean');
    });

    it('parses relationships', () => {
      const block = `classDiagram
  class User
  class Email
  User --> Email : has`;
      const diagram = parseClassDiagram(block);
      expect(diagram!.relationships).toHaveLength(1);
      expect(diagram!.relationships[0].from).toBe('User');
      expect(diagram!.relationships[0].to).toBe('Email');
      expect(diagram!.relationships[0].label).toBe('has');
    });

    it('parses cardinality', () => {
      const block = `classDiagram
  class User
  class Email
  User "1" --> "n" Email`;
      const diagram = parseClassDiagram(block);
      expect(diagram!.relationships[0].fromCard).toBe('1');
      expect(diagram!.relationships[0].toCard).toBe('n');
    });

    it('normalizes stereotypes', () => {
      const block = `classDiagram
  class A {
    <<ValueObject>>
  }
  class B {
    <<aggregate root>>
  }
  class C {
    <<domain service>>
  }`;
      const diagram = parseClassDiagram(block);
      expect(diagram!.classes[0].stereotype).toBe('ValueObject');
      expect(diagram!.classes[1].stereotype).toBe('Aggregate');
      expect(diagram!.classes[2].stereotype).toBe('Service');
    });

    it('parses single-line classes without body', () => {
      const block = `classDiagram
  class User
  class Email`;
      const diagram = parseClassDiagram(block);
      expect(diagram!.classes).toHaveLength(2);
      expect(diagram!.classes[0].properties).toHaveLength(0);
    });

    it('returns empty diagram for empty classDiagram', () => {
      const diagram = parseClassDiagram('classDiagram');
      expect(diagram).not.toBeNull();
      expect(diagram!.classes).toHaveLength(0);
      expect(diagram!.relationships).toHaveLength(0);
    });
  });

  describe('parseDddModel', () => {
    it('parses first classDiagram from markdown', () => {
      const md = `# Model

\`\`\`mermaid
classDiagram
  class Order {
    <<Aggregate>>
    +String id
  }
\`\`\`

Some text here.

\`\`\`mermaid
sequenceDiagram
  A -> B
\`\`\``;
      const diagram = parseDddModel(md);
      expect(diagram).not.toBeNull();
      expect(diagram!.classes[0].name).toBe('Order');
      expect(diagram!.classes[0].stereotype).toBe('Aggregate');
    });

    it('returns null when no classDiagram exists', () => {
      const md = 'No diagrams here.';
      expect(parseDddModel(md)).toBeNull();
    });

    it('skips non-classDiagram mermaid blocks', () => {
      const md = `\`\`\`mermaid
sequenceDiagram
  A -> B
\`\`\`

\`\`\`mermaid
classDiagram
  class Foo
\`\`\``;
      const diagram = parseDddModel(md);
      expect(diagram).not.toBeNull();
      expect(diagram!.classes[0].name).toBe('Foo');
    });
  });
});
