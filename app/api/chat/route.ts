import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { getClaudeModel } from '@/lib/ai/providers/claude';
import { getMiniMaxModel } from '@/lib/ai/providers/minimax';
import { CODE_GENERATION_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { decrypt } from '@/lib/settings/encryption';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, provider }: { messages: UIMessage[]; provider?: string } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await getSession();
    if (!session.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user settings
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.userId),
    });

    let apiKey = '';
    let selectedProvider = provider || settings?.selectedProvider || 'claude';

    if (settings) {
      try {
        if (selectedProvider === 'claude' && settings.claudeApiKey) {
          apiKey = await decrypt(settings.claudeApiKey);
        } else if (selectedProvider === 'minimax' && settings.minimaxApiKey) {
          apiKey = await decrypt(settings.minimaxApiKey);
        }
      } catch (e) {
        console.error('Failed to decrypt API key', e);
      }
    }

    // Fallback to env vars if no key in DB (for dev/default)
    if (!apiKey) {
      if (selectedProvider === 'claude') {
        apiKey = process.env.ANTHROPIC_API_KEY || '';
      } else if (selectedProvider === 'minimax') {
        apiKey = process.env.MINIMAX_API_KEY || '';
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: `No API key found for ${selectedProvider}. Please configure it in Settings.` 
        }), 
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let model;
    if (selectedProvider === 'minimax') {
      model = getMiniMaxModel(apiKey);
    } else {
      model = getClaudeModel(apiKey);
    }

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
