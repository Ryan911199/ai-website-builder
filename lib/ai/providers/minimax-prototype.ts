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
  LanguageModelV3FinishReason,
  LanguageModelV3Usage,
  SharedV3Warning,
} from "@ai-sdk/provider";

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
  reasoning_split?: boolean;
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

function createV3Usage(
  inputTokens: number,
  outputTokens: number
): LanguageModelV3Usage {
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

function mapFinishReason(
  reason: string | null | undefined
): LanguageModelV3FinishReason {
  const unified = (() => {
    if (reason === "stop") return "stop" as const;
    if (reason === "length") return "length" as const;
    return "other" as const;
  })();

  return { unified, raw: reason ?? undefined };
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
      max_tokens:
        options.maxOutputTokens ?? this.settings.maxTokens ?? undefined,
      stream,
      ...(this.reasoningSplit && { reasoning_split: true }),
    };
  }

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

export function createMinimax(settings: MiniMaxSettings = {}) {
  return {
    chat(modelId: string, modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(modelId, settings, modelSettings);
    },

    "minimax-m2.1"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(
        "MiniMax-M2.1",
        settings,
        modelSettings
      );
    },

    "minimax-m2.1-lightning"(modelSettings: MiniMaxModelSettings = {}) {
      return new MiniMaxChatLanguageModel(
        "MiniMax-M2.1-lightning",
        settings,
        modelSettings
      );
    },
  };
}

export const minimax = createMinimax();

export type { MiniMaxSettings, MiniMaxModelSettings };
