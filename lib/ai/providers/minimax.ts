/**
 * MiniMax 2.1 Production Provider for Vercel AI SDK
 *
 * A full implementation of the LanguageModelV3 interface for MiniMax AI models.
 * Uses the OpenAI-compatible API endpoint for maximum compatibility.
 *
 * Features:
 * - Full streaming support with proper error handling
 * - API rate limit handling with exponential backoff
 * - Detailed error messages for debugging
 * - Support for MiniMax-specific features like reasoning_split
 *
 * @see https://platform.minimax.io/docs/api-reference/text-openai-api
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  SharedV3Warning,
} from "@ai-sdk/provider";

export interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MiniMaxChatCompletionRequest {
  model: string;
  messages: MiniMaxMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  reasoning_split?: boolean;
}

export interface MiniMaxChatCompletionChoice {
  index: number;
  message?: {
    role: "assistant";
    content: string;
    reasoning_details?: Array<{ text: string }>;
  };
  delta?: {
    role?: "assistant";
    content?: string;
    reasoning_details?: Array<{ text: string }>;
  };
  finish_reason?: "stop" | "length" | null;
}

export interface MiniMaxChatCompletionResponse {
  id: string;
  object: "chat.completion" | "chat.completion.chunk";
  created: number;
  model: string;
  choices: MiniMaxChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MiniMaxErrorResponse {
  error?: {
    code?: number;
    message?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export interface MiniMaxSettings {
  /**
   * Base URL for the MiniMax API.
   * @default "https://api.minimax.io/v1"
   */
  baseURL?: string;

  /**
   * API key for authentication.
   * Can also be set via MINIMAX_API_KEY environment variable.
   */
  apiKey?: string;

  /**
   * Whether to use reasoning_split for M2.1 models.
   * When true, thinking content is separated into reasoning_details.
   * @default false
   */
  reasoningSplit?: boolean;

  /**
   * Maximum number of retries for rate limit errors.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in ms for exponential backoff.
   * @default 1000
   */
  retryDelay?: number;
}

export interface MiniMaxModelSettings {
  /**
   * Temperature for response generation.
   * Range: (0.0, 1.0], default: 1.0
   */
  temperature?: number;

  /**
   * Top-p (nucleus) sampling parameter.
   * Range: (0.0, 1.0], default: 0.95
   */
  topP?: number;

  /**
   * Maximum number of tokens to generate.
   */
  maxTokens?: number;
}

export class MiniMaxAPIError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status: number,
    public readonly isRetryable: boolean
  ) {
    super(message);
    this.name = "MiniMaxAPIError";
  }

  static fromResponse(status: number, body: MiniMaxErrorResponse): MiniMaxAPIError {
    const code = body.error?.code ?? body.base_resp?.status_code ?? status;
    const message = body.error?.message ?? body.base_resp?.status_msg ?? "Unknown error";
    const isRetryable = MiniMaxAPIError.isRetryableCode(code);

    return new MiniMaxAPIError(
      `MiniMax API error ${code}: ${message}`,
      code,
      status,
      isRetryable
    );
  }

  static isRetryableCode(code: number): boolean {
    const retryableCodes = [1000, 1001, 1002, 1024];
    return retryableCodes.includes(code);
  }
}

export const MINIMAX_ERROR_CODES: Record<number, string> = {
  1000: "Unknown error - retry may help",
  1001: "Request timeout - retry may help",
  1002: "Rate limit exceeded - wait and retry",
  1004: "Not authorized - check your API key",
  1008: "Insufficient balance - check your account",
  1024: "Internal error - retry may help",
  1039: "Token limit exceeded - reduce input size",
  2013: "Invalid parameters - check request format",
};

function createV3Usage(inputTokens: number, outputTokens: number): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: inputTokens,
      noCache: inputTokens,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: outputTokens,
      text: outputTokens,
      reasoning: undefined,
    },
  };
}

function mapFinishReason(reason: string | null | undefined): LanguageModelV3FinishReason {
  const unified = (() => {
    if (reason === "stop") return "stop" as const;
    if (reason === "length") return "length" as const;
    return "other" as const;
  })();

  return { unified, raw: reason ?? undefined };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MiniMaxChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider = "minimax";
  readonly modelId: string;
  readonly supportedUrls = {};

  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly settings: MiniMaxModelSettings;
  private readonly reasoningSplit: boolean;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    modelId: string,
    providerSettings: MiniMaxSettings = {},
    modelSettings: MiniMaxModelSettings = {}
  ) {
    this.modelId = modelId;
    this.baseURL = providerSettings.baseURL ?? "https://api.minimax.io/v1";
    this.apiKey = providerSettings.apiKey ?? process.env.MINIMAX_API_KEY ?? "";
    this.settings = modelSettings;
    this.reasoningSplit = providerSettings.reasoningSplit ?? false;
    this.maxRetries = providerSettings.maxRetries ?? 3;
    this.retryDelay = providerSettings.retryDelay ?? 1000;

    if (!this.apiKey) {
      console.warn(
        "[MiniMax] No API key provided. Set MINIMAX_API_KEY environment variable or pass apiKey in settings."
      );
    }
  }

  private convertPrompt(prompt: LanguageModelV3CallOptions["prompt"]): MiniMaxMessage[] {
    const messages: MiniMaxMessage[] = [];

    for (const message of prompt) {
      switch (message.role) {
        case "system":
          messages.push({
            role: "system",
            content:
              typeof message.content === "string"
                ? message.content
                : (message.content as Array<{ type: string; text?: string }>)
                    .filter((part) => part.type === "text")
                    .map((part) => part.text ?? "")
                    .join("\n"),
          });
          break;

        case "user":
          messages.push({
            role: "user",
            content: (message.content as Array<{ type: string; text?: string }>)
              .filter((part) => part.type === "text")
              .map((part) => part.text ?? "")
              .join("\n"),
          });
          break;

        case "assistant":
          messages.push({
            role: "assistant",
            content: (message.content as Array<{ type: string; text?: string }>)
              .filter((part) => part.type === "text")
              .map((part) => part.text ?? "")
              .join(""),
          });
          break;

        case "tool":
          // MiniMax doesn't have a dedicated tool role in basic API
          // Tool results would be passed as user messages in practice
          const toolContent = message.content as Array<{
            type: string;
            toolCallId?: string;
            result?: unknown;
          }>;
          if (toolContent[0]) {
            messages.push({
              role: "user",
              content: `Tool result for ${toolContent[0].toolCallId ?? "unknown"}: ${JSON.stringify(toolContent[0].result ?? {})}`,
            });
          }
          break;
      }
    }

    return messages;
  }

  private buildRequestBody(
    options: LanguageModelV3CallOptions,
    stream: boolean
  ): MiniMaxChatCompletionRequest {
    const messages = this.convertPrompt(options.prompt);

    return {
      model: this.modelId,
      messages,
      temperature: options.temperature ?? this.settings.temperature ?? 1.0,
      top_p: options.topP ?? this.settings.topP ?? 0.95,
      max_tokens: options.maxOutputTokens ?? this.settings.maxTokens ?? undefined,
      stream,
      ...(this.reasoningSplit && { reasoning_split: true }),
    };
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries: number = this.maxRetries
  ): Promise<Response> {
    let lastError: Error | undefined;
    let delay = this.retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, init);

        if (!response.ok) {
          const responseText = await response.text();
          let errorBody: MiniMaxErrorResponse;
          try {
            errorBody = JSON.parse(responseText);
          } catch {
            throw new Error(`MiniMax API error: ${response.status} - ${responseText}`);
          }

          const apiError = MiniMaxAPIError.fromResponse(response.status, errorBody);

          if (apiError.isRetryable && attempt < maxRetries) {
            console.warn(
              `[MiniMax] Retryable error (${apiError.code}), attempt ${attempt + 1}/${maxRetries + 1}, waiting ${delay}ms`
            );
            await sleep(delay);
            delay *= 2;
            lastError = apiError;
            continue;
          }

          throw apiError;
        }

        return response;
      } catch (error) {
        if (error instanceof MiniMaxAPIError && !error.isRetryable) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw lastError ?? error;
        }

        console.warn(
          `[MiniMax] Request failed, attempt ${attempt + 1}/${maxRetries + 1}, waiting ${delay}ms`
        );
        await sleep(delay);
        delay *= 2;
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }

  async doGenerate(options: LanguageModelV3CallOptions) {
    const body = this.buildRequestBody(options, false);

    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    const data: MiniMaxChatCompletionResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: [
        {
          type: "text" as const,
          text: choice.message?.content ?? "",
        },
      ],
      finishReason: mapFinishReason(choice.finish_reason),
      usage: createV3Usage(
        data.usage?.prompt_tokens ?? 0,
        data.usage?.completion_tokens ?? 0
      ),
      request: { body },
      response: { body: data },
      warnings: [] as SharedV3Warning[],
    };
  }

  async doStream(options: LanguageModelV3CallOptions) {
    const body = this.buildRequestBody(options, true);
    const warnings: SharedV3Warning[] = [];

    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    const stream = this.createStreamTransformer(response, warnings);

    return { stream, warnings };
  }

  private createStreamTransformer(
    response: Response,
    warnings: SharedV3Warning[]
  ): ReadableStream<LanguageModelV3StreamPart> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let isFirstChunk = true;
    let textStarted = false;
    let inputTokens = 0;
    let outputTokens = 0;
    const textId = `text-${Date.now()}`;

    return new ReadableStream<LanguageModelV3StreamPart>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            if (textStarted) {
              controller.enqueue({ type: "text-end", id: textId });
            }
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop" as const, raw: undefined },
              usage: createV3Usage(inputTokens, outputTokens),
            });
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              if (textStarted) {
                controller.enqueue({ type: "text-end", id: textId });
              }
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop" as const, raw: undefined },
                usage: createV3Usage(inputTokens, outputTokens),
              });
              controller.close();
              return;
            }

            if (!data) continue;

            try {
              const chunk: MiniMaxChatCompletionResponse = JSON.parse(data);

              if (isFirstChunk) {
                controller.enqueue({ type: "stream-start", warnings });
                isFirstChunk = false;
              }

              const choice = chunk.choices?.[0];
              if (!choice) continue;

              if (choice.delta?.content) {
                if (!textStarted) {
                  controller.enqueue({ type: "text-start", id: textId });
                  textStarted = true;
                }
                controller.enqueue({
                  type: "text-delta",
                  id: textId,
                  delta: choice.delta.content,
                });
              }

              if (choice.finish_reason) {
                if (chunk.usage) {
                  inputTokens = chunk.usage.prompt_tokens;
                  outputTokens = chunk.usage.completion_tokens;
                }

                if (textStarted) {
                  controller.enqueue({ type: "text-end", id: textId });
                  textStarted = false;
                }

                controller.enqueue({
                  type: "finish",
                  finishReason: mapFinishReason(choice.finish_reason),
                  usage: createV3Usage(inputTokens, outputTokens),
                });
              }
            } catch {}
          }
        } catch (error) {
          controller.error(error);
        }
      },

      cancel() {
        reader.cancel();
      },
    });
  }
}

export interface MiniMaxProvider {
  /**
   * Create a model with any supported MiniMax model ID.
   */
  chat(modelId: string, modelSettings?: MiniMaxModelSettings): LanguageModelV3;

  /**
   * Create a MiniMax-M2.1 model (recommended for coding tasks).
   */
  "minimax-m2.1"(modelSettings?: MiniMaxModelSettings): LanguageModelV3;

  /**
   * Create a MiniMax-M2.1-lightning model (faster variant).
   */
  "minimax-m2.1-lightning"(modelSettings?: MiniMaxModelSettings): LanguageModelV3;
}

/**
 * Create a MiniMax provider with custom settings.
 *
 * @example
 * ```typescript
 * import { createMinimax } from '@/lib/ai/providers/minimax';
 * import { streamText } from 'ai';
 *
 * const minimax = createMinimax({
 *   apiKey: process.env.MINIMAX_API_KEY,
 * });
 *
 * const result = await streamText({
 *   model: minimax['minimax-m2.1'](),
 *   prompt: 'Create a React component',
 * });
 * ```
 */
export function createMinimax(settings: MiniMaxSettings = {}): MiniMaxProvider {
  return {
    chat(modelId: string, modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(modelId, settings, modelSettings);
    },

    "minimax-m2.1"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel("MiniMax-M2.1", settings, modelSettings);
    },

    "minimax-m2.1-lightning"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel("MiniMax-M2.1-lightning", settings, modelSettings);
    },
  };
}

/**
 * Default MiniMax provider instance using environment variables.
 *
 * Uses MINIMAX_API_KEY from environment by default.
 *
 * @example
 * ```typescript
 * import { minimax } from '@/lib/ai/providers/minimax';
 * import { streamText } from 'ai';
 *
 * const result = await streamText({
 *   model: minimax['minimax-m2.1'](),
 *   prompt: 'Create a React component',
 * });
 * ```
 */
export const minimax = createMinimax();

export const DEFAULT_MINIMAX_MODEL = "MiniMax-M2.1";

export const MINIMAX_MODELS = {
  "MiniMax-M2.1": {
    name: "MiniMax M2.1",
    description: "Recommended for coding tasks, 60 tokens/second",
    maxTokens: 200000,
    speed: "~60 tps",
  },
  "MiniMax-M2.1-lightning": {
    name: "MiniMax M2.1 Lightning",
    description: "Faster variant, 100 tokens/second",
    maxTokens: 200000,
    speed: "~100 tps",
  },
  "MiniMax-M2": {
    name: "MiniMax M2",
    description: "Agentic capabilities, advanced reasoning",
    maxTokens: 200000,
    speed: "~40 tps",
  },
} as const;

export type MiniMaxModelId = keyof typeof MINIMAX_MODELS;

/**
 * Get a MiniMax model instance for use with Vercel AI SDK.
 *
 * @param apiKey - Optional API key (defaults to MINIMAX_API_KEY env var)
 * @param modelId - Optional model ID (defaults to MiniMax-M2.1)
 * @returns LanguageModelV3 instance
 *
 * @example
 * ```typescript
 * import { getMiniMaxModel } from '@/lib/ai/providers/minimax';
 * import { streamText } from 'ai';
 *
 * const model = getMiniMaxModel(process.env.MINIMAX_API_KEY);
 *
 * const result = await streamText({
 *   model,
 *   prompt: 'Create a React component',
 * });
 * ```
 */
export function getMiniMaxModel(
  apiKey?: string,
  modelId: MiniMaxModelId = "MiniMax-M2.1"
): LanguageModelV3 {
  const provider = createMinimax({ apiKey });
  return provider.chat(modelId);
}
