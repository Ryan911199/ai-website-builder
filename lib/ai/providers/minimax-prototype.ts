/**
 * MiniMax 2.1 Prototype Provider for Vercel AI SDK
 *
 * This is a prototype implementation for research purposes.
 * MiniMax supports both OpenAI-compatible and Anthropic-compatible APIs.
 * This implementation uses the OpenAI-compatible endpoint for simplicity.
 *
 * API Documentation: https://platform.minimax.io/docs/api-reference/text-openai-api
 * Base URL: https://api.minimax.io/v1
 *
 * Supported Models:
 * - MiniMax-M2.1 (recommended, ~60 tps)
 * - MiniMax-M2.1-lightning (faster, ~100 tps)
 * - MiniMax-M2 (agentic capabilities)
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";

// MiniMax API Types
interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MiniMaxChatCompletionRequest {
  model: string;
  messages: MiniMaxMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  reasoning_split?: boolean; // MiniMax-specific: separate thinking content
}

interface MiniMaxChatCompletionChoice {
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

interface MiniMaxChatCompletionResponse {
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

// Provider Settings
interface MiniMaxSettings {
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
}

// Model Settings
interface MiniMaxModelSettings {
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

/**
 * MiniMax Chat Language Model implementing LanguageModelV3 interface
 */
class MiniMaxChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "V3" as const;
  readonly provider = "minimax";
  readonly modelId: string;
  readonly supportedUrls = {};

  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly settings: MiniMaxModelSettings;
  private readonly reasoningSplit: boolean;

  constructor(
    modelId: string,
    providerSettings: MiniMaxSettings = {},
    modelSettings: MiniMaxModelSettings = {}
  ) {
    this.modelId = modelId;
    this.baseURL = providerSettings.baseURL ?? "https://api.minimax.io/v1";
    this.apiKey =
      providerSettings.apiKey ?? process.env.MINIMAX_API_KEY ?? "";
    this.settings = modelSettings;
    this.reasoningSplit = providerSettings.reasoningSplit ?? false;

    if (!this.apiKey) {
      console.warn(
        "[MiniMax] No API key provided. Set MINIMAX_API_KEY environment variable or pass apiKey in settings."
      );
    }
  }

  /**
   * Convert AI SDK prompt to MiniMax message format
   */
  private convertPrompt(
    prompt: LanguageModelV3CallOptions["prompt"]
  ): MiniMaxMessage[] {
    const messages: MiniMaxMessage[] = [];

    for (const message of prompt) {
      switch (message.role) {
        case "system":
          messages.push({
            role: "system",
            content:
              typeof message.content === "string"
                ? message.content
                : message.content
                    .filter((part) => part.type === "text")
                    .map((part) => (part as { type: "text"; text: string }).text)
                    .join("\n"),
          });
          break;

        case "user":
          messages.push({
            role: "user",
            content: message.content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n"),
          });
          break;

        case "assistant":
          messages.push({
            role: "assistant",
            content: message.content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join(""),
          });
          break;

        case "tool":
          // MiniMax doesn't have a dedicated tool role in basic API
          // Tool results would be passed as user messages in practice
          messages.push({
            role: "user",
            content: `Tool result for ${message.content[0].toolCallId}: ${JSON.stringify(message.content[0].result)}`,
          });
          break;
      }
    }

    return messages;
  }

  /**
   * Build request body for MiniMax API
   */
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
      max_tokens:
        options.maxOutputTokens ?? this.settings.maxTokens ?? undefined,
      stream,
      ...(this.reasoningSplit && { reasoning_split: true }),
    };
  }

  /**
   * Map MiniMax finish reason to AI SDK finish reason
   */
  private mapFinishReason(
    reason: string | null | undefined
  ): "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      default:
        return "other";
    }
  }

  /**
   * Non-streaming generation
   */
  async doGenerate(options: LanguageModelV3CallOptions) {
    const body = this.buildRequestBody(options, false);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    const data: MiniMaxChatCompletionResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: [
        {
          type: "text" as const,
          text: choice.message?.content ?? "",
        },
      ],
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      request: { body },
      response: { body: data },
      warnings: [],
    };
  }

  /**
   * Streaming generation
   */
  async doStream(options: LanguageModelV3CallOptions) {
    const body = this.buildRequestBody(options, true);
    const warnings: Array<{ type: string; message: string }> = [];

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }

    // Transform SSE stream to AI SDK stream format
    const stream = this.createStreamTransformer(response, warnings);

    return { stream, warnings };
  }

  /**
   * Create stream transformer for SSE responses
   */
  private createStreamTransformer(
    response: Response,
    warnings: Array<{ type: string; message: string }>
  ): ReadableStream<LanguageModelV3StreamPart> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let isFirstChunk = true;
    let inputTokens = 0;
    let outputTokens = 0;

    const mapFinishReason = this.mapFinishReason.bind(this);

    return new ReadableStream<LanguageModelV3StreamPart>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();

          if (done) {
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
              controller.enqueue({
                type: "finish",
                finishReason: "stop",
                usage: {
                  inputTokens,
                  outputTokens,
                  totalTokens: inputTokens + outputTokens,
                },
              });
              controller.close();
              return;
            }

            try {
              const chunk: MiniMaxChatCompletionResponse = JSON.parse(data);

              // Send stream-start on first chunk
              if (isFirstChunk) {
                controller.enqueue({ type: "stream-start", warnings });
                isFirstChunk = false;
              }

              const choice = chunk.choices?.[0];
              if (!choice) continue;

              // Handle text content
              if (choice.delta?.content) {
                controller.enqueue({
                  type: "text",
                  text: choice.delta.content,
                });
              }

              // Handle finish reason
              if (choice.finish_reason) {
                if (chunk.usage) {
                  inputTokens = chunk.usage.prompt_tokens;
                  outputTokens = chunk.usage.completion_tokens;
                }

                controller.enqueue({
                  type: "finish",
                  finishReason: mapFinishReason(choice.finish_reason),
                  usage: {
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                  },
                });
              }
            } catch {
              // Skip invalid JSON chunks
            }
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

/**
 * Create a MiniMax provider instance
 */
export function createMinimax(settings: MiniMaxSettings = {}) {
  return {
    /**
     * Create a chat model instance
     * @param modelId - Model ID (e.g., "MiniMax-M2.1", "MiniMax-M2.1-lightning")
     * @param modelSettings - Model-specific settings
     */
    chat(modelId: string, modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(modelId, settings, modelSettings);
    },

    /**
     * Shorthand for creating the default M2.1 model
     */
    "minimax-m2.1"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(
        "MiniMax-M2.1",
        settings,
        modelSettings
      );
    },

    /**
     * Shorthand for creating the lightning model (faster)
     */
    "minimax-m2.1-lightning"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(
        "MiniMax-M2.1-lightning",
        settings,
        modelSettings
      );
    },
  };
}

/**
 * Default provider instance using environment variable for API key
 */
export const minimax = createMinimax();

// Export types for external use
export type { MiniMaxSettings, MiniMaxModelSettings };
