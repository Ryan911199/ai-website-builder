import { anthropic, createAnthropic } from '@ai-sdk/anthropic';

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export function createClaudeProvider(apiKey?: string) {
  if (apiKey) {
    const customProvider = createAnthropic({ apiKey });
    return customProvider(DEFAULT_CLAUDE_MODEL);
  }
  return anthropic(DEFAULT_CLAUDE_MODEL);
}

export function getClaudeModel(apiKey?: string) {
  return createClaudeProvider(apiKey);
}

export const CLAUDE_MODELS = {
  'claude-sonnet-4-20250514': {
    name: 'Claude Sonnet 4',
    description: 'Best balance of quality and speed',
    maxTokens: 64000,
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation, still excellent',
    maxTokens: 8192,
  },
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_MODELS;
