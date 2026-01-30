# MiniMax 2.1 Provider Documentation

Research findings and API documentation for integrating MiniMax 2.1 with the AI Website Builder.

## Overview

MiniMax is a Chinese AI company offering large language models with:
- Ultra-long context windows (200,000+ tokens)
- High throughput (60-100 tokens per second)
- OpenAI and Anthropic API compatibility

## Supported Models

| Model | Description | Speed |
|-------|-------------|-------|
| MiniMax-M2.1 | Recommended for coding tasks | ~60 tps |
| MiniMax-M2.1-lightning | Faster variant | ~100 tps |
| MiniMax-M2 | Agentic capabilities, advanced reasoning | ~40 tps |

## API Endpoints

MiniMax offers three API formats:

### 1. OpenAI-Compatible API (Recommended)

```
Base URL: https://api.minimax.io/v1
Endpoint: POST /chat/completions
```

**Authentication:**
```
Authorization: Bearer <API_KEY>
```

**Request Format:**
```json
{
  "model": "MiniMax-M2.1",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello"}
  ],
  "temperature": 1.0,
  "top_p": 0.95,
  "max_tokens": 4096,
  "stream": true,
  "reasoning_split": true
}
```

### 2. Anthropic-Compatible API

```
Base URL: https://api.minimax.io/anthropic
```

### 3. Native MiniMax API

```
Base URL: https://api.minimax.io
Endpoint: POST /v1/text/chatcompletion_v2
```

## Streaming Protocol

MiniMax uses Server-Sent Events (SSE) for streaming, compatible with OpenAI format:

**Stream Chunk Format:**
```
data: {"id":"xxx","object":"chat.completion.chunk","created":1234567890,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"xxx","object":"chat.completion.chunk","created":1234567890,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}

data: [DONE]
```

**Key Streaming Behaviors:**
- Each chunk contains incremental content in `delta.content`
- `finish_reason` is `null` until final chunk
- Usage statistics only appear in final chunk before `[DONE]`
- Stream ends with `data: [DONE]`

## Differences from OpenAI/Anthropic

### OpenAI Differences

| Feature | OpenAI | MiniMax |
|---------|--------|---------|
| Temperature range | 0.0-2.0 | (0.0, 1.0] |
| Top-p default | 1.0 | 0.95 |
| `presence_penalty` | Supported | Ignored |
| `frequency_penalty` | Supported | Ignored |
| `logit_bias` | Supported | Ignored |
| `n` parameter | 1-128 | Only 1 |
| `function_call` (deprecated) | Supported | Not supported |
| Image input | Supported | Not supported |
| `reasoning_split` | N/A | MiniMax-specific |

### Anthropic Differences

| Feature | Anthropic | MiniMax |
|---------|-----------|---------|
| `top_k` | Supported | Ignored |
| `stop_sequences` | Supported | Ignored |
| `thinking` | Native | Supported via `reasoning_split` |
| Image/document input | Supported | Not supported |

### MiniMax-Specific Features

1. **reasoning_split**: When `true`, thinking/reasoning content is separated into `reasoning_details` field
2. **Content sensitivity checks**: `input_sensitive` and `output_sensitive` flags in response
3. **Ultra-long context**: 200,000+ token context window

## Error Handling

| Code | Message | Solution |
|------|---------|----------|
| 1000 | Unknown error | Retry |
| 1001 | Request timeout | Retry |
| 1002 | Rate limit | Wait and retry |
| 1004 | Not authorized | Check API key |
| 1008 | Insufficient balance | Check account |
| 1024 | Internal error | Retry |
| 1039 | Token limit | Reduce input size |
| 2013 | Invalid params | Check request format |

## Rate Limits

| API | TPM (Tokens Per Minute) |
|-----|-------------------------|
| Text API (M2.1, M2) | 20,000,000 |
| Speech API | 20,000 |

## Usage Example

```typescript
import { createMinimax } from './lib/ai/providers/minimax-prototype';
import { streamText } from 'ai';

const minimax = createMinimax({
  apiKey: process.env.MINIMAX_API_KEY,
});

const result = await streamText({
  model: minimax.chat('MiniMax-M2.1'),
  prompt: 'Hello, how are you?',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

## Implementation Notes for Production

### Considerations for Task 10

1. **Error handling**: Implement proper retry logic with exponential backoff for codes 1000, 1001, 1002, 1024
2. **API key rotation**: Support multiple API keys for high availability
3. **Token counting**: MiniMax counts tokens differently - test with actual API
4. **Content filtering**: Handle `input_sensitive` and `output_sensitive` flags gracefully
5. **Tool calling**: Full tool/function calling support via `tools` parameter (not the deprecated `function_call`)

### Streaming Caveats

1. MiniMax streams may have different chunking behavior than OpenAI
2. Usage statistics are only available after stream completes
3. Empty chunks may occur - filter these out

### Testing Without API Key

The prototype includes mock responses for testing without a real API key:
```bash
MINIMAX_API_KEY=test bun run scripts/test-minimax.ts
```

## References

- [MiniMax API Docs](https://platform.minimax.io/docs)
- [OpenAI-Compatible API](https://platform.minimax.io/docs/api-reference/text-openai-api)
- [Anthropic-Compatible API](https://platform.minimax.io/docs/api-reference/text-anthropic-api)
- [Rate Limits](https://platform.minimax.io/docs/api-reference/ratelimit)
- [Error Codes](https://platform.minimax.io/docs/api-reference/errorcode)
- [Vercel AI SDK Custom Providers](https://ai-sdk.dev/providers/community-providers/custom-providers)
