#!/usr/bin/env bun
import { createMinimax } from "../lib/ai/providers/minimax-prototype";
import { streamText, generateText } from "ai";

const MOCK_STREAMING_RESPONSE = [
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":"! I\'m"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" MiniMax"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" M2.1."},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" How"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" can"},"finish_reason":null}]}\n',
  'data: {"id":"mock-1","object":"chat.completion.chunk","created":1706000000,"model":"MiniMax-M2.1","choices":[{"index":0,"delta":{"content":" I help?"},"finish_reason":"stop"}],"usage":{"prompt_tokens":15,"completion_tokens":12,"total_tokens":27}}\n',
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
        content:
          "Hello! I'm MiniMax M2.1, a large language model created by MiniMax. How can I assist you today?",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 15,
    completion_tokens: 25,
    total_tokens: 40,
  },
};

function createMockFetch(stream: boolean) {
  return async (url: string | URL | Request, init?: RequestInit) => {
    console.log(`[Mock] ${init?.method ?? "GET"} ${url}`);

    if (stream) {
      const encoder = new TextEncoder();
      let index = 0;

      const readable = new ReadableStream({
        async pull(controller) {
          if (index < MOCK_STREAMING_RESPONSE.length) {
            await new Promise((r) => setTimeout(r, 100));
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
    }

    return new Response(JSON.stringify(MOCK_NON_STREAMING_RESPONSE), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

async function testStreamingWithMock() {
  console.log("\n" + "=".repeat(60));
  console.log("Testing MiniMax Streaming with MOCK responses");
  console.log("=".repeat(60) + "\n");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(true) as typeof fetch;

  try {
    const minimax = createMinimax({ apiKey: "mock-key" });
    const model = minimax.chat("MiniMax-M2.1");

    console.log("Prompt: Hi, how are you?\n");
    console.log("Streaming response:");
    console.log("-".repeat(40));

    const result = await streamText({
      model,
      prompt: "Hi, how are you?",
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
      fullText += chunk;
    }

    console.log("\n" + "-".repeat(40));
    console.log("\nFull response:", fullText);
    console.log("Usage:", await result.usage);
    console.log("Finish reason:", await result.finishReason);
    console.log("\n[MOCK TEST PASSED] Streaming chunks received correctly");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testNonStreamingWithMock() {
  console.log("\n" + "=".repeat(60));
  console.log("Testing MiniMax Non-Streaming with MOCK responses");
  console.log("=".repeat(60) + "\n");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = createMockFetch(false) as typeof fetch;

  try {
    const minimax = createMinimax({ apiKey: "mock-key" });
    const model = minimax.chat("MiniMax-M2.1");

    console.log("Prompt: Hi, how are you?\n");

    const result = await generateText({
      model,
      prompt: "Hi, how are you?",
    });

    console.log("Response:", result.text);
    console.log("Usage:", result.usage);
    console.log("Finish reason:", result.finishReason);
    console.log("\n[MOCK TEST PASSED] Non-streaming response received");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testStreamingWithRealAPI() {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey || apiKey === "test") {
    console.log("\n" + "=".repeat(60));
    console.log("SKIPPING Real API test (no valid MINIMAX_API_KEY)");
    console.log("Set MINIMAX_API_KEY environment variable to test with real API");
    console.log("=".repeat(60) + "\n");
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("Testing MiniMax Streaming with REAL API");
  console.log("=".repeat(60) + "\n");

  const minimax = createMinimax({ apiKey });
  const model = minimax.chat("MiniMax-M2.1");

  console.log("Prompt: Hi, how are you?\n");
  console.log("Streaming response:");
  console.log("-".repeat(40));

  try {
    const result = await streamText({
      model,
      prompt: "Hi, how are you?",
    });

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }

    console.log("\n" + "-".repeat(40));
    console.log("\nUsage:", await result.usage);
    console.log("Finish reason:", await result.finishReason);
    console.log("\n[REAL API TEST PASSED]");
  } catch (error) {
    console.error("\n[REAL API TEST FAILED]", error);
  }
}

async function main() {
  console.log("MiniMax Provider Test Suite");
  console.log("===========================\n");

  console.log("Provider info:");
  console.log("- Base URL: https://api.minimax.io/v1");
  console.log("- Model: MiniMax-M2.1");
  console.log("- API Key:", process.env.MINIMAX_API_KEY ? "[SET]" : "[NOT SET]");

  await testStreamingWithMock();
  await testNonStreamingWithMock();
  await testStreamingWithRealAPI();

  console.log("\n" + "=".repeat(60));
  console.log("All tests completed!");
  console.log("=".repeat(60));
}

main().catch(console.error);
