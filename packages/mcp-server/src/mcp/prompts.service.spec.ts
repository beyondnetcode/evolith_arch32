import { PromptsService } from './prompts.service';

describe('PromptsService', () => {
  const service = new PromptsService();

  it('lists all prompt templates', () => {
    expect(service.list().prompts.length).toBe(8);
  });

  it('renders every prompt with substituted arguments', () => {
    for (const prompt of service.list().prompts) {
      const result = service.get(prompt.name, { path: '/repo', name: 'a', ruleset: 'INH', fromPhase: 'phase-0', toPhase: 'phase-1' });
      expect(result.messages[0].content.text.length).toBeGreaterThan(0);
    }
  });

  it('throws for an unknown prompt', () => {
    expect(() => service.get('evolith/nope')).toThrow('Unknown prompt');
  });
});
