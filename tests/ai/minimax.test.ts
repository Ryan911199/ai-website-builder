import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMinimax,
  minimax,
  getMiniMaxModel,
  MiniMaxAPIError,
  MINIMAX_ERROR_CODES,
  DEFAULT_MINIMAX_MODEL,
  MINIMAX_MODELS,
  type MiniMaxModelId,
} from "@/lib/ai/providers/minimax";
import { streamText, generateText } from "ai";

const MOCK_STREAMING_RESPONSE = [
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" World"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13}}\n',
  "data: [DONE]\n",
];

const MOCK_NON_STREAMING_RESPONSE = {
  id: "mock-1",
  object: "chat.completion",
  created: 1706000000,
  model: "MiniMax-M2.1",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "Hello! World",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 3,
    total_tokens: 13,
  },
};

function createMockStreamingFetch() {
  return async () => {
    const encoder = new TextEncoder();
    let index = 0;

    const readable = new ReadableStream({
      async pull(controller) {
        if (index < MOCK_STREAMING_RESPONSE.length) {
          await new Promise((r) => setTimeout(r, 10));
          controller.enqueue(encoder.encode(MOCK_STREAMING_RESPONSE[index]));
          index++;
        } else {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };
}

function createMockNonStreamingFetch() {
  return async () => {
    return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function createMockErrorFetch(statusCode: number, errorCode: number, message: string) {
  return async () => {
    return new Response(
      JSON.stringify({
        error: { code: errorCode, message },
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  };
}

describe("MiniMax Provider", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("createMinimax", () => {
    it("creates a provider with default settings", () => {
      const provider = createMinimax();
      expect(provider).toBeDefined();
      expect(provider.chat).toBeInstanceOf(Function);
      expect(provider["minimax-m2.1"]).toBeInstanceOf(Function);
      expect(provider["minimax-m2.1-lightning"]).toBeInstanceOf(Function);
    });

    it("creates a provider with custom API key", () => {
      const provider = createMinimax({ apiKey: "test-key" });
      expect(provider).toBeDefined();
    });

    it("creates a provider with custom base URL", () => {
      const provider = createMinimax({ baseURL: "https://custom.api.com/v1" });
      expect(provider).toBeDefined();
    });
  });

  describe("minimax default instance", () => {
    it("is a valid provider instance", () => {
      expect(minimax).toBeDefined();
      expect(minimax.chat).toBeInstanceOf(Function);
    });
  });

  describe("getMiniMaxModel", () => {
    it("returns a model instance with default settings", () => {
      const model = getMiniMaxModel("test-key");
      expect(model).toBeDefined();
      expect(model.modelId).toBe("MiniMax-M2.1");
      expect(model.provider).toBe("minimax");
    });

    it("returns a model instance with custom model ID", () => {
      const model = getMiniMaxModel("test-key", "MiniMax-M2.1-lightning");
      expect(model.modelId).toBe("MiniMax-M2.1-lightning");
    });
  });

  describe("model properties", () => {
    it("has correct specification version", () => {
      const model = createMinimax({ apiKey: "test" }).chat("MiniMax-M2.1");
      expect(model.specificationVersion).toBe("v3");
    });

    it("has correct provider name", () => {
      const model = createMinimax({ apiKey: "test" }).chat("MiniMax-M2.1");
      expect(model.provider).toBe("minimax");
    });

    it("has correct model ID", () => {
      const model = createMinimax({ apiKey: "test" }).chat("MiniMax-M2.1");
      expect(model.modelId).toBe("MiniMax-M2.1");
    });
  });

  describe("streaming generation", () => {
    it("streams text correctly", async () => {
      globalThis.fetch = createMockStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await streamText({
        model,
        prompt: "Hello",
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      expect(fullText).toBe("Hello! World");
    });

    it("returns usage information after streaming", async () => {
      globalThis.fetch = createMockStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await streamText({
        model,
        prompt: "Hello",
      });

      for await (const _ of result.textStream) {}

      const usage = await result.usage;
      expect(usage.promptTokens).toBe(10);
      expect(usage.completionTokens).toBe(3);
    });

    it("returns finish reason after streaming", async () => {
      globalThis.fetch = createMockStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await streamText({
        model,
        prompt: "Hello",
      });

      for await (const _ of result.textStream) {}

      const finishReason = await result.finishReason;
      expect(finishReason).toBe("stop");
    });
  });

  describe("non-streaming generation", () => {
    it("generates text correctly", async () => {
      globalThis.fetch = createMockNonStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await generateText({
        model,
        prompt: "Hello",
      });

      expect(result.text).toBe("Hello! World");
    });

    it("returns usage information", async () => {
      globalThis.fetch = createMockNonStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await generateText({
        model,
        prompt: "Hello",
      });

      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(3);
    });

    it("returns finish reason", async () => {
      globalThis.fetch = createMockNonStreamingFetch() as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      const result = await generateText({
        model,
        prompt: "Hello",
      });

      expect(result.finishReason).toBe("stop");
    });
  });

  describe("error handling", () => {
    it("throws MiniMaxAPIError on API error", async () => {
      globalThis.fetch = createMockErrorFetch(401, 1004, "Not authorized") as typeof fetch;

      const provider = createMinimax({ apiKey: "invalid-key", maxRetries: 0 });
      const model = provider.chat("MiniMax-M2.1");

      await expect(
        generateText({
          model,
          prompt: "Hello",
        })
      ).rejects.toThrow(MiniMaxAPIError);
    });

    it("identifies retryable errors correctly", () => {
      expect(MiniMaxAPIError.isRetryableCode(1000)).toBe(true);
      expect(MiniMaxAPIError.isRetryableCode(1001)).toBe(true);
      expect(MiniMaxAPIError.isRetryableCode(1002)).toBe(true);
      expect(MiniMaxAPIError.isRetryableCode(1024)).toBe(true);
      expect(MiniMaxAPIError.isRetryableCode(1004)).toBe(false);
      expect(MiniMaxAPIError.isRetryableCode(2013)).toBe(false);
    });

    it("retries on rate limit error", async () => {
      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        if (callCount < 3) {
          return new Response(
            JSON.stringify({ error: { code: 1002, message: "Rate limit" } }),
            { status: 429 }
          );
        }
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({
        apiKey: "test-key",
        maxRetries: 3,
        retryDelay: 10,
      });
      const model = provider.chat("MiniMax-M2.1");

      const result = await generateText({
        model,
        prompt: "Hello",
      });

      expect(callCount).toBe(3);
      expect(result.text).toBe("Hello! World");
    });

    it("stops retrying after max attempts", async () => {
      globalThis.fetch = createMockErrorFetch(429, 1002, "Rate limit") as typeof fetch;

      const provider = createMinimax({
        apiKey: "test-key",
        maxRetries: 2,
        retryDelay: 10,
      });
      const model = provider.chat("MiniMax-M2.1");

      await expect(
        generateText({
          model,
          prompt: "Hello",
        })
      ).rejects.toThrow(MiniMaxAPIError);
    });

    it("does not retry non-retryable errors", async () => {
      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return new Response(
          JSON.stringify({ error: { code: 1004, message: "Not authorized" } }),
          { status: 401 }
        );
      }) as typeof fetch;

      const provider = createMinimax({
        apiKey: "invalid-key",
        maxRetries: 3,
        retryDelay: 10,
      });
      const model = provider.chat("MiniMax-M2.1");

      await expect(
        generateText({
          model,
          prompt: "Hello",
        })
      ).rejects.toThrow(MiniMaxAPIError);

      expect(callCount).toBe(1);
    });
  });

  describe("model shortcuts", () => {
    it("minimax-m2.1 creates correct model", () => {
      const provider = createMinimax({ apiKey: "test" });
      const model = provider["minimax-m2.1"]();
      expect(model.modelId).toBe("MiniMax-M2.1");
    });

    it("minimax-m2.1-lightning creates correct model", () => {
      const provider = createMinimax({ apiKey: "test" });
      const model = provider["minimax-m2.1-lightning"]();
      expect(model.modelId).toBe("MiniMax-M2.1-lightning");
    });
  });

  describe("model settings", () => {
    it("applies custom temperature", async () => {
      let capturedBody: string | undefined;
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1", { temperature: 0.7 });

      await generateText({ model, prompt: "Hello" });

      const body = JSON.parse(capturedBody!);
      expect(body.temperature).toBe(0.7);
    });

    it("applies custom topP", async () => {
      let capturedBody: string | undefined;
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1", { topP: 0.8 });

      await generateText({ model, prompt: "Hello" });

      const body = JSON.parse(capturedBody!);
      expect(body.top_p).toBe(0.8);
    });

    it("applies reasoning_split when enabled", async () => {
      let capturedBody: string | undefined;
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key", reasoningSplit: true });
      const model = provider.chat("MiniMax-M2.1");

      await generateText({ model, prompt: "Hello" });

      const body = JSON.parse(capturedBody!);
      expect(body.reasoning_split).toBe(true);
    });
  });

  describe("constants and metadata", () => {
    it("DEFAULT_MINIMAX_MODEL is defined", () => {
      expect(DEFAULT_MINIMAX_MODEL).toBe("MiniMax-M2.1");
    });

    it("MINIMAX_MODELS contains expected models", () => {
      expect(MINIMAX_MODELS["MiniMax-M2.1"]).toBeDefined();
      expect(MINIMAX_MODELS["MiniMax-M2.1-lightning"]).toBeDefined();
      expect(MINIMAX_MODELS["MiniMax-M2"]).toBeDefined();
    });

    it("MINIMAX_MODELS has required metadata", () => {
      const model = MINIMAX_MODELS["MiniMax-M2.1"];
      expect(model.name).toBeDefined();
      expect(model.description).toBeDefined();
      expect(model.maxTokens).toBeDefined();
      expect(model.speed).toBeDefined();
    });

    it("MINIMAX_ERROR_CODES contains expected codes", () => {
      expect(MINIMAX_ERROR_CODES[1000]).toBeDefined();
      expect(MINIMAX_ERROR_CODES[1002]).toBeDefined();
      expect(MINIMAX_ERROR_CODES[1004]).toBeDefined();
      expect(MINIMAX_ERROR_CODES[2013]).toBeDefined();
    });
  });

  describe("request format", () => {
    it("sends correct request headers", async () => {
      let capturedHeaders: Headers | undefined;
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({ apiKey: "my-secret-key" });
      const model = provider.chat("MiniMax-M2.1");

      await generateText({ model, prompt: "Hello" });

      expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
      expect(capturedHeaders?.get("Authorization")).toBe("Bearer my-secret-key");
    });

    it("sends request to correct URL", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = url.toString();
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({ apiKey: "test-key" });
      const model = provider.chat("MiniMax-M2.1");

      await generateText({ model, prompt: "Hello" });

      expect(capturedUrl).toBe("https://api.minimax.io/v1/chat/completions");
    });

    it("uses custom base URL when provided", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = url.toString();
        return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), { status: 200 });
      }) as typeof fetch;

      const provider = createMinimax({
        apiKey: "test-key",
        baseURL: "https://custom.api.com/v1",
      });
      const model = provider.chat("MiniMax-M2.1");

      await generateText({ model, prompt: "Hello" });

      expect(capturedUrl).toBe("https://custom.api.com/v1/chat/completions");
    });
  });
});
