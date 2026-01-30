#!/usr/bin/env bun
import { createMinimax, getMiniMaxModel, MINIMAX_MODELS, MiniMaxAPIError } from "../lib/ai/providers/minimax";
import { streamText, generateText } from "ai";

const DIVIDER = "=".repeat(60);

async function testStreaming(apiKey: string) {
  console.log("\n" + DIVIDER);
  console.log("Test: Streaming Generation");
  console.log(DIVIDER + "\n");

  const provider = createMinimax({ apiKey });
  const model = provider["minimax-m2.1"]();

  console.log("Model:", model.modelId);
  console.log("Prompt: Hello, introduce yourself briefly.\n");
  console.log("Response:");
  console.log("-".repeat(40));

  const result = await streamText({
    model,
    prompt: "Hello, introduce yourself briefly.",
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
    fullText += chunk;
  }

  console.log("\n" + "-".repeat(40));
  console.log("\nUsage:", await result.usage);
  console.log("Finish reason:", await result.finishReason);
  console.log("\n[PASS] Streaming test completed successfully");

  return { success: true, text: fullText };
}

async function testNonStreaming(apiKey: string) {
  console.log("\n" + DIVIDER);
  console.log("Test: Non-Streaming Generation");
  console.log(DIVIDER + "\n");

  const model = getMiniMaxModel(apiKey);

  console.log("Model:", model.modelId);
  console.log("Prompt: What is 2 + 2?\n");

  const result = await generateText({
    model,
    prompt: "What is 2 + 2? Answer with just the number.",
  });

  console.log("Response:", result.text);
  console.log("Usage:", result.usage);
  console.log("Finish reason:", result.finishReason);
  console.log("\n[PASS] Non-streaming test completed successfully");

  return { success: true, text: result.text };
}

async function testConversation(apiKey: string) {
  console.log("\n" + DIVIDER);
  console.log("Test: Multi-turn Conversation");
  console.log(DIVIDER + "\n");

  const provider = createMinimax({ apiKey });
  const model = provider.chat("MiniMax-M2.1");

  const messages = [
    { role: "user" as const, content: "My name is Alice." },
    { role: "assistant" as const, content: "Hello Alice! Nice to meet you." },
    { role: "user" as const, content: "What is my name?" },
  ];

  console.log("Conversation:");
  messages.forEach((m) => console.log(`  ${m.role}: ${m.content}`));
  console.log();

  const result = await generateText({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  console.log("Response:", result.text);
  console.log("\n[PASS] Conversation test completed successfully");

  return { success: true, text: result.text };
}

async function testLightningModel(apiKey: string) {
  console.log("\n" + DIVIDER);
  console.log("Test: Lightning Model Speed");
  console.log(DIVIDER + "\n");

  const provider = createMinimax({ apiKey });
  const model = provider["minimax-m2.1-lightning"]();

  console.log("Model:", model.modelId);
  console.log("Testing response speed...\n");

  const startTime = Date.now();

  const result = await streamText({
    model,
    prompt: "Count from 1 to 10.",
  });

  let tokenCount = 0;
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
    tokenCount += chunk.length;
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n\nTime: ${elapsed}ms`);
  console.log(`Approx chars: ${tokenCount}`);
  console.log("\n[PASS] Lightning model test completed successfully");

  return { success: true, elapsed };
}

async function main() {
  const apiKey = process.env.MINIMAX_API_KEY;

  console.log(DIVIDER);
  console.log("MiniMax Provider Integration Tests");
  console.log(DIVIDER);
  console.log();
  console.log("Environment:");
  console.log("  MINIMAX_API_KEY:", apiKey ? "[SET]" : "[NOT SET]");
  console.log("  Base URL: https://api.minimax.io/v1");
  console.log();
  console.log("Available Models:");
  Object.entries(MINIMAX_MODELS).forEach(([id, meta]) => {
    console.log(`  ${id}: ${meta.description} (${meta.speed})`);
  });

  if (!apiKey) {
    console.log("\n[SKIP] No API key provided.");
    console.log("Set MINIMAX_API_KEY environment variable to run integration tests:");
    console.log("  MINIMAX_API_KEY=your-key bun run scripts/test-minimax-integration.ts");
    process.exit(0);
  }

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  try {
    await testStreaming(apiKey);
    results.push({ name: "Streaming", success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n[FAIL] Streaming test failed:", message);
    results.push({ name: "Streaming", success: false, error: message });
  }

  try {
    await testNonStreaming(apiKey);
    results.push({ name: "Non-Streaming", success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n[FAIL] Non-streaming test failed:", message);
    results.push({ name: "Non-Streaming", success: false, error: message });
  }

  try {
    await testConversation(apiKey);
    results.push({ name: "Conversation", success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n[FAIL] Conversation test failed:", message);
    results.push({ name: "Conversation", success: false, error: message });
  }

  try {
    await testLightningModel(apiKey);
    results.push({ name: "Lightning Model", success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n[FAIL] Lightning model test failed:", message);
    results.push({ name: "Lightning Model", success: false, error: message });
  }

  console.log("\n" + DIVIDER);
  console.log("Summary");
  console.log(DIVIDER);

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  results.forEach((r) => {
    const status = r.success ? "[PASS]" : "[FAIL]";
    const detail = r.error ? ` - ${r.error}` : "";
    console.log(`  ${status} ${r.name}${detail}`);
  });

  console.log();
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log(DIVIDER);

  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  if (error instanceof MiniMaxAPIError) {
    console.error("\n[ERROR] MiniMax API Error:");
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Retryable: ${error.isRetryable}`);
  } else {
    console.error("\n[ERROR] Unexpected error:", error);
  }
  process.exit(1);
});
