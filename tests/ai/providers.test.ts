import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_CLAUDE_MODEL, CLAUDE_MODELS, getClaudeModel, createClaudeProvider } from '@/lib/ai/providers/claude';

describe('Claude Provider', () => {
  describe('DEFAULT_CLAUDE_MODEL', () => {
    it('is defined as a string', () => {
      expect(DEFAULT_CLAUDE_MODEL).toBeDefined();
      expect(typeof DEFAULT_CLAUDE_MODEL).toBe('string');
    });

    it('is a valid Claude model identifier', () => {
      expect(DEFAULT_CLAUDE_MODEL).toMatch(/^claude-/);
    });
  });

  describe('CLAUDE_MODELS', () => {
    it('includes the default model', () => {
      expect(CLAUDE_MODELS).toHaveProperty(DEFAULT_CLAUDE_MODEL);
    });

    it('has name and description for each model', () => {
      Object.values(CLAUDE_MODELS).forEach((model) => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('maxTokens');
        expect(typeof model.name).toBe('string');
        expect(typeof model.description).toBe('string');
        expect(typeof model.maxTokens).toBe('number');
      });
    });
  });

  describe('createClaudeProvider', () => {
    it('returns a function (model factory)', () => {
      const result = createClaudeProvider();
      expect(result).toBeDefined();
    });
  });

  describe('getClaudeModel', () => {
    it('returns a model instance', () => {
      const model = getClaudeModel();
      expect(model).toBeDefined();
    });

    it('accepts optional API key parameter', () => {
      expect(() => getClaudeModel('test-api-key')).not.toThrow();
    });
  });
});
