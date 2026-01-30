import { describe, it, expect } from 'vitest';
import { CODE_GENERATION_SYSTEM_PROMPT, ITERATION_PROMPT_PREFIX } from '@/lib/ai/prompts';

describe('CODE_GENERATION_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toBeDefined();
    expect(typeof CODE_GENERATION_SYSTEM_PROMPT).toBe('string');
    expect(CODE_GENERATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('includes file output format instructions', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('```file:');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('path/to/file.tsx');
  });

  it('includes React project guidelines', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('React');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('TypeScript');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('Tailwind');
  });

  it('includes static HTML project guidelines', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('HTML');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('CSS');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('index.html');
  });

  it('includes accessibility guidelines', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('accessibility');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('ARIA');
  });

  it('includes responsive design guidelines', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('responsive');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('mobile-first');
  });

  it('includes rules for complete file generation', () => {
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('COMPLETE files');
    expect(CODE_GENERATION_SYSTEM_PROMPT).toContain('not snippets');
  });
});

describe('ITERATION_PROMPT_PREFIX', () => {
  it('is a non-empty string', () => {
    expect(ITERATION_PROMPT_PREFIX).toBeDefined();
    expect(typeof ITERATION_PROMPT_PREFIX).toBe('string');
    expect(ITERATION_PROMPT_PREFIX.length).toBeGreaterThan(0);
  });

  it('includes placeholder for files context', () => {
    expect(ITERATION_PROMPT_PREFIX).toContain('{FILES_CONTEXT}');
  });

  it('mentions modifying existing code', () => {
    expect(ITERATION_PROMPT_PREFIX).toContain('modify');
    expect(ITERATION_PROMPT_PREFIX).toContain('existing code');
  });
});
