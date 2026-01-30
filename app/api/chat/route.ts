import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { getClaudeModel } from '@/lib/ai/providers/claude';
import { CODE_GENERATION_SYSTEM_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const model = getClaudeModel();

    const result = streamText({
      model,
      system: CODE_GENERATION_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
