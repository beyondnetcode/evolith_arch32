import { listPrompts, getPrompt } from './index';

describe('MCP Prompts', () => {
  describe('listPrompts', () => {
    it('should return list of available prompts', async () => {
      const result = await listPrompts();

      expect(result.prompts).toBeDefined();
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(result.prompts.length).toBe(8);
    });

    it('should include validate-repository prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/validate-repository');
      expect(prompt).toBeDefined();
      expect(prompt?.arguments.some((a: unknown) => a.name === 'path')).toBe(true);
    });

    it('should include agent-onboarding prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/agent-onboarding');
      expect(prompt).toBeDefined();
    });

    it('should include review-architecture prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/review-architecture');
      expect(prompt).toBeDefined();
    });

    it('should include phase-gate-check prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/phase-gate-check');
      expect(prompt).toBeDefined();
    });

    it('should include sdlc-handoff prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/sdlc-handoff');
      expect(prompt).toBeDefined();
      expect(prompt?.arguments.some((a: unknown) => a.name === 'fromPhase')).toBe(true);
    });

    it('should include ruleset-analysis prompt', async () => {
      const result = await listPrompts();

      const prompt = result.prompts.find((p: unknown) => p.name === 'evolith/ruleset-analysis');
      expect(prompt).toBeDefined();
    });
  });

  describe('getPrompt', () => {
    describe('evolith/validate-repository', () => {
      it('should return validation prompt template', async () => {
        const result = await getPrompt({ name: 'evolith/validate-repository', arguments: { path: '/test/repo' } });

        expect(result.messages).toHaveLength(1);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.text).toContain('/test/repo');
        expect(result.messages[0].content.text).toContain('evolith-validate');
      });

      it('should include ruleset focus when provided', async () => {
        const result = await getPrompt({
          name: 'evolith/validate-repository',
          arguments: { path: '/test/repo', ruleset: 'governance' },
        });

        expect(result.messages[0].content.text).toContain('governance');
      });

      it('should use placeholders when args not provided', async () => {
        const result = await getPrompt({ name: 'evolith/validate-repository', arguments: {} });

        expect(result.messages[0].content.text).toContain('<path>');
      });
    });

    describe('evolith/agent-onboarding', () => {
      it('should return agent onboarding prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/agent-onboarding',
          arguments: { name: 'test-agent', template: 'enterprise' },
        });

        expect(result.messages[0].content.text).toContain('test-agent');
        expect(result.messages[0].content.text).toContain('enterprise');
        expect(result.messages[0].content.text).toContain('evolith-agent-install');
      });

      it('should default to standard template', async () => {
        const result = await getPrompt({
          name: 'evolith/agent-onboarding',
          arguments: { name: 'test-agent' },
        });

        expect(result.messages[0].content.text).toContain('standard');
      });
    });

    describe('evolith/review-architecture', () => {
      it('should return architecture review prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/review-architecture',
          arguments: { path: '/test/repo', level: 'F2' },
        });

        expect(result.messages[0].content.text).toContain('/test/repo');
        expect(result.messages[0].content.text).toContain('F2');
        expect(result.messages[0].content.text).toContain('F1-01');
        expect(result.messages[0].content.text).toContain('F2-01');
        expect(result.messages[0].content.text).toContain('F3-01');
      });

      it('should check all levels when level not specified', async () => {
        const result = await getPrompt({
          name: 'evolith/review-architecture',
          arguments: { path: '/test/repo' },
        });

        expect(result.messages[0].content.text).toContain('Check all three levels');
      });
    });

    describe('evolith/prepare-discovery', () => {
      it('should return prepare discovery prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/prepare-discovery',
          arguments: { path: '/test/repo' },
        });

        expect(result.messages[0].content.text).toContain('/test/repo');
        expect(result.messages[0].content.text).toContain('evolith-sdlc-status');
        expect(result.messages[0].content.text).toContain('evolith-moscow-create');
      });
    });

    describe('evolith/phase-gate-check', () => {
      it('should return phase gate check prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/phase-gate-check',
          arguments: { path: '/test/repo' },
        });

        expect(result.messages[0].content.text).toContain('/test/repo');
        expect(result.messages[0].content.text).toContain('evolith-sdlc-status');
      });
    });

    describe('evolith/sdlc-handoff', () => {
      it('should return SDLC handoff prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/sdlc-handoff',
          arguments: { path: '/test/repo', fromPhase: 'phase-1', toPhase: 'phase-2' },
        });

        expect(result.messages[0].content.text).toContain('phase-1');
        expect(result.messages[0].content.text).toContain('phase-2');
        expect(result.messages[0].content.text).toContain('evolith-sdlc-handoff');
      });
    });

    describe('evolith/ruleset-analysis', () => {
      it('should return ruleset analysis prompt template', async () => {
        const result = await getPrompt({
          name: 'evolith/ruleset-analysis',
          arguments: { ruleset: 'GOV-01', path: '/test/repo' },
        });

        expect(result.messages[0].content.text).toContain('GOV-01');
        expect(result.messages[0].content.text).toContain('/test/repo');
      });

      it('should work without path', async () => {
        const result = await getPrompt({
          name: 'evolith/ruleset-analysis',
          arguments: { ruleset: 'GOV-01' },
        });

        expect(result.messages[0].content.text).toContain('GOV-01');
      });
    });

    describe('unknown prompt', () => {
      it('should throw error for unknown prompt', async () => {
        await expect(getPrompt({ name: 'evolith/unknown' }))
          .rejects.toThrow('Unknown prompt: evolith/unknown');
      });
    });
  });
});
